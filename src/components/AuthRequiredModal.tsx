import { FeedbackModal } from './FeedbackModal';
import { useTranslation } from 'react-i18next';

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
  message,
}: AuthRequiredModalProps) {
  const { t } = useTranslation();

  return (
    <FeedbackModal
      visible={visible}
      variant="error"
      title={t('common.authRequired.title')}
      subtitle={message ?? t('common.authRequired.message')}
      primaryLabel={t('common.signIn')}
      onPrimary={onSignIn}
      secondaryLabel={t('common.cancel')}
      onSecondary={onCancel}
    />
  );
}
