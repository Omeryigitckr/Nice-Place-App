import { removePlaceFromPublicCaches } from '../cache';
import { DbPlace, DbPlaceUpdateRequest, PlaceStatus } from '../types/database';
import { devLog, devWarn, devError } from '../utils/devLog';

import { assertAdminAccess } from './adminAccess';
import { normalizePlaceCategories } from '../constants/placeCategories';
import { syncPlaceCategories } from './placeCategoryService';
import {
  approvePendingPlacePhotos,
  normalizePlacePhotoUrls,
  syncPlacePhotos,
} from './placePhotoService';
import { PLACE_SELECT } from './placesService';
import { getSupabase } from './supabase';

const UPDATE_REQUEST_SELECT = `
  id,
  place_id,
  user_id,
  title,
  description,
  category,
  latitude,
  longitude,
  access_type,
  best_time,
  difficulty_level,
  crowd_level,
  is_pet_friendly,
  is_child_friendly,
  is_car_accessible,
  is_camp_allowed,
  is_picnic_suitable,
  safety_note,
  cover_photo_url,
  photo_urls,
  category_keys,
  status,
  admin_note,
  created_at,
  reviewed_at,
  reviewed_by
`;

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

const ADMIN_ACTION_ERROR = 'admin.errors.actionFailed';

function isMissingAdminListPlacesRpc(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    message.includes('admin_list_places') ||
    message.includes('could not find the function')
  );
}

function isMissingAdminUpdatePlaceStatusRpc(error: { message?: string; code?: string }): boolean {
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    message.includes('admin_update_place_status') ||
    message.includes('could not find the function')
  );
}

function mapAdminPlaceStatusError(
  error: { message?: string; code?: string } | null | undefined,
  status: PlaceStatus,
): string {
  const message = (error?.message ?? '').toLowerCase();

  if (message.includes('admin access required') || message.includes('admin access')) {
    return 'admin.errors.noAccess';
  }

  if (message.includes('place not found')) {
    return 'admin.errors.placeNotFound';
  }

  if (
    status === 'deleted' &&
    (message.includes('check constraint') ||
      message.includes('places_status_check') ||
      error?.code === '23514')
  ) {
    return 'admin.errors.removeNotEnabled';
  }

  return status === 'deleted'
    ? 'admin.errors.removeFailed'
    : ADMIN_ACTION_ERROR;
}

/** Load places for admin review — RPC first, then direct table query. */
async function loadAdminPlacesByStatus(
  status: PlaceStatus,
  orderColumn: 'created_at' | 'updated_at',
): Promise<{ places: DbPlace[]; error?: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { places: [], error: access.error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { places: [], error: 'admin.errors.notConfigured' };
  }

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_places', {
      p_status: status,
    });

    if (!rpcError && rpcData) {
      const places = (rpcData as DbPlace[]).slice().sort((a, b) => {
        const aTime = new Date(
          orderColumn === 'updated_at' ? (a.updated_at ?? a.created_at) : a.created_at,
        ).getTime();
        const bTime = new Date(
          orderColumn === 'updated_at' ? (b.updated_at ?? b.created_at) : b.created_at,
        ).getTime();
        return bTime - aTime;
      });
      devLog('[Nice Place Admin] places loaded via rpc', status, places.length);
      return { places };
    }

    if (rpcError && !isMissingAdminListPlacesRpc(rpcError)) {
      devWarn('[Nice Place Admin] admin_list_places rpc failed:', rpcError.message);
    }

    const { data, error } = await supabase
      .from('places')
      .select(PLACE_SELECT)
      .eq('status', status)
      .order(orderColumn, { ascending: false });

    if (error) {
      devError('[Nice Place Admin] places load failed:', status, error.message);
      return { places: [], error: error.message };
    }

    const places = (data ?? []) as DbPlace[];
    devLog('[Nice Place Admin] places loaded via table query', status, places.length);
    return { places };
  } catch (error: unknown) {
    devError('[Nice Place Admin] places load exception:', status, error);
    return { places: [], error: 'admin.errors.loadPlacesFailed' };
  }
}

/** Pending place submissions awaiting admin approval (places.status = 'pending'). */
export async function getPendingPlaces(): Promise<{
  places: DbPlace[];
  error?: string;
}> {
  return loadAdminPlacesByStatus('pending', 'created_at');
}

const APPROVE_PLACE_ERROR = 'admin.errors.approvePlaceFailed';
const REJECT_PLACE_ERROR = 'admin.errors.rejectPlaceFailed';

/**
 * Shared approve/reject path — mirrors working SQL Editor statements:
 *   UPDATE places SET status = '<approved|rejected>' WHERE id = '<uuid>';
 *
 * Table: public.places
 * PK filter: id
 * Payload: { status } only (updated_at comes from DB trigger)
 * No .single() — uses select() array and requires data[0].status === attempted status.
 */
async function updatePendingPlaceStatus(
  placeId: string,
  status: 'approved' | 'rejected',
): Promise<AdminActionResult> {
  const userFacingError = status === 'approved' ? APPROVE_PLACE_ERROR : REJECT_PLACE_ERROR;
  const id = typeof placeId === 'string' ? placeId.trim() : '';

  if (!id) {
    devWarn('[Nice Place Admin] updatePendingPlaceStatus missing place id', { placeId });
    return { success: false, error: userFacingError };
  }

  const access = await assertAdminAccess();
  if (!access.ok) {
    devWarn('[Nice Place Admin] updatePendingPlaceStatus denied', {
      table: 'places',
      placeId: id,
      attemptedStatus: status,
      error: access.error,
    });
    return { success: false, error: userFacingError };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: userFacingError };
  }

  try {
    // Pre-read: what the authenticated client can see before update.
    const before = await supabase
      .from('places')
      .select('id, title, status, updated_at')
      .eq('id', id)
      .maybeSingle();

    devLog('[Nice Place Admin] updatePendingPlaceStatus before', {
      table: 'places',
      authUserId: access.authUserId,
      placeId: id,
      attemptedStatus: status,
      before: before.data ?? null,
      beforeError: before.error?.message ?? null,
    });

    // Approve/reject: update by id only (never filter on status = pending).
    const { data, error } = await supabase
      .from('places')
      .update({ status })
      .eq('id', id)
      .select('id, title, status, updated_at');

    const rows = data ?? [];
    const row = rows[0];

    devLog('[Nice Place Admin] updatePendingPlaceStatus result', {
      table: 'places',
      authUserId: access.authUserId,
      placeId: id,
      attemptedStatus: status,
      payload: { status },
      where: { id },
      dataLength: rows.length,
      returned: rows,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    });

    if (error) {
      devWarn('[Nice Place Admin] updatePendingPlaceStatus failed', {
        table: 'places',
        placeId: id,
        attemptedStatus: status,
        authUserId: access.authUserId,
        dataLength: rows.length,
        returned: rows,
        error: error.message,
        code: error.code,
      });
      return { success: false, error: userFacingError };
    }

    if (!(rows.length > 0 && row?.status === status)) {
      devWarn('[Nice Place Admin] updatePendingPlaceStatus zero rows', {
        table: 'places',
        placeId: id,
        attemptedStatus: status,
        authUserId: access.authUserId,
        dataLength: rows.length,
        returned: rows,
        beforeStatus: before.data?.status ?? null,
        cause:
          'Authenticated UPDATE affected 0 rows (SQL Editor bypasses RLS). ' +
          'App uses the user JWT; policies must allow UPDATE for profiles.is_admin = true. ' +
          'Run scripts/2026_07_04_admin_panel_rls.sql',
      });
      return { success: false, error: userFacingError };
    }

    if (status === 'approved') {
      await approvePendingPlacePhotos(id);
    }

    devLog('[Nice Place Admin] place status updated', {
      placeId: id,
      title: row.title,
      status: row.status,
      updated_at: row.updated_at,
      authUserId: access.authUserId,
    });

    if (status === 'approved' || status === 'rejected') {
      const { dispatchPlaceStatusNotification } = await import('./notificationIntegration');
      void dispatchPlaceStatusNotification(id, status);
    }

    return { success: true };
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] updatePendingPlaceStatus exception:', {
      table: 'places',
      placeId: id,
      attemptedStatus: status,
      error,
    });
    return { success: false, error: userFacingError };
  }
}

export async function approvePlace(placeId: string): Promise<AdminActionResult> {
  return updatePendingPlaceStatus(placeId, 'approved');
}

/** Reject a pending place without deleting the row. */
export async function rejectPlace(placeId: string): Promise<AdminActionResult> {
  return updatePendingPlaceStatus(placeId, 'rejected');
}

export async function getPendingPlaceUpdateRequests(): Promise<{
  requests: DbPlaceUpdateRequest[];
  error?: string;
}> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { requests: [], error: access.error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { requests: [], error: 'admin.errors.notConfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('place_update_requests')
      .select(UPDATE_REQUEST_SELECT)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      devError('[Nice Place Admin] pending requests load failed:', error.message);
      return { requests: [], error: error.message };
    }

    const requests = (data ?? []) as DbPlaceUpdateRequest[];
    devLog('[Nice Place Admin] pending requests loaded', requests.length);
    return { requests };
  } catch (error: unknown) {
    devError('[Nice Place Admin] pending requests exception:', error);
    return { requests: [], error: 'admin.errors.loadUpdatesFailed' };
  }
}

export async function getPlaceUpdateRequestById(
  requestId: string,
): Promise<{ request: DbPlaceUpdateRequest | null; error?: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { request: null, error: access.error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { request: null, error: 'admin.errors.notConfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('place_update_requests')
      .select(UPDATE_REQUEST_SELECT)
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      return { request: null, error: error.message };
    }

    return { request: (data as DbPlaceUpdateRequest) ?? null };
  } catch (error: unknown) {
    devError('[Nice Place Admin] getPlaceUpdateRequestById failed:', error);
    return { request: null, error: 'admin.errors.loadUpdateFailed' };
  }
}

export async function getPlaceForAdminReview(
  placeId: string,
): Promise<{ place: DbPlace | null; error?: string }> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { place: null, error: access.error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { place: null, error: 'admin.errors.notConfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('places')
      .select(PLACE_SELECT)
      .eq('id', placeId)
      .maybeSingle();

    if (error) {
      return { place: null, error: error.message };
    }

    return { place: (data as DbPlace) ?? null };
  } catch (error: unknown) {
    devError('[Nice Place Admin] getPlaceForAdminReview failed:', error);
    return { place: null, error: 'admin.errors.loadPlaceFailed' };
  }
}

/**
 * Map place_update_requests columns → public.places columns (same names).
 * Only includes fields present on the request row (nulls are skipped).
 */
function buildPlaceUpdateFromRequest(request: DbPlaceUpdateRequest): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (request.title != null) payload.title = request.title;
  if (request.description != null) payload.description = request.description;
  if (request.category != null) payload.category = request.category;
  if (request.latitude != null) payload.latitude = request.latitude;
  if (request.longitude != null) payload.longitude = request.longitude;
  if (request.access_type != null) payload.access_type = request.access_type;
  if (request.best_time != null) payload.best_time = request.best_time;
  if (request.difficulty_level != null) payload.difficulty_level = request.difficulty_level;
  if (request.crowd_level != null) payload.crowd_level = request.crowd_level;
  if (request.is_pet_friendly != null) payload.is_pet_friendly = request.is_pet_friendly;
  if (request.is_child_friendly != null) payload.is_child_friendly = request.is_child_friendly;
  if (request.is_car_accessible != null) payload.is_car_accessible = request.is_car_accessible;
  if (request.is_camp_allowed != null) payload.is_camp_allowed = request.is_camp_allowed;
  if (request.is_picnic_suitable != null) payload.is_picnic_suitable = request.is_picnic_suitable;
  if (request.safety_note != null) payload.safety_note = request.safety_note;
  if (request.cover_photo_url != null) payload.cover_photo_url = request.cover_photo_url;

  return payload;
}

const APPROVE_UPDATE_ERROR = 'admin.errors.approveUpdateFailed';
const REJECT_UPDATE_ERROR = 'admin.errors.rejectUpdateFailed';

const UPDATE_REQUEST_RLS_HINT =
  'Authenticated UPDATE on place_update_requests affected 0 rows (SQL Editor bypasses RLS). ' +
  'App uses the user JWT; policies must allow UPDATE when profiles.is_admin = true. ' +
  'Run scripts/2026_07_04_place_update_requests_admin_rls.sql';

const PLACES_RLS_HINT =
  'Authenticated UPDATE on places affected 0 rows while applying an approved update. ' +
  'RLS must allow admin UPDATE on places (profiles.is_admin = true). ' +
  'Run scripts/2026_07_04_place_update_requests_admin_rls.sql';

/**
 * Mark a place_update_requests row approved/rejected.
 * Mirrors working pending-place flow: update by id only, verify returned status.
 * Does not modify public.places.
 */
async function markPlaceUpdateRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  adminNote?: string,
): Promise<AdminActionResult> {
  const userFacingError = status === 'approved' ? APPROVE_UPDATE_ERROR : REJECT_UPDATE_ERROR;
  const id = typeof requestId === 'string' ? requestId.trim() : '';

  if (!id) {
    devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus missing request id', { requestId });
    return { success: false, error: userFacingError };
  }

  const access = await assertAdminAccess();
  if (!access.ok) {
    devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus denied', {
      table: 'place_update_requests',
      requestId: id,
      attemptedStatus: status,
      error: access.error,
    });
    return { success: false, error: userFacingError };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: userFacingError };
  }

  try {
    const before = await supabase
      .from('place_update_requests')
      .select('id, place_id, status')
      .eq('id', id)
      .maybeSingle();

    devLog('[Nice Place Admin] markPlaceUpdateRequestStatus before', {
      table: 'place_update_requests',
      authUserId: access.authUserId,
      requestId: id,
      placeId: before.data?.place_id ?? null,
      attemptedStatus: status,
      before: before.data ?? null,
      beforeError: before.error?.message ?? null,
    });

    const note = adminNote?.trim();
    const payload: {
      status: 'approved' | 'rejected';
      reviewed_at: string;
      reviewed_by: string;
      admin_note?: string;
    } = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.authUserId,
    };
    if (note) {
      payload.admin_note = note;
    }

    // Update by id only (same pattern as places approve/reject).
    const { data, error } = await supabase
      .from('place_update_requests')
      .update(payload)
      .eq('id', id)
      .select('id, place_id, status, reviewed_at, reviewed_by, admin_note');

    const rows = data ?? [];
    const row = rows[0];

    devLog('[Nice Place Admin] markPlaceUpdateRequestStatus result', {
      table: 'place_update_requests',
      authUserId: access.authUserId,
      requestId: id,
      placeId: row?.place_id ?? before.data?.place_id ?? null,
      attemptedStatus: status,
      payload,
      where: { id },
      dataLength: rows.length,
      returned: rows,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
      errorDetails: error?.details ?? null,
      errorHint: error?.hint ?? null,
    });

    if (error) {
      // Optional review columns may be missing on older tables — retry status-only.
      const message = error.message.toLowerCase();
      const missingReviewColumn =
        message.includes('column') &&
        (message.includes('reviewed_at') ||
          message.includes('reviewed_by') ||
          message.includes('admin_note'));

      if (missingReviewColumn) {
        const statusOnly = await supabase
          .from('place_update_requests')
          .update({ status })
          .eq('id', id)
          .select('id, place_id, status');

        const statusRows = statusOnly.data ?? [];
        const statusRow = statusRows[0];

        devLog('[Nice Place Admin] markPlaceUpdateRequestStatus status-only retry', {
          requestId: id,
          placeId: statusRow?.place_id ?? null,
          attemptedStatus: status,
          payload: { status },
          dataLength: statusRows.length,
          returned: statusRows,
          error: statusOnly.error?.message ?? null,
          errorCode: statusOnly.error?.code ?? null,
        });

        if (
          !statusOnly.error &&
          statusRows.length > 0 &&
          statusRow?.status === status
        ) {
          if (status === 'approved' || status === 'rejected') {
            const { dispatchUpdateRequestStatusNotification } = await import(
              './notificationIntegration'
            );
            void dispatchUpdateRequestStatusNotification(id, status);
          }
          return { success: true };
        }

        if (!statusOnly.error && statusRows.length === 0) {
          devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus zero rows', {
            table: 'place_update_requests',
            requestId: id,
            placeId: before.data?.place_id ?? null,
            attemptedStatus: status,
            authUserId: access.authUserId,
            dataLength: 0,
            returned: [],
            beforeStatus: before.data?.status ?? null,
            cause: UPDATE_REQUEST_RLS_HINT,
          });
          return { success: false, error: userFacingError };
        }
      }

      devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus failed', {
        table: 'place_update_requests',
        requestId: id,
        placeId: before.data?.place_id ?? null,
        attemptedStatus: status,
        authUserId: access.authUserId,
        dataLength: rows.length,
        returned: rows,
        error: error.message,
        code: error.code,
      });
      return { success: false, error: userFacingError };
    }

    if (!(rows.length > 0 && row?.status === status)) {
      devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus zero rows', {
        table: 'place_update_requests',
        requestId: id,
        placeId: before.data?.place_id ?? null,
        attemptedStatus: status,
        authUserId: access.authUserId,
        dataLength: rows.length,
        returned: rows,
        beforeStatus: before.data?.status ?? null,
        cause: UPDATE_REQUEST_RLS_HINT,
      });
      return { success: false, error: userFacingError };
    }

    if (status === 'approved' || status === 'rejected') {
      const { dispatchUpdateRequestStatusNotification } = await import('./notificationIntegration');
      void dispatchUpdateRequestStatusNotification(id, status);
    }

    return { success: true };
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] markPlaceUpdateRequestStatus exception', {
      table: 'place_update_requests',
      requestId: id,
      attemptedStatus: status,
      error,
    });
    return { success: false, error: userFacingError };
  }
}

/**
 * Approve: apply request fields to public.places, then mark request approved.
 * Live place is unchanged until this succeeds on the places update.
 */
export async function approvePlaceUpdateRequest(
  requestId: string,
  adminNote?: string,
): Promise<AdminActionResult> {
  const id = typeof requestId === 'string' ? requestId.trim() : '';
  if (!id) {
    return { success: false, error: APPROVE_UPDATE_ERROR };
  }

  const access = await assertAdminAccess();
  if (!access.ok) {
    devWarn('[Nice Place Admin] approvePlaceUpdateRequest denied', {
      requestId: id,
      error: access.error,
    });
    return { success: false, error: APPROVE_UPDATE_ERROR };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: APPROVE_UPDATE_ERROR };
  }

  try {
    const { request, error: loadError } = await getPlaceUpdateRequestById(id);

    devLog('[Nice Place Admin] approvePlaceUpdateRequest loaded', {
      requestId: id,
      placeId: request?.place_id ?? null,
      status: request?.status ?? null,
      loadError: loadError ?? null,
      request,
    });

    if (loadError || !request) {
      return { success: false, error: APPROVE_UPDATE_ERROR };
    }

    if (request.status !== 'pending') {
      devWarn('[Nice Place Admin] approvePlaceUpdateRequest not pending', {
        requestId: id,
        placeId: request.place_id,
        status: request.status,
      });
      return { success: false, error: APPROVE_UPDATE_ERROR };
    }

    const placeId = request.place_id;
    const placePayload = buildPlaceUpdateFromRequest(request);

    devLog('[Nice Place Admin] approvePlaceUpdateRequest place payload', {
      requestId: id,
      placeId,
      payload: placePayload,
      payloadKeys: Object.keys(placePayload),
    });

    if (Object.keys(placePayload).length === 0) {
      devWarn('[Nice Place Admin] approvePlaceUpdateRequest empty place payload', {
        requestId: id,
        placeId,
      });
      return { success: false, error: APPROVE_UPDATE_ERROR };
    }

    const placeBefore = await supabase
      .from('places')
      .select('id, title, status')
      .eq('id', placeId)
      .maybeSingle();

    devLog('[Nice Place Admin] approvePlaceUpdateRequest place before', {
      requestId: id,
      placeId,
      before: placeBefore.data ?? null,
      beforeError: placeBefore.error?.message ?? null,
    });

    // Apply requested changes to the live place (id only).
    const { data: updatedPlaces, error: placeError } = await supabase
      .from('places')
      .update(placePayload)
      .eq('id', placeId)
      .select('id, title, status');

    const placeRows = updatedPlaces ?? [];

    devLog('[Nice Place Admin] approvePlaceUpdateRequest place update result', {
      requestId: id,
      placeId,
      payload: placePayload,
      dataLength: placeRows.length,
      returned: placeRows,
      error: placeError?.message ?? null,
      errorCode: placeError?.code ?? null,
      errorDetails: placeError?.details ?? null,
      errorHint: placeError?.hint ?? null,
    });

    if (placeError) {
      devWarn('[Nice Place Admin] approvePlaceUpdateRequest place update failed', {
        requestId: id,
        placeId,
        error: placeError.message,
        code: placeError.code,
      });
      return { success: false, error: APPROVE_UPDATE_ERROR };
    }

    if (placeRows.length === 0) {
      devWarn('[Nice Place Admin] approvePlaceUpdateRequest place zero rows', {
        requestId: id,
        placeId,
        authUserId: access.authUserId,
        dataLength: 0,
        returned: [],
        cause: PLACES_RLS_HINT,
      });
      return { success: false, error: APPROVE_UPDATE_ERROR };
    }

    const requestedPhotoUrls = normalizePlacePhotoUrls(
      Array.isArray(request.photo_urls)
        ? request.photo_urls
        : request.cover_photo_url
          ? [request.cover_photo_url]
          : [],
    );

    if (requestedPhotoUrls.length > 0) {
      const photoSync = await syncPlacePhotos({
        placeId,
        imageUrls: requestedPhotoUrls,
        status: 'approved',
        replaceExisting: true,
      });

      if (!photoSync.success) {
        devWarn('[Nice Place Admin] approvePlaceUpdateRequest photo sync failed', {
          requestId: id,
          placeId,
          error: photoSync.error,
        });
        return { success: false, error: APPROVE_UPDATE_ERROR };
      }
    }

    const requestedCategoryKeys = normalizePlaceCategories(
      Array.isArray(request.category_keys)
        ? request.category_keys
        : request.category
          ? [request.category]
          : [],
    );

    if (requestedCategoryKeys.length > 0) {
      const categorySync = await syncPlaceCategories({
        placeId,
        categoryKeys: requestedCategoryKeys,
      });

      if (!categorySync.success) {
        devWarn('[Nice Place Admin] approvePlaceUpdateRequest category sync failed', {
          requestId: id,
          placeId,
          error: categorySync.error,
        });
        return { success: false, error: APPROVE_UPDATE_ERROR };
      }
    }

    // Mark request approved — does not touch places again.
    return markPlaceUpdateRequestStatus(id, 'approved', adminNote);
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] approvePlaceUpdateRequest exception', {
      requestId: id,
      error,
    });
    return { success: false, error: APPROVE_UPDATE_ERROR };
  }
}

/**
 * Reject: mark request rejected only. Does not modify public.places.
 */
export async function rejectPlaceUpdateRequest(
  requestId: string,
  adminNote?: string,
): Promise<AdminActionResult> {
  return markPlaceUpdateRequestStatus(requestId, 'rejected', adminNote);
}

const PLACES_STATUS_RLS_HINT =
  'Authenticated UPDATE on places affected 0 rows (SQL Editor bypasses RLS). ' +
  'App uses the user JWT; policies must allow UPDATE when profiles.is_admin = true. ' +
  'Run scripts/2026_07_04_place_update_requests_admin_rls.sql ' +
  'and scripts/2026_07_10_admin_soft_delete_place.sql if status=deleted is rejected.';

/** RPC first, then direct table UPDATE — mirrors admin_list_places pattern. */
async function updatePlaceStatusByAdminViaRpc(
  placeId: string,
  status: Extract<PlaceStatus, 'pending' | 'approved' | 'rejected' | 'deleted'>,
): Promise<{ row: DbPlace | null; error?: string; rpcMissing?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { row: null, error: ADMIN_ACTION_ERROR };
  }

  const { data, error } = await supabase.rpc('admin_update_place_status', {
    p_place_id: placeId,
    p_status: status,
  });

  if (error) {
    if (isMissingAdminUpdatePlaceStatusRpc(error)) {
      return { row: null, rpcMissing: true };
    }

    devWarn('[Nice Place Admin] admin_update_place_status rpc failed', {
      placeId,
      status,
      error: error.message,
      code: error.code,
    });
    return { row: null, error: mapAdminPlaceStatusError(error, status) };
  }

  const row = (Array.isArray(data) ? data[0] : data) as DbPlace | null | undefined;
  if (!row || row.status !== status) {
    return {
      row: null,
      error: mapAdminPlaceStatusError(null, status),
    };
  }

  return { row };
}

async function updatePlaceStatusByAdmin(
  placeId: string,
  status: Extract<PlaceStatus, 'pending' | 'approved' | 'rejected' | 'deleted'>,
): Promise<AdminActionResult> {
  const id = typeof placeId === 'string' ? placeId.trim() : '';
  if (!id) {
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  const access = await assertAdminAccess();
  if (!access.ok) {
    devWarn('[Nice Place Admin] updatePlaceStatusByAdmin denied', {
      placeId: id,
      status,
      error: access.error,
    });
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  try {
    const rpcAttempt = await updatePlaceStatusByAdminViaRpc(id, status);
    if (rpcAttempt.row) {
      devLog('[Nice Place Admin] updatePlaceStatusByAdmin via rpc', {
        placeId: id,
        status: rpcAttempt.row.status,
        title: rpcAttempt.row.title,
      });
      return { success: true };
    }

    if (rpcAttempt.error && !rpcAttempt.rpcMissing) {
      return { success: false, error: rpcAttempt.error };
    }

    const before = await supabase
      .from('places')
      .select('id, title, status')
      .eq('id', id)
      .maybeSingle();

    devLog('[Nice Place Admin] updatePlaceStatusByAdmin before', {
      placeId: id,
      attemptedStatus: status,
      before: before.data ?? null,
      beforeError: before.error?.message ?? null,
    });

    const { data, error } = await supabase
      .from('places')
      .update({ status })
      .eq('id', id)
      .select('id, title, status');

    const rows = data ?? [];
    const row = rows[0];

    devLog('[Nice Place Admin] updatePlaceStatusByAdmin result', {
      placeId: id,
      attemptedStatus: status,
      payload: { status },
      dataLength: rows.length,
      returned: rows,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    });

    if (error) {
      devWarn('[Nice Place Admin] updatePlaceStatusByAdmin failed', {
        placeId: id,
        attemptedStatus: status,
        error: error.message,
        code: error.code,
        hint:
          status === 'deleted'
            ? 'Run scripts/2026_07_10_admin_soft_delete_place.sql'
            : PLACES_STATUS_RLS_HINT,
      });
      return { success: false, error: mapAdminPlaceStatusError(error, status) };
    }

    if (!(rows.length > 0 && row?.status === status)) {
      devWarn('[Nice Place Admin] updatePlaceStatusByAdmin zero rows', {
        placeId: id,
        attemptedStatus: status,
        authUserId: access.authUserId,
        beforeStatus: before.data?.status ?? null,
        cause: PLACES_STATUS_RLS_HINT,
      });
      return { success: false, error: mapAdminPlaceStatusError(null, status) };
    }

    return { success: true };
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] updatePlaceStatusByAdmin exception', {
      placeId: id,
      status,
      error,
    });
    return { success: false, error: ADMIN_ACTION_ERROR };
  }
}

export async function getRejectedPlaces(): Promise<{
  places: DbPlace[];
  error?: string;
}> {
  return loadAdminPlacesByStatus('rejected', 'updated_at');
}

export async function getRejectedPlaceUpdateRequests(): Promise<{
  requests: DbPlaceUpdateRequest[];
  error?: string;
}> {
  const access = await assertAdminAccess();
  if (!access.ok) {
    return { requests: [], error: access.error };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { requests: [], error: 'admin.errors.notConfigured' };
  }

  try {
    const { data, error } = await supabase
      .from('place_update_requests')
      .select(UPDATE_REQUEST_SELECT)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) {
      devError('[Nice Place Admin] rejected requests load failed:', error.message);
      return { requests: [], error: error.message };
    }

    const requests = (data ?? []) as DbPlaceUpdateRequest[];
    devLog('[Nice Place Admin] rejected requests loaded', requests.length);
    return { requests };
  } catch (error: unknown) {
    devError('[Nice Place Admin] rejected requests exception:', error);
    return { requests: [], error: 'admin.errors.loadRejectedUpdatesFailed' };
  }
}

/** Move a rejected place back to pending review. */
export async function restoreRejectedPlace(placeId: string): Promise<AdminActionResult> {
  return updatePlaceStatusByAdmin(placeId, 'pending');
}

/**
 * Soft-delete an approved place from public view.
 * Uses status = 'deleted' (no hard delete).
 */
export async function softDeletePlace(placeId: string): Promise<AdminActionResult> {
  const result = await updatePlaceStatusByAdmin(placeId, 'deleted');
  if (result.success) {
    await removePlaceFromPublicCaches(placeId.trim());
  }
  return result;
}

/** Move a rejected update request back to pending review. */
export async function restoreRejectedPlaceUpdateRequest(
  requestId: string,
): Promise<AdminActionResult> {
  const id = typeof requestId === 'string' ? requestId.trim() : '';
  if (!id) {
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  const access = await assertAdminAccess();
  if (!access.ok) {
    devWarn('[Nice Place Admin] restoreRejectedPlaceUpdateRequest denied', {
      requestId: id,
      error: access.error,
    });
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: ADMIN_ACTION_ERROR };
  }

  try {
    const before = await supabase
      .from('place_update_requests')
      .select('id, place_id, status')
      .eq('id', id)
      .maybeSingle();

    devLog('[Nice Place Admin] restoreRejectedPlaceUpdateRequest before', {
      requestId: id,
      placeId: before.data?.place_id ?? null,
      before: before.data ?? null,
      beforeError: before.error?.message ?? null,
    });

    const payload = {
      status: 'pending' as const,
      reviewed_at: null,
      reviewed_by: null,
      admin_note: null,
    };

    const { data, error } = await supabase
      .from('place_update_requests')
      .update(payload)
      .eq('id', id)
      .select('id, place_id, status, reviewed_at, reviewed_by, admin_note');

    const rows = data ?? [];
    const row = rows[0];

    devLog('[Nice Place Admin] restoreRejectedPlaceUpdateRequest result', {
      requestId: id,
      placeId: row?.place_id ?? before.data?.place_id ?? null,
      payload,
      dataLength: rows.length,
      returned: rows,
      error: error?.message ?? null,
      errorCode: error?.code ?? null,
    });

    if (error) {
      // Older schemas may lack review columns — status-only restore still works for the queue.
      const message = error.message.toLowerCase();
      const missingReviewColumn =
        message.includes('column') &&
        (message.includes('reviewed_at') ||
          message.includes('reviewed_by') ||
          message.includes('admin_note'));

      if (missingReviewColumn) {
        const statusOnly = await supabase
          .from('place_update_requests')
          .update({ status: 'pending' })
          .eq('id', id)
          .select('id, place_id, status');

        const statusRows = statusOnly.data ?? [];
        const statusRow = statusRows[0];

        if (
          !statusOnly.error &&
          statusRows.length > 0 &&
          statusRow?.status === 'pending'
        ) {
          return { success: true };
        }
      }

      devWarn('[Nice Place Admin] restoreRejectedPlaceUpdateRequest failed', {
        requestId: id,
        error: error.message,
        code: error.code,
      });
      return { success: false, error: ADMIN_ACTION_ERROR };
    }

    if (!(rows.length > 0 && row?.status === 'pending')) {
      devWarn('[Nice Place Admin] restoreRejectedPlaceUpdateRequest zero rows', {
        requestId: id,
        placeId: before.data?.place_id ?? null,
        authUserId: access.authUserId,
        beforeStatus: before.data?.status ?? null,
        cause: UPDATE_REQUEST_RLS_HINT,
      });
      return { success: false, error: ADMIN_ACTION_ERROR };
    }

    return { success: true };
  } catch (error: unknown) {
    devWarn('[Nice Place Admin] restoreRejectedPlaceUpdateRequest exception', {
      requestId: id,
      error,
    });
    return { success: false, error: ADMIN_ACTION_ERROR };
  }
}
