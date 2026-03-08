-- Fix: Only org admins/owners see all projects; regular members only see assigned projects
DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      is_superadmin()
      OR id IN (SELECT get_user_project_ids(auth.uid()))
      OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
    )
  );

-- Fix: Only org admins can create projects (not regular members)
DROP POLICY IF EXISTS "Org members can create projects" ON projects;
CREATE POLICY "Org admins can create projects" ON projects
  FOR INSERT WITH CHECK (
    is_superadmin()
    OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );
