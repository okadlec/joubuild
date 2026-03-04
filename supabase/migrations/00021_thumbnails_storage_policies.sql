-- ============================================================
-- Storage policies for thumbnails bucket
-- (bucket created in 00007_storage_buckets.sql)
-- ============================================================

-- Project members can view thumbnails
CREATE POLICY "Project members can view thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admin/member can upload thumbnails
CREATE POLICY "Admin/member can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'thumbnails'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );
