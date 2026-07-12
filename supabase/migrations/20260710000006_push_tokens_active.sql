ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS push_tokens_active_profile_idx
  ON public.push_tokens(profile_id)
  WHERE is_active = true;
