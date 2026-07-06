/**
 * Lightweight connectivity tracking without a native NetInfo module.
 * Services mark success/failure from Supabase requests; UI assumes online by default.
 */

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  /** True only after a network request fails and we fall back to cache. */
  isOffline: boolean;
}

type Listener = (status: NetworkStatus) => void;

const ONLINE_STATUS: NetworkStatus = {
  isConnected: true,
  isInternetReachable: null,
  isOffline: false,
};

const OFFLINE_STATUS: NetworkStatus = {
  isConnected: false,
  isInternetReachable: false,
  isOffline: true,
};

let currentStatus: NetworkStatus = ONLINE_STATUS;
const listeners = new Set<Listener>();

function notify(status: NetworkStatus) {
  currentStatus = status;
  listeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // Never let UI listeners crash the app.
    }
  });
}

export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

export function subscribeNetworkStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call after a successful remote request. */
export function markNetworkSuccess(): void {
  if (!currentStatus.isOffline) {
    return;
  }
  notify(ONLINE_STATUS);
}

/** Call when a remote request fails and we rely on cache / empty fallback. */
export function markNetworkFailure(): void {
  if (currentStatus.isOffline) {
    return;
  }
  notify(OFFLINE_STATUS);
}
