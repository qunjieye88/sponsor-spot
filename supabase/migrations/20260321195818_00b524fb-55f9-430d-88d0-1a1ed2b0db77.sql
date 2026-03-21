
CREATE TABLE public.saved_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, sponsor_id)
);

ALTER TABLE public.saved_sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can save sponsors"
  ON public.saved_sponsors FOR INSERT TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unsave sponsors"
  ON public.saved_sponsors FOR DELETE TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own saved sponsors"
  ON public.saved_sponsors FOR SELECT TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
