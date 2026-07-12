-- Nice Place — profile reporting & moderation
-- Run once in Supabase SQL Editor (also mirrored under supabase/migrations/).
-- Idempotent where reasonably possible. Does not destroy existing profile data.

-- ---------------------------------------------------------------------------
-- Profile moderation columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moderation_strikes integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_reset_required boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- profile_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_reports_reason_check CHECK (
    reason IN (
      'inappropriate_photo',
      'inappropriate_username',
      'impersonation',
      'spam',
      'harassment_or_hate',
      'other'
    )
  ),
  CONSTRAINT profile_reports_status_check CHECK (
    status IN (
      'open',
      'resolved_no_action',
      'resolved_action_taken',
      'dismissed_abuse'
    )
  ),
  CONSTRAINT profile_reports_no_self_check CHECK (reporter_user_id <> reported_user_id),
  CONSTRAINT profile_reports_details_length_check CHECK (
    details IS NULL OR char_length(details) <= 300
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_reports_open_unique_idx
  ON public.profile_reports (reporter_user_id, reported_user_id, reason)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS profile_reports_reported_user_id_idx
  ON public.profile_reports (reported_user_id);

CREATE INDEX IF NOT EXISTS profile_reports_reporter_user_id_idx
  ON public.profile_reports (reporter_user_id);

CREATE INDEX IF NOT EXISTS profile_reports_status_idx
  ON public.profile_reports (status);

CREATE INDEX IF NOT EXISTS profile_reports_created_at_idx
  ON public.profile_reports (created_at DESC);

CREATE INDEX IF NOT EXISTS profile_reports_open_reported_idx
  ON public.profile_reports (reported_user_id, created_at DESC)
  WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.set_profile_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_reports_updated_at ON public.profile_reports;
CREATE TRIGGER profile_reports_updated_at
  BEFORE UPDATE ON public.profile_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_reports_updated_at();

ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_reports_insert_own ON public.profile_reports;
CREATE POLICY profile_reports_insert_own
  ON public.profile_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_user_id = auth.uid()
    AND reporter_user_id <> reported_user_id
  );

DROP POLICY IF EXISTS profile_reports_select_own ON public.profile_reports;
CREATE POLICY profile_reports_select_own
  ON public.profile_reports
  FOR SELECT
  TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS profile_reports_admin_select ON public.profile_reports;
CREATE POLICY profile_reports_admin_select
  ON public.profile_reports
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS profile_reports_admin_update ON public.profile_reports;
CREATE POLICY profile_reports_admin_update
  ON public.profile_reports
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ---------------------------------------------------------------------------
-- profile_moderation_actions (append-only for admins)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_moderation_actions_action_check CHECK (
    action IN (
      'mark_ok',
      'remove_profile_photo',
      'reset_username',
      'suspend_24h',
      'suspend_7d',
      'suspend_30d',
      'suspend_indefinite',
      'unsuspend',
      'delete_account',
      'dismiss_report_abuse'
    )
  )
);

CREATE INDEX IF NOT EXISTS profile_moderation_actions_target_idx
  ON public.profile_moderation_actions (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_moderation_actions_admin_idx
  ON public.profile_moderation_actions (admin_user_id, created_at DESC);

ALTER TABLE public.profile_moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_moderation_actions_admin_select ON public.profile_moderation_actions;
CREATE POLICY profile_moderation_actions_admin_select
  ON public.profile_moderation_actions
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS profile_moderation_actions_admin_insert ON public.profile_moderation_actions;
CREATE POLICY profile_moderation_actions_admin_insert
  ON public.profile_moderation_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_current_user_admin()
    AND admin_user_id = auth.uid()
  );

-- No update/delete policies for normal clients (append-only).

-- ---------------------------------------------------------------------------
-- Allow moderation notification types
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'PLACE_APPROVED',
    'PLACE_REJECTED',
    'PLACE_UPDATED_APPROVED',
    'PLACE_UPDATED_REJECTED',
    'PLACE_LIKED',
    'SYSTEM',
    'EVENT',
    'PROFILE_PHOTO_REMOVED',
    'PROFILE_USERNAME_RESET',
    'PROFILE_SUSPENDED',
    'PROFILE_UNSUSPENDED'
  ));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_profile_currently_suspended(p_profile public.profiles)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN NOT COALESCE(p_profile.is_suspended, false) THEN false
    WHEN p_profile.suspended_until IS NULL THEN true
    WHEN p_profile.suspended_until > now() THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.clear_expired_profile_suspension(p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_suspended = false,
    suspended_until = NULL,
    suspension_reason = NULL,
    updated_at = now()
  WHERE auth_user_id = p_auth_user_id
    AND is_suspended = true
    AND suspended_until IS NOT NULL
    AND suspended_until <= now();
END;
$$;

REVOKE ALL ON FUNCTION public.clear_expired_profile_suspension(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clear_expired_profile_suspension(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.insert_moderation_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data, is_read)
  VALUES (p_user_id, p_type, p_title, p_body, COALESCE(p_data, '{}'::jsonb), false);
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- notifications table may not exist in older envs
  WHEN OTHERS THEN
    RAISE WARNING 'insert_moderation_notification failed: %', SQLERRM;
END;
$$;

-- ---------------------------------------------------------------------------
-- report_profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.report_profile(
  p_reported_user_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter uuid := auth.uid();
  v_details text;
  v_reporter_profile public.profiles;
  v_target_exists boolean;
  v_open_count integer;
  v_day_count integer;
  v_row public.profile_reports;
BEGIN
  IF v_reporter IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated', 'message', 'Sign in to report a profile.');
  END IF;

  IF p_reported_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_target', 'message', 'Profile not found.');
  END IF;

  IF v_reporter = p_reported_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_report', 'message', 'You cannot report your own profile.');
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN (
    'inappropriate_photo',
    'inappropriate_username',
    'impersonation',
    'spam',
    'harassment_or_hate',
    'other'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reason', 'message', 'Please choose a valid report reason.');
  END IF;

  v_details := NULLIF(btrim(COALESCE(p_details, '')), '');
  IF v_details IS NOT NULL AND char_length(v_details) > 300 THEN
    RETURN jsonb_build_object('success', false, 'error', 'details_too_long', 'message', 'Details must be 300 characters or fewer.');
  END IF;

  PERFORM public.clear_expired_profile_suspension(v_reporter);

  SELECT * INTO v_reporter_profile
  FROM public.profiles
  WHERE auth_user_id = v_reporter
  LIMIT 1;

  IF v_reporter_profile.id IS NOT NULL AND public.is_profile_currently_suspended(v_reporter_profile) THEN
    RETURN jsonb_build_object('success', false, 'error', 'suspended', 'message', 'Suspended accounts cannot submit reports.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_user_id = p_reported_user_id
  ) INTO v_target_exists;

  IF NOT v_target_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_target', 'message', 'Profile not found.');
  END IF;

  SELECT count(*) INTO v_open_count
  FROM public.profile_reports
  WHERE reporter_user_id = v_reporter
    AND reported_user_id = p_reported_user_id
    AND reason = p_reason
    AND status = 'open';

  IF v_open_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_report', 'message', 'You already reported this profile for this reason.');
  END IF;

  SELECT count(*) INTO v_day_count
  FROM public.profile_reports
  WHERE reporter_user_id = v_reporter
    AND created_at > now() - interval '24 hours';

  IF v_day_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_limit', 'message', 'You can submit up to 10 profile reports per day.');
  END IF;

  INSERT INTO public.profile_reports (
    reporter_user_id,
    reported_user_id,
    reason,
    details,
    status
  )
  VALUES (
    v_reporter,
    p_reported_user_id,
    p_reason,
    v_details,
    'open'
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'report_id', v_row.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_profile(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.report_profile(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_reported_profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_reported_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      p.auth_user_id AS reported_user_id,
      p.id AS profile_id,
      p.username,
      p.avatar_url,
      p.created_at AS account_created_at,
      COALESCE(p.moderation_strikes, 0) AS moderation_strikes,
      COALESCE(p.is_suspended, false) AS is_suspended,
      p.suspended_until,
      p.suspension_reason,
      COALESCE(p.username_reset_required, false) AS username_reset_required,
      count(*) FILTER (WHERE r.status = 'open')::int AS open_report_count,
      count(*)::int AS total_report_count,
      max(r.created_at) AS last_report_at,
      (
        SELECT COALESCE(jsonb_object_agg(x.reason, x.cnt), '{}'::jsonb)
        FROM (
          SELECT rr.reason, count(*)::int AS cnt
          FROM public.profile_reports rr
          WHERE rr.reported_user_id = p.auth_user_id
            AND rr.status = 'open'
          GROUP BY rr.reason
        ) x
      ) AS open_reason_counts
    FROM public.profile_reports r
    JOIN public.profiles p ON p.auth_user_id = r.reported_user_id
    GROUP BY p.id
    HAVING count(*) FILTER (WHERE r.status = 'open') > 0
    ORDER BY
      count(*) FILTER (WHERE r.status = 'open') DESC,
      max(r.created_at) DESC
  ) t;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_reported_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_reported_profiles() TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_reported_profile_detail
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_reported_profile_detail(p_reported_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_reports jsonb;
  v_actions jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'admin access required';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE auth_user_id = p_reported_user_id
  LIMIT 1;

  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_reports
  FROM public.profile_reports r
  WHERE r.reported_user_id = p_reported_user_id;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO v_actions
  FROM public.profile_moderation_actions a
  WHERE a.target_user_id = p_reported_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'profile', jsonb_build_object(
      'id', v_profile.id,
      'auth_user_id', v_profile.auth_user_id,
      'username', v_profile.username,
      'avatar_url', v_profile.avatar_url,
      'avatar_storage_path', v_profile.avatar_storage_path,
      'created_at', v_profile.created_at,
      'is_admin', v_profile.is_admin,
      'is_suspended', COALESCE(v_profile.is_suspended, false),
      'suspended_until', v_profile.suspended_until,
      'suspension_reason', v_profile.suspension_reason,
      'moderation_strikes', COALESCE(v_profile.moderation_strikes, 0),
      'username_reset_required', COALESCE(v_profile.username_reset_required, false)
    ),
    'open_report_count', (
      SELECT count(*)::int FROM public.profile_reports
      WHERE reported_user_id = p_reported_user_id AND status = 'open'
    ),
    'total_report_count', (
      SELECT count(*)::int FROM public.profile_reports
      WHERE reported_user_id = p_reported_user_id
    ),
    'reports', v_reports,
    'actions', v_actions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_reported_profile_detail(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_reported_profile_detail(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- admin_moderate_profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_moderate_profile(
  p_target_user_id uuid,
  p_action text,
  p_reason text,
  p_admin_note text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_profile public.profiles;
  v_admin_profile public.profiles;
  v_reason text;
  v_note text;
  v_new_username text;
  v_suffix text;
  v_until timestamptz;
  v_notify_title text;
  v_notify_body text;
  v_notify_type text := 'SYSTEM';
  v_storage_path text;
  v_admin_count integer;
BEGIN
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'message', 'Admin access required.');
  END IF;

  IF p_action IS NULL OR p_action NOT IN (
    'mark_ok',
    'remove_profile_photo',
    'reset_username',
    'suspend_24h',
    'suspend_7d',
    'suspend_30d',
    'suspend_indefinite',
    'unsuspend',
    'dismiss_report_abuse'
  ) THEN
    -- delete_account is handled by Edge Function, not this RPC
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action');
  END IF;

  v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reason', 'message', 'A moderation reason is required.');
  END IF;

  v_note := NULLIF(btrim(COALESCE(p_admin_note, '')), '');

  SELECT * INTO v_profile FROM public.profiles WHERE auth_user_id = p_target_user_id LIMIT 1;
  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF p_target_user_id = v_admin AND p_action LIKE 'suspend%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_action', 'message', 'You cannot suspend your own account here.');
  END IF;

  IF p_action = 'mark_ok' THEN
    UPDATE public.profile_reports
    SET
      status = 'resolved_no_action',
      reviewed_by = v_admin,
      reviewed_at = now(),
      admin_note = COALESCE(v_note, admin_note),
      updated_at = now()
    WHERE reported_user_id = p_target_user_id
      AND status = 'open';

  ELSIF p_action = 'dismiss_report_abuse' THEN
    UPDATE public.profile_reports
    SET
      status = 'dismissed_abuse',
      reviewed_by = v_admin,
      reviewed_at = now(),
      admin_note = COALESCE(v_note, admin_note),
      updated_at = now()
    WHERE reported_user_id = p_target_user_id
      AND status = 'open';

  ELSIF p_action = 'remove_profile_photo' THEN
    v_storage_path := v_profile.avatar_storage_path;
    UPDATE public.profiles
    SET
      avatar_url = NULL,
      avatar_storage_path = NULL,
      moderation_strikes = COALESCE(moderation_strikes, 0) + 1,
      updated_at = now()
    WHERE id = v_profile.id;

    UPDATE public.profile_reports
    SET
      status = 'resolved_action_taken',
      reviewed_by = v_admin,
      reviewed_at = now(),
      admin_note = COALESCE(v_note, admin_note),
      updated_at = now()
    WHERE reported_user_id = p_target_user_id
      AND status = 'open';

    v_notify_title := 'Profile photo removed';
    v_notify_body := 'Your profile photo was removed because it violated the community guidelines.';
    v_notify_type := 'PROFILE_PHOTO_REMOVED';

  ELSIF p_action = 'reset_username' THEN
    LOOP
      v_suffix := lpad((floor(random() * 10000))::int::text, 4, '0');
      v_new_username := 'niceplace_user_' || v_suffix;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE lower(username) = v_new_username
      );
    END LOOP;

    UPDATE public.profiles
    SET
      username = v_new_username,
      username_reset_required = true,
      moderation_strikes = COALESCE(moderation_strikes, 0) + 1,
      updated_at = now()
    WHERE id = v_profile.id;

    UPDATE public.profile_reports
    SET
      status = 'resolved_action_taken',
      reviewed_by = v_admin,
      reviewed_at = now(),
      admin_note = COALESCE(v_note, admin_note),
      updated_at = now()
    WHERE reported_user_id = p_target_user_id
      AND status = 'open';

    p_metadata := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'previous_username', v_profile.username,
      'new_username', v_new_username
    );

    v_notify_title := 'Username reset';
    v_notify_body := 'Your username was reset. Please choose a new username.';
    v_notify_type := 'PROFILE_USERNAME_RESET';

  ELSIF p_action IN ('suspend_24h', 'suspend_7d', 'suspend_30d', 'suspend_indefinite') THEN
    IF p_action = 'suspend_24h' THEN
      v_until := now() + interval '24 hours';
    ELSIF p_action = 'suspend_7d' THEN
      v_until := now() + interval '7 days';
    ELSIF p_action = 'suspend_30d' THEN
      v_until := now() + interval '30 days';
    ELSE
      v_until := NULL;
    END IF;

    UPDATE public.profiles
    SET
      is_suspended = true,
      suspended_until = v_until,
      suspension_reason = v_reason,
      is_banned = CASE WHEN v_until IS NULL THEN true ELSE COALESCE(is_banned, false) END,
      moderation_strikes = COALESCE(moderation_strikes, 0) + 1,
      updated_at = now()
    WHERE id = v_profile.id;

    UPDATE public.profile_reports
    SET
      status = 'resolved_action_taken',
      reviewed_by = v_admin,
      reviewed_at = now(),
      admin_note = COALESCE(v_note, admin_note),
      updated_at = now()
    WHERE reported_user_id = p_target_user_id
      AND status = 'open';

    p_metadata := COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'suspended_until', v_until
    );

    v_notify_title := 'Account suspended';
    IF v_until IS NULL THEN
      v_notify_body := 'Your account has been suspended indefinitely.';
    ELSIF p_action = 'suspend_24h' THEN
      v_notify_body := 'Your account has been suspended for 24 hours.';
    ELSIF p_action = 'suspend_7d' THEN
      v_notify_body := 'Your account has been suspended for 7 days.';
    ELSE
      v_notify_body := 'Your account has been suspended for 30 days.';
    END IF;
    v_notify_type := 'PROFILE_SUSPENDED';

  ELSIF p_action = 'unsuspend' THEN
    UPDATE public.profiles
    SET
      is_suspended = false,
      suspended_until = NULL,
      suspension_reason = NULL,
      is_banned = false,
      updated_at = now()
    WHERE id = v_profile.id;

    v_notify_title := 'Suspension removed';
    v_notify_body := 'Your account suspension has been removed.';
    v_notify_type := 'PROFILE_UNSUSPENDED';
  END IF;

  INSERT INTO public.profile_moderation_actions (
    target_user_id,
    admin_user_id,
    action,
    reason,
    metadata
  )
  VALUES (
    p_target_user_id,
    v_admin,
    p_action,
    v_reason,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'admin_note', v_note,
      'avatar_storage_path', v_storage_path
    )
  );

  IF v_notify_title IS NOT NULL THEN
    -- notifications.user_id stores profiles.id in this project
    PERFORM public.insert_moderation_notification(
      v_profile.id,
      v_notify_type,
      v_notify_title,
      v_notify_body,
      jsonb_build_object('screen', 'settings', 'action', p_action)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'avatar_storage_path', v_storage_path,
    'new_username', v_new_username,
    'suspended_until', v_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_profile(uuid, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_moderate_profile(uuid, text, text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- complete_username_reset (user chooses new username after admin reset)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_username_reset(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_username text;
  v_profile public.profiles;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_username := lower(btrim(COALESCE(p_username, '')));
  IF v_username !~ '^[a-z0-9_]{3,30}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_username', 'message', 'Use 3–30 lowercase letters, numbers, or underscores.');
  END IF;

  IF v_username LIKE 'niceplace_user_%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_username', 'message', 'Please choose a different username.');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE auth_user_id = v_uid LIMIT 1;
  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT COALESCE(v_profile.username_reset_required, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_required');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = v_username
      AND id <> v_profile.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'username_taken', 'message', 'That username is already taken.');
  END IF;

  UPDATE public.profiles
  SET
    username = v_username,
    username_reset_required = false,
    updated_at = now()
  WHERE id = v_profile.id;

  RETURN jsonb_build_object('success', true, 'username', v_username);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_username_reset(text) FROM public;
GRANT EXECUTE ON FUNCTION public.complete_username_reset(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_my_moderation_state (client enforcement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_moderation_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_suspended boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  PERFORM public.clear_expired_profile_suspension(v_uid);

  SELECT * INTO v_profile FROM public.profiles WHERE auth_user_id = v_uid LIMIT 1;
  IF v_profile.id IS NULL THEN
    RETURN jsonb_build_object('authenticated', true, 'has_profile', false);
  END IF;

  v_suspended := public.is_profile_currently_suspended(v_profile);

  RETURN jsonb_build_object(
    'authenticated', true,
    'has_profile', true,
    'profile_id', v_profile.id,
    'is_suspended', v_suspended,
    'suspended_until', v_profile.suspended_until,
    'suspension_reason', v_profile.suspension_reason,
    'username_reset_required', COALESCE(v_profile.username_reset_required, false),
    'username', v_profile.username,
    'moderation_strikes', COALESCE(v_profile.moderation_strikes, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_moderation_state() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_moderation_state() TO authenticated;
