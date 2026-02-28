-- Add photo_id FK to comments so photos can have their own chat
ALTER TABLE comments ADD COLUMN photo_id UUID REFERENCES photos(id) ON DELETE CASCADE;
CREATE INDEX idx_comments_photo_id ON comments(photo_id) WHERE photo_id IS NOT NULL;

-- Update RLS policies to include photo comments
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT TO authenticated
  USING (
    -- Task comments
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
    ))
    OR
    -- Annotation comments
    (annotation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM annotations a
      JOIN sheet_versions sv ON sv.id = a.sheet_version_id
      JOIN sheets s ON s.id = sv.sheet_id
      JOIN project_members pm ON pm.project_id = s.project_id
      WHERE a.id = comments.annotation_id AND pm.user_id = auth.uid()
    ))
    OR
    -- Photo comments
    (photo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM photos p
      JOIN project_members pm ON pm.project_id = p.project_id
      WHERE p.id = comments.photo_id AND pm.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM tasks t
        JOIN project_members pm ON pm.project_id = t.project_id
        WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
      ))
      OR
      (annotation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM annotations a
        JOIN sheet_versions sv ON sv.id = a.sheet_version_id
        JOIN sheets s ON s.id = sv.sheet_id
        JOIN project_members pm ON pm.project_id = s.project_id
        WHERE a.id = comments.annotation_id AND pm.user_id = auth.uid()
      ))
      OR
      (photo_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM photos p
        JOIN project_members pm ON pm.project_id = p.project_id
        WHERE p.id = comments.photo_id AND pm.user_id = auth.uid()
      ))
    )
  );

-- Update and delete policies remain user-based (unchanged)
-- They were already correct in 00009: user_id = auth.uid()
