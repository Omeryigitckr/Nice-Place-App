import { FeedbackModal } from './FeedbackModal';

interface AuthRequiredModalProps {
  visible: boolean;
  onSignIn: () => void;
  onCancel: () => void;
  message?: string;
}

export function AuthRequiredModal({
  visible,
  onSignIn,
  onCancel,
  message = 'Sign in to use this feature. You can keep browsing as a guest.',
}: AuthRequiredModalProps) {
  return (
    <FeedbackModal
      visible={visible}
      variant="error"
      title="Sign in required"
      subtitle={message}
      primaryLabel="Sign in"
      onPrimary={onSignIn}
      secondaryLabel="Cancel"
      onSecondary={onCancel}
    />
  );
}
