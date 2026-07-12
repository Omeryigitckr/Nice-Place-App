import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { UsernameResetModal } from '../components/UsernameResetModal';
import { useAuth } from '../hooks/useAuth';
import { AccountSuspendedScreen } from '../screens/AccountSuspendedScreen';
import {
  getMyModerationState,
  isSuspensionActive,
} from '../services/profileModerationService';
import type { ProfileModerationState } from '../types/profileModeration';

/**
 * Gates suspended users behind a dedicated screen and prompts username reset
 * when moderation requires it. Does not sign the user out.
 */
export function ModerationGate({ children }: { children: ReactNode }) {
  const { user, profile, loading, refresh } = useAuth();
  const [moderation, setModeration] = useState<ProfileModerationState | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setModeration(null);
      setChecking(false);
      return;
    }

    let mounted = true;
    setChecking(true);

    void getMyModerationState().then((state) => {
      if (!mounted) {
        return;
      }
      setModeration(state);
      setChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [loading, user, profile?.updated_at, profile?.is_suspended, profile?.username_reset_required]);

  if (!user || loading || checking) {
    return <>{children}</>;
  }

  const suspended = isSuspensionActive({
    isSuspended: moderation?.is_suspended ?? profile?.is_suspended,
    suspendedUntil: moderation?.suspended_until ?? profile?.suspended_until,
  });

  if (suspended) {
    return (
      <AccountSuspendedScreen
        reason={moderation?.suspension_reason ?? profile?.suspension_reason}
        until={moderation?.suspended_until ?? profile?.suspended_until}
      />
    );
  }

  const needsUsernameReset =
    Boolean(moderation?.username_reset_required ?? profile?.username_reset_required);

  return (
    <>
      {children}
      <UsernameResetModal
        visible={needsUsernameReset}
        onCompleted={() => {
          void refresh();
          void getMyModerationState().then(setModeration);
        }}
      />
    </>
  );
}
