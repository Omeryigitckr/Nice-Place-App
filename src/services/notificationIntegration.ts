import {
  notifyPlaceApproved,
  notifyPlaceLiked,
  notifyPlaceRejected,
  notifyPlaceUpdateApproved,
  notifyPlaceUpdateRejected,
} from './notificationService';
import { devLog, devWarn } from '../utils/devLog';

export async function dispatchPlaceStatusNotification(
  placeId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  if (!placeId) {
    return;
  }

  const result =
    status === 'approved'
      ? await notifyPlaceApproved(placeId)
      : await notifyPlaceRejected(placeId);

  if (!result.success) {
    devWarn('[Nice Place Notifications] place status dispatch failed', result.error);
  }
}

export async function dispatchUpdateRequestStatusNotification(
  requestId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  if (!requestId) {
    return;
  }

  const result =
    status === 'approved'
      ? await notifyPlaceUpdateApproved(requestId)
      : await notifyPlaceUpdateRejected(requestId);

  if (!result.success) {
    devWarn('[Nice Place Notifications] update request dispatch failed', result.error);
  }
}

/**
 * Fire-and-forget like notification. Never throws — callers must not await for UI correctness.
 * Skips own-place / unlike at the call site; edge function also rejects self-likes.
 */
export async function dispatchPlaceLikedNotification(input: {
  placeId: string;
  actorName?: string;
}): Promise<void> {
  if (!input.placeId) {
    return;
  }

  try {
    if (__DEV__) {
      devLog('[likes] notification dispatch started', { placeId: input.placeId });
    }

    const result = await notifyPlaceLiked({
      placeId: input.placeId,
      actorName: input.actorName,
    });

    if (!result.success) {
      if (__DEV__) {
        console.warn('[likes] notification dispatch failed', result.error ?? 'unknown');
      }
      return;
    }

    if (__DEV__) {
      devLog('[likes] notification dispatch completed', { placeId: input.placeId });
    }
  } catch (error: unknown) {
    if (__DEV__) {
      console.warn('[likes] notification dispatch failed', error);
    }
  }
}
