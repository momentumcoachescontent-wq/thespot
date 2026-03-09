-- Migration 0027: Persistence and Events Fixed
-- 1. Persistent Rankings
CREATE TABLE IF NOT EXISTS public.drop_history (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    spot_id uuid REFERENCES public.spots(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE public.drop_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-only access to rankings"
ON public.drop_history FOR SELECT TO authenticated USING (true);

-- Trigger to automate persistence (only for safe drops)
CREATE OR REPLACE FUNCTION public.log_drop_persistence()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if it's safe (not flagged)
    -- And only if not already logged (to avoid double counting on update)
    IF (NEW.is_flagged = false) AND (OLD IS NULL OR OLD.is_flagged = true) THEN
        INSERT INTO public.drop_history (author_id, spot_id, created_at)
        VALUES (NEW.author_id, NEW.spot_id, NEW.created_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_log_drop_persistence
AFTER INSERT OR UPDATE ON public.drops
FOR EACH ROW EXECUTE FUNCTION public.log_drop_persistence();

-- 2. Events Redesign
-- Add location column as text (to replace potential geometry issues)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_text text;

-- 3. RSVP System
CREATE TABLE IF NOT EXISTS public.event_attendees (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, user_id)
);

-- Enable RLS for attendees
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can RSVP to events"
ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their RSVP"
ON public.event_attendees FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can see attendees"
ON public.event_attendees FOR SELECT TO authenticated
USING (true);

-- Backfill history for existing drops (optional but good)
INSERT INTO public.drop_history (author_id, spot_id, created_at)
SELECT author_id, spot_id, created_at FROM public.drops
ON CONFLICT DO NOTHING;
