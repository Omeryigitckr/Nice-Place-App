-- Nice Place — rejected place photo retention (30 days)
-- Idempotent. Backfills rejected_at for existing rejected places from updated_at.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS rejected_photos_purged_at timestamptz;

COMMENT ON COLUMN public.places.rejected_at IS
  'Set when status becomes rejected; cleared when status leaves rejected (e.g. resubmit).';

COMMENT ON COLUMN public.places.rejected_photos_purged_at IS
  'Set after Storage cleanup of rejected place photos (idempotent).';

-- Backfill existing rejected rows (best-effort clock from last update).
UPDATE public.places
SET rejected_at = COALESCE(rejected_at, updated_at, created_at, now())
WHERE status = 'rejected'
  AND rejected_at IS NULL;

CREATE INDEX IF NOT EXISTS places_rejected_photo_cleanup_idx
  ON public.places (rejected_at)
  WHERE status = 'rejected'
    AND rejected_photos_purged_at IS NULL
    AND rejected_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Keep rejected_at in sync with status transitions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_place_rejected_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
    -- Allow a later rejection cycle to be cleaned again if photos were re-uploaded.
    NEW.rejected_photos_purged_at := NULL;
  ELSIF NEW.status IS DISTINCT FROM 'rejected' THEN
    -- Resubmit / approve / etc. — stop cleanup eligibility immediately.
    NEW.rejected_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS places_sync_rejected_at ON public.places;
CREATE TRIGGER places_sync_rejected_at
  BEFORE INSERT OR UPDATE OF status ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_place_rejected_at();

-- ---------------------------------------------------------------------------
-- Optional daily schedule via pg_cron + pg_net (enable extensions in Dashboard)
-- Replace PROJECT_REF before enabling, or schedule the Edge Function in Dashboard.
-- ---------------------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
--
-- SELECT cron.unschedule('cleanup-rejected-place-photos')
-- WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rejected-place-photos');
--
-- SELECT cron.schedule(
--   'cleanup-rejected-place-photos',
--   '15 3 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/cleanup-rejected-place-photos',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
--     ),
--     body := jsonb_build_object('source', 'pg_cron')
--   );
--   $$
-- );
