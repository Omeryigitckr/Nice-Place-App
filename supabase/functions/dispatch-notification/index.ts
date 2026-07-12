import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFICATION_TYPES = [
  'PLACE_APPROVED',
  'PLACE_REJECTED',
  'PLACE_UPDATED_APPROVED',
  'PLACE_UPDATED_REJECTED',
  'PLACE_LIKED',
  'SYSTEM',
  'EVENT',
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

interface DispatchBody {
  mode?: 'user' | 'broadcast';
  type: NotificationType;
  placeId?: string;
  requestId?: string;
  actorName?: string;
  customTitle?: string;
  customBody?: string;
  data?: Record<string, unknown>;
}

interface NotificationPreferences {
  push_enabled: boolean;
  place_approved: boolean;
  place_rejected: boolean;
  place_update_approved: boolean;
  place_update_rejected: boolean;
  place_liked: boolean;
  system_announcements: boolean;
  events_news: boolean;
}

interface ResolvedDispatch {
  recipientProfileId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

const PREFERENCE_BY_TYPE: Record<NotificationType, keyof NotificationPreferences> = {
  PLACE_APPROVED: 'place_approved',
  PLACE_REJECTED: 'place_rejected',
  PLACE_UPDATED_APPROVED: 'place_update_approved',
  PLACE_UPDATED_REJECTED: 'place_update_rejected',
  PLACE_LIKED: 'place_liked',
  SYSTEM: 'system_announcements',
  EVENT: 'events_news',
};

const ADMIN_TYPES = new Set<NotificationType>([
  'PLACE_APPROVED',
  'PLACE_REJECTED',
  'PLACE_UPDATED_APPROVED',
  'PLACE_UPDATED_REJECTED',
]);

const LIKE_DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const BROADCAST_BATCH_SIZE = 50;
const EXPO_PUSH_CHUNK_SIZE = 100;
const MAX_TITLE_LENGTH = 80;
const MAX_BODY_LENGTH = 240;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value as NotificationType);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function buildTemplate(
  type: NotificationType,
  input: { placeTitle?: string; actorName?: string; customTitle?: string; customBody?: string },
) {
  const place = input.placeTitle?.trim() || 'your place';
  const actor = input.actorName?.trim() || 'Someone';

  switch (type) {
    case 'PLACE_APPROVED':
      return { title: 'Place approved', body: `Your place "${place}" has been approved.` };
    case 'PLACE_REJECTED':
      return { title: 'Place not approved', body: `Your place "${place}" was not approved.` };
    case 'PLACE_UPDATED_APPROVED':
      return { title: 'Update approved', body: `Your update to "${place}" was approved.` };
    case 'PLACE_UPDATED_REJECTED':
      return { title: 'Update not approved', body: `Your update to "${place}" was not approved.` };
    case 'PLACE_LIKED':
      return { title: 'New like', body: `${actor} liked your place "${place}".` };
    case 'SYSTEM':
      return {
        title: input.customTitle?.trim() || 'Announcement',
        body: input.customBody?.trim() || 'You have a new announcement from Nice Place.',
      };
    case 'EVENT':
      return {
        title: input.customTitle?.trim() || 'Event',
        body: input.customBody?.trim() || 'Check out what is happening in Nice Place.',
      };
    default:
      return { title: 'Notification', body: 'You have a new notification.' };
  }
}

function shouldSend(preferences: NotificationPreferences, type: NotificationType): boolean {
  if (!preferences.push_enabled) {
    return false;
  }
  return Boolean(preferences[PREFERENCE_BY_TYPE[type]]);
}

async function isAdmin(
  adminClient: SupabaseClient,
  authUserId: string,
): Promise<boolean> {
  const { data } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  return data?.is_admin === true;
}

async function getCallerProfileId(
  adminClient: SupabaseClient,
  authUserId: string,
): Promise<string | null> {
  const { data, error } = await adminClient.rpc('profile_id_for_auth_user', {
    p_auth_user_id: authUserId,
  });

  if (error) {
    console.error('[dispatch-notification] profile lookup failed', error.message);
    return null;
  }

  return typeof data === 'string' ? data : null;
}

async function getPreferences(
  adminClient: SupabaseClient,
  profileId: string,
): Promise<NotificationPreferences> {
  await adminClient.rpc('ensure_notification_settings', { p_profile_id: profileId });

  const { data } = await adminClient
    .from('user_notification_settings')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  return (data as NotificationPreferences | null) ?? {
    push_enabled: true,
    place_approved: true,
    place_rejected: true,
    place_update_approved: true,
    place_update_rejected: true,
    place_liked: true,
    system_announcements: true,
    events_news: true,
  };
}

async function hasRecentDuplicate(
  adminClient: SupabaseClient,
  recipientProfileId: string,
  type: NotificationType,
  data: Record<string, unknown>,
): Promise<boolean> {
  const since = new Date(Date.now() - LIKE_DEDUPE_WINDOW_MS).toISOString();

  let query = adminClient
    .from('notifications')
    .select('id')
    .eq('user_id', recipientProfileId)
    .eq('type', type)
    .gte('created_at', since)
    .limit(1);

  if (typeof data.placeId === 'string') {
    query = query.eq('data->>placeId', data.placeId);
  }
  if (typeof data.actorProfileId === 'string') {
    query = query.eq('data->>actorProfileId', data.actorProfileId);
  }

  const { data: rows } = await query;
  return (rows?.length ?? 0) > 0;
}

async function removeInvalidTokens(adminClient: SupabaseClient, tokens: string[]): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const { error } = await adminClient.from('push_tokens').delete().in('token', tokens);
  if (error) {
    console.error('[dispatch-notification] token cleanup failed', error.message);
  }
}

async function sendExpoPush(
  adminClient: SupabaseClient,
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const invalidTokens: string[] = [];

  for (let index = 0; index < tokens.length; index += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = tokens.slice(index, index + EXPO_PUSH_CHUNK_SIZE);
    const messages = chunk.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[dispatch-notification] Expo push failed', text);
        continue;
      }

      const payload = await response.json() as {
        data?: Array<{ status?: string; message?: string; details?: { error?: string } }>;
      };

      payload.data?.forEach((ticket, ticketIndex) => {
        const token = chunk[ticketIndex];
        const errorCode = ticket.details?.error ?? ticket.message;
        if (
          ticket.status === 'error' &&
          token &&
          (errorCode === 'DeviceNotRegistered' ||
            errorCode === 'InvalidCredentials' ||
            errorCode === 'MessageTooBig')
        ) {
          invalidTokens.push(token);
        }
      });
    } catch (error) {
      console.error('[dispatch-notification] Expo push exception', error);
    }
  }

  await removeInvalidTokens(adminClient, invalidTokens);
}

async function createAndMaybePush(
  adminClient: SupabaseClient,
  resolved: ResolvedDispatch,
): Promise<'sent' | 'skipped_preference' | 'skipped_duplicate'> {
  const preferences = await getPreferences(adminClient, resolved.recipientProfileId);
  if (!shouldSend(preferences, resolved.type)) {
    return 'skipped_preference';
  }

  if (resolved.type === 'PLACE_LIKED') {
    const duplicate = await hasRecentDuplicate(
      adminClient,
      resolved.recipientProfileId,
      resolved.type,
      resolved.data,
    );
    if (duplicate) {
      return 'skipped_duplicate';
    }
  }

  const { error: insertError } = await adminClient.from('notifications').insert({
    user_id: resolved.recipientProfileId,
    type: resolved.type,
    title: resolved.title,
    body: resolved.body,
    data: resolved.data,
    is_read: false,
  });

  if (insertError) {
    console.error('[dispatch-notification] insert failed', insertError.message);
    throw new Error('Could not create notification.');
  }

  const { data: tokenRows } = await adminClient
    .from('push_tokens')
    .select('token')
    .eq('profile_id', resolved.recipientProfileId)
    .eq('is_active', true);

  const tokens = (tokenRows ?? [])
    .map((row) => row.token as string)
    .filter((token) => typeof token === 'string' && token.startsWith('ExponentPushToken'));

  await sendExpoPush(adminClient, tokens, resolved.title, resolved.body, {
    ...resolved.data,
    type: resolved.type,
  });

  return 'sent';
}

async function resolvePlaceStatusNotification(
  adminClient: SupabaseClient,
  type: 'PLACE_APPROVED' | 'PLACE_REJECTED',
  placeId: string,
): Promise<ResolvedDispatch | null> {
  const expectedStatus = type === 'PLACE_APPROVED' ? 'approved' : 'rejected';

  const { data: place, error } = await adminClient
    .from('places')
    .select('id, title, created_by, status')
    .eq('id', placeId)
    .maybeSingle();

  if (error || !place?.created_by) {
    return null;
  }

  if (place.status !== expectedStatus) {
    return null;
  }

  const template = buildTemplate(type, { placeTitle: place.title as string });
  return {
    recipientProfileId: place.created_by as string,
    type,
    title: template.title,
    body: template.body,
    data: {
      placeId,
      screen: 'place_detail',
    },
  };
}

async function resolveUpdateRequestNotification(
  adminClient: SupabaseClient,
  type: 'PLACE_UPDATED_APPROVED' | 'PLACE_UPDATED_REJECTED',
  requestId: string,
): Promise<ResolvedDispatch | null> {
  const expectedStatus = type === 'PLACE_UPDATED_APPROVED' ? 'approved' : 'rejected';

  const { data: request, error } = await adminClient
    .from('place_update_requests')
    .select('id, place_id, title, user_id, status')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !request) {
    return null;
  }

  if (request.status !== expectedStatus) {
    return null;
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id')
    .eq('auth_user_id', request.user_id as string)
    .maybeSingle();

  if (!profile?.id) {
    return null;
  }

  const template = buildTemplate(type, { placeTitle: request.title as string });
  return {
    recipientProfileId: profile.id as string,
    type,
    title: template.title,
    body: template.body,
    data: {
      placeId: request.place_id as string,
      requestId,
      screen: 'place_detail',
    },
  };
}

async function resolveLikeNotification(
  adminClient: SupabaseClient,
  callerProfileId: string,
  placeId: string,
  actorName?: string,
): Promise<ResolvedDispatch | null> {
  const { data: like, error: likeError } = await adminClient
    .from('place_likes')
    .select('id')
    .eq('place_id', placeId)
    .eq('user_id', callerProfileId)
    .maybeSingle();

  if (likeError || !like) {
    return null;
  }

  const { data: place, error: placeError } = await adminClient
    .from('places')
    .select('id, title, created_by')
    .eq('id', placeId)
    .maybeSingle();

  if (placeError || !place?.created_by) {
    return null;
  }

  const ownerProfileId = place.created_by as string;
  if (ownerProfileId === callerProfileId) {
    return null;
  }

  const template = buildTemplate('PLACE_LIKED', {
    placeTitle: place.title as string,
    actorName,
  });

  return {
    recipientProfileId: ownerProfileId,
    type: 'PLACE_LIKED',
    title: template.title,
    body: template.body,
    data: {
      placeId,
      actorProfileId: callerProfileId,
      screen: 'place_detail',
    },
  };
}

async function resolveUserDispatch(
  adminClient: SupabaseClient,
  callerProfileId: string,
  authUserId: string,
  body: DispatchBody,
): Promise<ResolvedDispatch | null> {
  if (!isNotificationType(body.type)) {
    return null;
  }

  if (ADMIN_TYPES.has(body.type)) {
    const admin = await isAdmin(adminClient, authUserId);
    if (!admin) {
      throw new Error('FORBIDDEN');
    }

    if (
      (body.type === 'PLACE_APPROVED' || body.type === 'PLACE_REJECTED') &&
      isUuid(body.placeId)
    ) {
      return resolvePlaceStatusNotification(adminClient, body.type, body.placeId);
    }

    if (
      (body.type === 'PLACE_UPDATED_APPROVED' || body.type === 'PLACE_UPDATED_REJECTED') &&
      isUuid(body.requestId)
    ) {
      return resolveUpdateRequestNotification(adminClient, body.type, body.requestId);
    }

    return null;
  }

  if (body.type === 'PLACE_LIKED') {
    if (!isUuid(body.placeId)) {
      return null;
    }

    const actorName = sanitizeText(body.actorName, 60) ?? undefined;
    return resolveLikeNotification(adminClient, callerProfileId, body.placeId, actorName);
  }

  return null;
}

async function broadcastToOptedInUsers(
  adminClient: SupabaseClient,
  type: 'SYSTEM' | 'EVENT',
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<number> {
  const preferenceColumn = PREFERENCE_BY_TYPE[type];
  let offset = 0;
  let sent = 0;

  while (true) {
    const { data: settingsRows, error } = await adminClient
      .from('user_notification_settings')
      .select('profile_id')
      .eq('push_enabled', true)
      .eq(preferenceColumn, true)
      .order('profile_id', { ascending: true })
      .range(offset, offset + BROADCAST_BATCH_SIZE - 1);

    if (error) {
      console.error('[dispatch-notification] broadcast query failed', error.message);
      break;
    }

    const recipients = (settingsRows ?? []).map((row) => row.profile_id as string);
    if (recipients.length === 0) {
      break;
    }

    for (const profileId of recipients) {
      const outcome = await createAndMaybePush(adminClient, {
        recipientProfileId: profileId,
        type,
        title,
        body,
        data,
      });
      if (outcome === 'sent') {
        sent += 1;
      }
    }

    if (recipients.length < BROADCAST_BATCH_SIZE) {
      break;
    }

    offset += BROADCAST_BATCH_SIZE;
  }

  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Not authenticated.' }, 401);
    }

    let body: DispatchBody;
    try {
      body = (await req.json()) as DispatchBody;
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON payload.' }, 400);
    }

    if (!isNotificationType(body.type)) {
      return jsonResponse({ success: false, error: 'Invalid notification type.' }, 400);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const authUser = userData.user;

    if (userError || !authUser) {
      return jsonResponse({ success: false, error: 'Could not verify session.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const callerProfileId = await getCallerProfileId(adminClient, authUser.id);
    if (!callerProfileId) {
      return jsonResponse({ success: false, error: 'Profile not found.' }, 403);
    }

    const mode = body.mode === 'broadcast' ? 'broadcast' : 'user';

    if (mode === 'broadcast') {
      const admin = await isAdmin(adminClient, authUser.id);
      if (!admin) {
        return jsonResponse({ success: false, error: 'Admin access required.' }, 403);
      }

      if (body.type !== 'SYSTEM' && body.type !== 'EVENT') {
        return jsonResponse({ success: false, error: 'Invalid broadcast type.' }, 400);
      }

      const title = sanitizeText(body.customTitle, MAX_TITLE_LENGTH);
      const message = sanitizeText(body.customBody, MAX_BODY_LENGTH);
      if (!title || !message) {
        return jsonResponse({ success: false, error: 'Invalid broadcast payload.' }, 400);
      }

      const data: Record<string, unknown> = {
        screen: 'notifications',
        ...(body.data ?? {}),
      };

      const sent = await broadcastToOptedInUsers(adminClient, body.type, title, message, data);
      return jsonResponse({ success: true, sent });
    }

    try {
      const resolved = await resolveUserDispatch(adminClient, callerProfileId, authUser.id, body);
      if (!resolved) {
        return jsonResponse({ success: false, error: 'Invalid notification payload.' }, 400);
      }

      const outcome = await createAndMaybePush(adminClient, resolved);
      return jsonResponse({
        success: true,
        skipped: outcome !== 'sent',
        reason: outcome,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return jsonResponse({ success: false, error: 'Admin access required.' }, 403);
      }
      throw error;
    }
  } catch (error) {
    console.error('[dispatch-notification] unexpected error', error);
    return jsonResponse({ success: false, error: 'Unexpected server error.' }, 500);
  }
});
