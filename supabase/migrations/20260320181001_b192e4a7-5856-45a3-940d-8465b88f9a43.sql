
-- Add sponsor preference fields for better matching
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_sectors text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_audiences text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_event_types text[] DEFAULT '{}'::text[];
