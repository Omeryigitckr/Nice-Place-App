import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLACE_PHOTOS_BUCKET = 'place-photos';
const RETENTION_DAYS = 30;
const BATCH_SIZE = 25;

interface CleanupBody {
  source?: string;
  batchSize?: number;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (!bearer) {
    return false;
  }

  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const cronSecret = Deno.env.get('CLEANUP_CRON_SECRET') ?? '';

  return (
    (serviceRole.length > 0 && bearer === serviceRole) ||
    (cronSecret.length > 0 && bearer === cronSecret)
  );
}

/** Extract storage object path from a public Storage URL when possible. */
function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const marker = `/object/public/${PLACE_PHOTOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0] ?? '');
  return path.length > 0 ? path : null;
}

async function purgePlacePhotos(
  admin: SupabaseClient,
  placeId: string,
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  const paths = new Set<string>();

  const { data: photos, error: photosError } = await admin
    .from('place_photos')
    .select('id, storage_path, image_url')
    .eq('place_id', placeId);

  if (photosError) {
    errors.push(`place_photos select failed for ${placeId}: ${photosError.message}`);
    return { deleted: 0, errors };
  }

  for (const photo of photos ?? []) {
    const storagePath =
      (typeof photo.storage_path === 'string' && photo.storage_path.trim()) ||
      pathFromPublicUrl(photo.image_url as string | null);
    if (storagePath) {
      paths.add(storagePath);
    }
  }

  const { data: placeRow } = await admin
    .from('places')
    .select('cover_photo_url')
    .eq('id', placeId)
    .maybeSingle();

  const coverPath = pathFromPublicUrl(placeRow?.cover_photo_url as string | null | undefined);
  if (coverPath) {
    paths.add(coverPath);
  }

  const pathList = Array.from(paths);
  let deleted = 0;

  if (pathList.length > 0) {
    // Storage remove is idempotent for missing objects; log and continue on failure.
    const { error: removeError } = await admin.storage.from(PLACE_PHOTOS_BUCKET).remove(pathList);
    if (removeError) {
      errors.push(`storage remove failed for ${placeId}: ${removeError.message}`);
    } else {
      deleted = pathList.length;
    }
  }

  // Clear DB references even if some storage objects were already gone.
  const { error: photosUpdateError } = await admin
    .from('place_photos')
    .update({ storage_path: null })
    .eq('place_id', placeId);

  if (photosUpdateError) {
    errors.push(`place_photos update failed for ${placeId}: ${photosUpdateError.message}`);
  }

  const { error: placeUpdateError } = await admin
    .from('places')
    .update({
      cover_photo_url: null,
      rejected_photos_purged_at: new Date().toISOString(),
    })
    .eq('id', placeId)
    .eq('status', 'rejected');

  if (placeUpdateError) {
    errors.push(`places purge stamp failed for ${placeId}: ${placeUpdateError.message}`);
  }

  return { deleted, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  if (!isAuthorized(req)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRole) {
    return json({ success: false, error: 'Missing Supabase env' }, 500);
  }

  let body: CleanupBody = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as CleanupBody;
    } catch {
      body = {};
    }
  }

  const batchSize =
    typeof body.batchSize === 'number' && body.batchSize > 0 && body.batchSize <= 100
      ? Math.floor(body.batchSize)
      : BATCH_SIZE;

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Strict filters: rejected only, past retention, not already purged.
  const { data: places, error: listError } = await admin
    .from('places')
    .select('id, rejected_at, status')
    .eq('status', 'rejected')
    .is('rejected_photos_purged_at', null)
    .lt('rejected_at', cutoff)
    .order('rejected_at', { ascending: true })
    .limit(batchSize);

  if (listError) {
    console.error('[cleanup-rejected-place-photos] list failed', listError.message);
    return json({ success: false, error: listError.message }, 500);
  }

  const candidates = places ?? [];
  let placesProcessed = 0;
  let filesDeleted = 0;
  const failures: string[] = [];

  for (const place of candidates) {
    // Re-check status immediately before mutating (defense in depth).
    const { data: fresh, error: freshError } = await admin
      .from('places')
      .select('id, status, rejected_at, rejected_photos_purged_at')
      .eq('id', place.id)
      .maybeSingle();

    if (freshError || !fresh) {
      failures.push(`re-read failed for ${place.id}: ${freshError?.message ?? 'missing'}`);
      continue;
    }

    if (
      fresh.status !== 'rejected' ||
      fresh.rejected_photos_purged_at != null ||
      !fresh.rejected_at ||
      fresh.rejected_at >= cutoff
    ) {
      continue;
    }

    const result = await purgePlacePhotos(admin, place.id as string);
    placesProcessed += 1;
    filesDeleted += result.deleted;
    failures.push(...result.errors);
  }

  console.log('[cleanup-rejected-place-photos]', {
    source: body.source ?? req.method,
    cutoff,
    candidates: candidates.length,
    placesProcessed,
    filesDeleted,
    failureCount: failures.length,
  });

  return json({
    success: true,
    retentionDays: RETENTION_DAYS,
    cutoff,
    candidates: candidates.length,
    placesProcessed,
    filesDeleted,
    failures,
  });
});
