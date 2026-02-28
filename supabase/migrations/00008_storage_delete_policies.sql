-- Storage DELETE policy for photos bucket
-- Allow project admins or file owners to delete photos
CREATE POLICY "photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    -- File owner (uploaded_by matches auth user)
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = auth.uid()
    )
    OR
    -- Organization admin/owner
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  )
);
