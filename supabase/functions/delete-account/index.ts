import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteAccountBody {
  password?: string;
  oauthOnly?: boolean;
}

function userHasEmailPassword(user: User): boolean {
  const identities = user.identities ?? [];
  return identities.some((identity) => identity.provider === 'email');
}

async function cleanupUserData(adminClient: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, avatar_storage_path')
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
    })
    .eq('id', profileId);

  if (anonymizeProfileError) {
    return 'Could not anonymize profile.';
  }

  if (profile?.avatar_storage_path) {
    await adminClient.storage.from('avatars').remove([profile.avatar_storage_path as string]);
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
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as DeleteAccountBody;
    const password = typeof body.password === 'string' ? body.password : '';
    const oauthOnly = body.oauthOnly === true;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not verify your session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const requiresPassword = userHasEmailPassword(user);

    if (requiresPassword) {
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!user.email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not verify your account email.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password verification failed.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else if (!oauthOnly) {
      return new Response(
        JSON.stringify({ success: false, error: 'Confirmation is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cleanupError = await cleanupUserData(adminClient, user.id);
    if (cleanupError) {
      return new Response(
        JSON.stringify({ success: false, error: cleanupError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not delete account.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Unexpected server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
