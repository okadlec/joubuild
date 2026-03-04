-- ============================================================
-- Fix: Projects table RLS policies to use SECURITY DEFINER helpers
-- (consistent with all other tables updated in 00017)
-- ============================================================

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    id IN (SELECT get_user_project_ids(auth.uid()))
    OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Org members can create projects" ON projects;
CREATE POLICY "Org members can create projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Project admins can update projects" ON projects;
CREATE POLICY "Project admins can update projects" ON projects
  FOR UPDATE USING (
    id IN (SELECT get_user_project_ids(auth.uid()))
    OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Project admins can delete projects" ON projects;
CREATE POLICY "Project admins can delete projects" ON projects
  FOR DELETE USING (
    id IN (SELECT get_user_project_ids(auth.uid()))
    OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );
