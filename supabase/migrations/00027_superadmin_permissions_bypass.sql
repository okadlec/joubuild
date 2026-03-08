-- ============================================================
-- Fix: Superadmin RLS bypass for project_member_permissions
-- Superadmin needs to see all project permissions to access any project
-- ============================================================

DROP POLICY IF EXISTS "Project members can view own permissions" ON project_member_permissions;
CREATE POLICY "Project members can view own permissions" ON project_member_permissions
  FOR SELECT USING (
    is_superadmin()
    OR user_id = auth.uid()
    OR project_id IN (SELECT get_user_admin_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can manage permissions" ON project_member_permissions;
CREATE POLICY "Admin can manage permissions" ON project_member_permissions
  FOR ALL USING (
    is_superadmin()
    OR project_id IN (SELECT get_user_admin_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );
