
-- Role enum
CREATE TYPE public.app_role AS ENUM ('organizer', 'sponsor');

-- Profiles table (single table for both roles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  description TEXT DEFAULT '',
  -- Organizer fields
  event_types TEXT[] DEFAULT '{}',
  total_events INTEGER DEFAULT 0,
  social_links TEXT[] DEFAULT '{}',
  -- Sponsor fields
  industry TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  budget_min INTEGER DEFAULT 0,
  budget_max INTEGER DEFAULT 0,
  preferred_activations TEXT[] DEFAULT '{}',
  -- Shared
  rating NUMERIC(3,2) DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT '',
  date TIMESTAMPTZ,
  location TEXT DEFAULT '',
  capacity INTEGER DEFAULT 0,
  audience TEXT DEFAULT '',
  sector TEXT DEFAULT '',
  sponsorship_min INTEGER DEFAULT 0,
  sponsorship_max INTEGER DEFAULT 0,
  confirmed_sponsors TEXT[] DEFAULT '{}',
  media TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sponsor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, organizer_id, sponsor_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  attachments TEXT[] DEFAULT '{}',
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX idx_events_published ON public.events(published);
CREATE INDEX idx_events_date ON public.events(date);
CREATE INDEX idx_events_sector ON public.events(sector);
CREATE INDEX idx_conversations_event_id ON public.conversations(event_id);
CREATE INDEX idx_conversations_organizer_id ON public.conversations(organizer_id);
CREATE INDEX idx_conversations_sponsor_id ON public.conversations(sponsor_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = _conversation_id
    AND (
      organizer_id = public.get_profile_id(_user_id)
      OR sponsor_id = public.get_profile_id(_user_id)
    )
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for events
CREATE POLICY "Organizers can manage own events"
  ON public.events FOR ALL TO authenticated
  USING (
    organizer_id = public.get_profile_id(auth.uid())
  );

CREATE POLICY "Sponsors can view published events"
  ON public.events FOR SELECT TO authenticated
  USING (
    published = true
    AND public.get_user_role(auth.uid()) = 'sponsor'
  );

CREATE POLICY "Organizers can view all published events"
  ON public.events FOR SELECT TO authenticated
  USING (
    published = true
    AND public.get_user_role(auth.uid()) = 'organizer'
  );

-- RLS Policies for conversations
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Authenticated can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    organizer_id = public.get_profile_id(auth.uid())
    OR sponsor_id = public.get_profile_id(auth.uid())
  );

-- RLS Policies for messages
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = public.get_profile_id(auth.uid())
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Participants can update messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile trigger (creates profile stub on user signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile will be completed during onboarding, not auto-created
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
