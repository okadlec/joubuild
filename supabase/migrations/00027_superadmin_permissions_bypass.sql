-- ============================================================
-- Fix: Superadmin RLS bypass for project_member_permissions
-- Superadmin needs to see all project permissions to access any project
-- ============================================================

-- ============================================================
-- Add FK from organization_members.user_id → profiles.id
-- Required for PostgREST to resolve .select('profiles(...)') joins
-- ============================================================
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Same for project_members if missing
ALTER TABLE project_members
  ADD CONSTRAINT project_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- RLS policies
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
