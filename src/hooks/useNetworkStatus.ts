import { useEffect, useState } from 'react';

import {
  getNetworkStatus,
  NetworkStatus,
  subscribeNetworkStatus,
} from '../network/networkStatusStore';

export type { NetworkStatus };

/**
 * App-level connectivity status derived from request success/failure.
 * Defaults to online. Never depends on a native NetInfo module.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => getNetworkStatus());

  useEffect(() => {
    setStatus(getNetworkStatus());
    return subscribeNetworkStatus(setStatus);
  }, []);

  return status;
}
