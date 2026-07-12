import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountBody {
  password?: string;
  oauthOnly?: boolean;
  /** Admin-only: delete another user (moderation). */
  adminDeleteUserId?: string;
  reason?: string;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function userHasEmailPassword(user: User): boolean {
  const identities = user.identities ?? [];
  return identities.some((identity) => identity.provider === 'email');
}

async function isAdmin(adminClient: SupabaseClient, authUserId: string): Promise<boolean> {
  const { data } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

async function countAdmins(adminClient: SupabaseClient): Promise<number> {
  const { count } = await adminClient
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true);
  return count ?? 0;
}

async function cleanupUserData(adminClient: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, avatar_storage_path, is_admin')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (profileError) {
    return 'Could not load profile for cleanup.';
  }

  const profileId = profile?.id as string | undefined;
  if (!profileId) {
    return null;
  }

  const { data: ownedPlaces, error: placesError } = await adminClient
    .from('places')
    .select('id, status')
    .eq('created_by', profileId);

  if (placesError) {
    return 'Could not load user places for cleanup.';
  }

  const pendingOrRejectedIds =
    ownedPlaces
      ?.filter((place) => place.status === 'pending' || place.status === 'rejected')
      .map((place) => place.id as string) ?? [];

  if (pendingOrRejectedIds.length > 0) {
    const { error: deletePlacesError } = await adminClient
      .from('places')
      .delete()
      .in('id', pendingOrRejectedIds);

    if (deletePlacesError) {
      return 'Could not delete pending places.';
    }
  }

  const { error: anonymizePlacesError } = await adminClient
    .from('places')
    .update({ created_by: null })
    .eq('created_by', profileId)
    .eq('status', 'approved');

  if (anonymizePlacesError) {
    return 'Could not anonymize approved places.';
  }

  const { error: anonymizeHiddenError } = await adminClient
    .from('places')
    .update({ created_by: null })
    .eq('created_by', profileId)
    .eq('status', 'hidden');

  if (anonymizeHiddenError) {
    return 'Could not anonymize hidden places.';
  }

  const { error: anonymizeProfileError } = await adminClient
    .from('profiles')
    .update({
      full_name: null,
      bio: null,
      avatar_url: null,
      avatar_storage_path: null,
      username: `deleted_${userId.slice(0, 8)}`,
      is_suspended: false,
      suspended_until: null,
      suspension_reason: null,
      username_reset_required: false,
    })
    .eq('id', profileId);

  if (anonymizeProfileError) {
    return 'Could not anonymize profile.';
  }

  if (profile?.avatar_storage_path) {
    const path = profile.avatar_storage_path as string;
    await adminClient.storage.from('profile-avatars').remove([path]).catch(() => undefined);
    await adminClient.storage.from('avatars').remove([path]).catch(() => undefined);
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ success: false, error: 'Server configuration error.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ success: false, error: 'Not authenticated.' }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as DeleteAccountBody;
    const password = typeof body.password === 'string' ? body.password : '';
    const oauthOnly = body.oauthOnly === true;
    const adminDeleteUserId =
      typeof body.adminDeleteUserId === 'string' ? body.adminDeleteUserId.trim() : '';
    const moderationReason =
      typeof body.reason === 'string' ? body.reason.trim() : '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return json({ success: false, error: 'Could not verify your session.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // -------- Admin deleting another account --------
    if (adminDeleteUserId) {
      const admin = await isAdmin(adminClient, user.id);
      if (!admin) {
        return json({ success: false, error: 'Admin access required.' }, 403);
      }

      if (adminDeleteUserId === user.id) {
        return json({ success: false, error: 'You cannot delete your own account from moderation.' }, 400);
      }

      if (!moderationReason || moderationReason.length < 3) {
        return json({ success: false, error: 'A moderation reason is required.' }, 400);
      }

      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('id, is_admin')
        .eq('auth_user_id', adminDeleteUserId)
        .maybeSingle();

      if (!targetProfile) {
        return json({ success: false, error: 'User not found.' }, 404);
      }

      if (targetProfile.is_admin) {
        const adminTotal = await countAdmins(adminClient);
        if (adminTotal <= 1) {
          return json({ success: false, error: 'Cannot delete the last remaining admin.' }, 400);
        }
      }

      await adminClient.from('profile_moderation_actions').insert({
        target_user_id: adminDeleteUserId,
        admin_user_id: user.id,
        action: 'delete_account',
        reason: moderationReason,
        metadata: {},
      });

      const cleanupError = await cleanupUserData(adminClient, adminDeleteUserId);
      if (cleanupError) {
        return json({ success: false, error: cleanupError }, 500);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(adminDeleteUserId);
      if (deleteError) {
        return json({ success: false, error: 'Could not delete account.' }, 500);
      }

      return json({ success: true });
    }

    // -------- Self-delete (existing flow) --------
    const requiresPassword = userHasEmailPassword(user);

    if (requiresPassword) {
      if (!password) {
        return json({ success: false, error: 'Password is required.' }, 400);
      }

      if (!user.email) {
        return json({ success: false, error: 'Could not verify your account email.' }, 400);
      }

      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        return json({ success: false, error: 'Password verification failed.' }, 403);
      }
    } else if (!oauthOnly) {
      return json({ success: false, error: 'Confirmation is required.' }, 400);
    }

    const cleanupError = await cleanupUserData(adminClient, user.id);
    if (cleanupError) {
      return json({ success: false, error: cleanupError }, 500);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return json({ success: false, error: 'Could not delete account.' }, 500);
    }

    return json({ success: true });
  } catch (error) {
    console.error('[delete-account] unexpected error', error);
    return json({ success: false, error: 'Unexpected server error.' }, 500);
  }
});
