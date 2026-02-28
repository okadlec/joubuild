-- Allow org admin/owner to update tasks even without project membership
-- This extends the existing UPDATE policy on tasks

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    -- Project member (admin or member)
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = tasks.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'member')
    )
    OR
    -- Org admin/owner can update tasks in any project of their org
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = tasks.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );
