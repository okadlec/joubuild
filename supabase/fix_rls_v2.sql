-- Fix RLS v2: Resolve chicken-and-egg problem with organization_members INSERT
-- The trigger add_org_creator needs to INSERT into organization_members,
-- but the RLS policy requires the user to already be an admin.
-- Solution: Make the trigger SECURITY DEFINER (bypasses RLS) - already is.
-- But the INSERT policy on organization_members also blocks the trigger's subquery.
-- We need to allow the trigger to insert by using a permissive policy for the creator.

-- Fix organization_members INSERT - allow trigger to work
DROP POLICY IF EXISTS "Admins can insert org members" ON organization_members;
CREATE POLICY "Admins or trigger can insert org members" ON organization_members
  FOR INSERT WITH CHECK (
    -- Allow if user is admin/owner of the org (for manually adding members)
    organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
    )
    -- Or allow if the user being added is the current user (for trigger/self-join)
    OR user_id = auth.uid()
  );

-- Fix project_members INSERT - same issue with add_project_creator trigger
DROP POLICY IF EXISTS "Admins can insert project members" ON project_members;
CREATE POLICY "Admins or trigger can insert project members" ON project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- Also make sure the user can see their own org membership right after creation
-- (the SELECT policy user_id = auth.uid() should handle this already)

-- Verify organizations INSERT policy exists (from original migration)
-- If it was somehow dropped, recreate it
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
