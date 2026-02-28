-- Add annotation_id FK to comments, photos, and tasks

-- Comments can be linked to an annotation (in addition to task_id)
ALTER TABLE comments ADD COLUMN annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE;
CREATE INDEX idx_comments_annotation_id ON comments(annotation_id) WHERE annotation_id IS NOT NULL;

-- Photos can be linked to an annotation
ALTER TABLE photos ADD COLUMN annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL;
CREATE INDEX idx_photos_annotation_id ON photos(annotation_id) WHERE annotation_id IS NOT NULL;

-- Tasks can be linked to an annotation
ALTER TABLE tasks ADD COLUMN annotation_id UUID REFERENCES annotations(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_annotation_id ON tasks(annotation_id) WHERE annotation_id IS NOT NULL;

-- Make task_id nullable on comments (can be annotation comment without task)
ALTER TABLE comments ALTER COLUMN task_id DROP NOT NULL;

-- RLS: Allow project members to insert/select comments on annotations
-- (existing RLS on comments should already cover this via project membership,
-- but we need to handle cases where task_id is null)
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT TO authenticated
  USING (
    -- Task comments: accessible if user can see the task's project
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id
      WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
    ))
    OR
    -- Annotation comments: accessible if user can see the annotation's sheet version's project
    (annotation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM annotations a
      JOIN sheet_versions sv ON sv.id = a.sheet_version_id
      JOIN sheets s ON s.id = sv.sheet_id
      JOIN project_members pm ON pm.project_id = s.project_id
      WHERE a.id = comments.annotation_id AND pm.user_id = auth.uid()
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
    )
  );

DROP POLICY IF EXISTS "comments_update" ON comments;
CREATE POLICY "comments_update" ON comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
