-- Migration 0040: Direct Messages (DMs) — 1:1 conversations with text + audio support

-- ─── Conversations ─────────────────────────────────────────────────────────────
-- participant_a is always the lesser UUID to prevent duplicate pairs
CREATE TABLE public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_a, participant_b),
  CHECK(participant_a < participant_b)
);

CREATE INDEX idx_conversations_a    ON public.conversations(participant_a);
CREATE INDEX idx_conversations_b    ON public.conversations(participant_b);
CREATE INDEX idx_conversations_last ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_see_conversation"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "participants_create_conversation"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

-- ─── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type     TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'audio')),
  content          TEXT,
  audio_url        TEXT,
  duration_seconds INTEGER,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_sender       ON public.messages(sender_id);
CREATE INDEX idx_messages_unread       ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_see_messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "sender_inserts_message"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY "sender_updates_read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

-- ─── RPC: get_or_create_conversation ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  uid_a   UUID;
  uid_b   UUID;
BEGIN
  IF auth.uid() < other_user_id THEN
    uid_a := auth.uid();
    uid_b := other_user_id;
  ELSE
    uid_a := other_user_id;
    uid_b := auth.uid();
  END IF;

  INSERT INTO public.conversations (participant_a, participant_b)
  VALUES (uid_a, uid_b)
  ON CONFLICT (participant_a, participant_b) DO NOTHING;

  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_a = uid_a AND participant_b = uid_b;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Trigger: keep last_message_at current ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- ─── Storage bucket for DM audio ───────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('dms', 'dms', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dm_audio_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dms' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "dm_audio_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dms');
