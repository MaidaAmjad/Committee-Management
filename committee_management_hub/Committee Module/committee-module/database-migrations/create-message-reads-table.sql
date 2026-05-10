-- ============================================================================
-- Create message_reads table
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_reads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.committee_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_user    ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reads"
ON public.message_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can select own reads"
ON public.message_reads FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reads"
ON public.message_reads FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Verify it worked
SELECT 'message_reads table ready!' AS status;
