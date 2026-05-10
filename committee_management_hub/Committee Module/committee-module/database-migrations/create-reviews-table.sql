-- ============================================================================
-- Member Reviews Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.member_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL CHECK (char_length(comment) BETWEEN 5 AND 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per reviewer per reviewed user
  UNIQUE (reviewer_id, reviewed_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.member_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.member_reviews(reviewer_id);

ALTER TABLE public.member_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews
CREATE POLICY "Anyone can read reviews"
ON public.member_reviews FOR SELECT TO authenticated USING (true);

-- Users can insert their own reviews (not on themselves)
CREATE POLICY "Users can insert own reviews"
ON public.member_reviews FOR INSERT TO authenticated
WITH CHECK (reviewer_id = auth.uid() AND reviewer_id <> reviewed_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.member_reviews FOR UPDATE TO authenticated
USING (reviewer_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON public.member_reviews FOR DELETE TO authenticated
USING (reviewer_id = auth.uid());

SELECT 'member_reviews table ready!' AS status;
