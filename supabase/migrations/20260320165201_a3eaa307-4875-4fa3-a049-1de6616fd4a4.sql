
-- Create contact request status enum
CREATE TYPE public.contact_request_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create contact_requests table
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status contact_request_status NOT NULL DEFAULT 'pending',
  message TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, sponsor_id)
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Sponsors can create requests
CREATE POLICY "Sponsors can create contact requests"
ON public.contact_requests FOR INSERT TO authenticated
WITH CHECK (
  sponsor_id = get_profile_id(auth.uid())
  AND get_user_role(auth.uid()) = 'sponsor'::app_role
);

-- Both parties can view their requests
CREATE POLICY "Participants can view contact requests"
ON public.contact_requests FOR SELECT TO authenticated
USING (
  sponsor_id = get_profile_id(auth.uid())
  OR organizer_id = get_profile_id(auth.uid())
);

-- Organizers can update (accept/reject) requests addressed to them
CREATE POLICY "Organizers can update contact requests"
ON public.contact_requests FOR UPDATE TO authenticated
USING (organizer_id = get_profile_id(auth.uid()))
WITH CHECK (organizer_id = get_profile_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_contact_requests_updated_at
BEFORE UPDATE ON public.contact_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
