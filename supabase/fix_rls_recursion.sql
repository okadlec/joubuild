-- Fix infinite recursion in RLS policies
-- The organization_members SELECT policy references itself, causing infinite recursion

-- Drop the recursive policies
DROP POLICY IF EXISTS "Org members can view members" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;

-- Fix: Use auth.uid() directly instead of subquery on same table
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can insert org members" ON organization_members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update org members" ON organization_members
  FOR UPDATE USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete org members" ON organization_members
  FOR DELETE USING (
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
  );

-- Also fix project_members which has the same recursion issue
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Admins can manage project members" ON project_members;

CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can insert project members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

CREATE POLICY "Admins can update project members" ON project_members
  FOR UPDATE USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete project members" ON project_members
  FOR DELETE USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

-- Fix organizations policy that references organization_members (which could also cause issues)
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Fix projects policies that reference organization_members
DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
