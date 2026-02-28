-- ============================================================
-- Storage Buckets Setup
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('plans', 'plans', false, 104857600),           -- 100MB
  ('thumbnails', 'thumbnails', false, 10485760),   -- 10MB
  ('photos', 'photos', false, 52428800),           -- 50MB
  ('documents', 'documents', false, 104857600),    -- 100MB
  ('exports', 'exports', false, 524288000),        -- 500MB
  ('avatars', 'avatars', true, 5242880)            -- 5MB, public
ON CONFLICT (id) DO NOTHING;

-- Storage policies for plans bucket
CREATE POLICY "Project members can view plans" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'plans'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can upload plans" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'plans'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Storage policies for photos bucket
CREATE POLICY "Project members can view photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies for documents bucket
CREATE POLICY "Project members can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Avatars - public bucket, users can upload their own
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
