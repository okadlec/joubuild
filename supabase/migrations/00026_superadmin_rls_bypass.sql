-- ============================================================
-- Fix: Superadmin RLS bypass for organization_members and organizations
-- Superadmin needs to see all organizations and their members in admin dashboard
-- ============================================================

-- Helper function to check if current user is superadmin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- 1) Fix organizations RLS - add superadmin bypass
-- ============================================================

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    is_superadmin()
    OR id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update organizations" ON organizations;
CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE USING (
    is_superadmin()
    OR id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 2) Fix organization_members RLS - add superadmin bypass
-- ============================================================

DROP POLICY IF EXISTS "Org members can view members" ON organization_members;
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (
    is_superadmin()
    OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
CREATE POLICY "Admins can manage org members" ON organization_members
  FOR ALL USING (
    is_superadmin()
    OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- ============================================================
-- 3) Fix projects RLS - add superadmin bypass for viewing
-- ============================================================

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      is_superadmin()
      OR id IN (SELECT get_user_project_ids(auth.uid()))
      OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );
