import { useEffect, useRef } from 'react';

import { runInitialPermissionSequence } from '../services/appPermissionsService';
import {
  hasInitialPermissionSequenceRun,
  setInitialPermissionSequenceRun,
} from '../utils/storage';
import { devLog } from '../utils/devLog';

/** Runs native notification + location permission dialogs once after first main-app entry. */
export function InitialPermissionsRunner() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    void (async () => {
      const alreadyRun = await hasInitialPermissionSequenceRun();
      if (alreadyRun) {
        return;
      }

      devLog('[Nice Place Permissions] running initial native permission sequence');
      await runInitialPermissionSequence();
      await setInitialPermissionSequenceRun();
    })();
  }, []);

  return null;
}
