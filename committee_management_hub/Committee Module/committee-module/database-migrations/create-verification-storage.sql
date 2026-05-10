-- ============================================================================
-- Step 1: Run create-verification-table.sql first
-- Step 2: Create the storage bucket in Supabase Dashboard:
--   Storage → New Bucket → Name: "verification-documents" → Public: YES
-- Step 3: Run this SQL for storage RLS policies
-- ============================================================================

-- Allow authenticated users to upload their own verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Anyone can view verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-documents');

SELECT 'Verification storage ready!' AS status;
