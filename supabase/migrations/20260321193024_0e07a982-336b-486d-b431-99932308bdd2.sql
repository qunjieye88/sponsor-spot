
-- Create saved_events table for bookmarking
CREATE TABLE public.saved_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, event_id)
);

ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own saved events
CREATE POLICY "Users can view own saved events"
ON public.saved_events FOR SELECT
TO authenticated
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can save events
CREATE POLICY "Users can save events"
ON public.saved_events FOR INSERT
TO authenticated
WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Users can unsave events
CREATE POLICY "Users can unsave events"
ON public.saved_events FOR DELETE
TO authenticated
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
