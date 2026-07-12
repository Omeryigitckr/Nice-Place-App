-- Security hardening for push notification tables and helpers.

REVOKE INSERT, DELETE ON public.notifications FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_type_check'
      AND conrelid = 'public.notifications'::regclass
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check
      CHECK (
        type IN (
          'PLACE_APPROVED',
          'PLACE_REJECTED',
          'PLACE_UPDATED_APPROVED',
          'PLACE_UPDATED_REJECTED',
          'PLACE_LIKED',
          'SYSTEM',
          'EVENT'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_like_dedupe_idx
  ON public.notifications (user_id, type, ((data ->> 'placeId')), ((data ->> 'actorProfileId')), created_at DESC)
  WHERE type = 'PLACE_LIKED';

CREATE OR REPLACE FUNCTION public.ensure_notification_settings(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = p_profile_id
        AND auth_user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  INSERT INTO public.user_notification_settings (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_notification_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_notification_settings(uuid) TO authenticated, service_role;
