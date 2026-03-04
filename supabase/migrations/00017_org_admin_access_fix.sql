-- ============================================================
-- Fix: Org admin/owner access to all content in their orgs
-- + Allow members to see all members in their org/project
-- ============================================================

-- ============================================================
-- 1) SECURITY DEFINER helper functions (bypass RLS, no recursion)
-- ============================================================

-- Org IDs where user is a member
CREATE OR REPLACE FUNCTION get_user_org_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = uid;
$$;

-- Org IDs where user is admin/owner
CREATE OR REPLACE FUNCTION get_user_admin_org_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = uid AND role IN ('owner', 'admin');
$$;

-- Project IDs where user is a direct member
CREATE OR REPLACE FUNCTION get_user_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT project_id FROM project_members WHERE user_id = uid;
$$;

-- ALL project IDs in orgs where user is admin/owner
CREATE OR REPLACE FUNCTION get_org_admin_project_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id FROM projects p
  WHERE p.organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = uid AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- 2) Fix organization_members RLS
-- ============================================================

DROP POLICY IF EXISTS "Org members can view members" ON organization_members;
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (
    organization_id IN (SELECT get_user_org_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
CREATE POLICY "Admins can manage org members" ON organization_members
  FOR ALL USING (
    organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
  );

-- ============================================================
-- 3) Fix project_members RLS
-- ============================================================

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage project members" ON project_members;
CREATE POLICY "Admins can manage project members" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ============================================================
-- 4) Fix content table RLS - add org admin access
-- ============================================================

-- ---- plan_sets ----
DROP POLICY IF EXISTS "Project members can view plan sets" ON plan_sets;
CREATE POLICY "Project members can view plan sets" ON plan_sets
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage plan sets" ON plan_sets;
CREATE POLICY "Admin/member can manage plan sets" ON plan_sets
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- sheets ----
DROP POLICY IF EXISTS "Project members can view sheets" ON sheets;
CREATE POLICY "Project members can view sheets" ON sheets
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage sheets" ON sheets;
CREATE POLICY "Admin/member can manage sheets" ON sheets
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- sheet_versions ----
DROP POLICY IF EXISTS "Project members can view versions" ON sheet_versions;
CREATE POLICY "Project members can view versions" ON sheet_versions
  FOR SELECT USING (
    sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
    )
    OR sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admin/member can manage versions" ON sheet_versions;
CREATE POLICY "Admin/member can manage versions" ON sheet_versions
  FOR ALL USING (
    sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
    OR sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- ---- calibrations ----
DROP POLICY IF EXISTS "Project members can view calibrations" ON calibrations;
CREATE POLICY "Project members can view calibrations" ON calibrations
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can manage calibrations" ON calibrations;
CREATE POLICY "Admin/member can manage calibrations" ON calibrations
  FOR ALL USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- ---- annotations ----
DROP POLICY IF EXISTS "Project members can view annotations" ON annotations;
CREATE POLICY "Project members can view annotations" ON annotations
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can manage annotations" ON annotations;
CREATE POLICY "Admin/member can manage annotations" ON annotations
  FOR ALL USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- ---- hyperlinks ----
DROP POLICY IF EXISTS "Project members can view hyperlinks" ON hyperlinks;
CREATE POLICY "Project members can view hyperlinks" ON hyperlinks
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can manage hyperlinks" ON hyperlinks;
CREATE POLICY "Admin/member can manage hyperlinks" ON hyperlinks
  FOR ALL USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
    )
    OR sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- ---- task_categories ----
DROP POLICY IF EXISTS "Project members can view categories" ON task_categories;
CREATE POLICY "Project members can view categories" ON task_categories
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage categories" ON task_categories;
CREATE POLICY "Admin/member can manage categories" ON task_categories
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- tasks ----
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;
CREATE POLICY "Project members can view tasks" ON tasks
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can create tasks" ON tasks;
CREATE POLICY "Admin/member can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can update tasks, followers own" ON tasks;
CREATE POLICY "Admin/member can update tasks, followers own" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can delete tasks" ON tasks;
CREATE POLICY "Admin can delete tasks" ON tasks
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- Also drop the old org admin task update policy from migration 00010
DROP POLICY IF EXISTS "Org admins can update tasks" ON tasks;

-- ---- checklists ----
DROP POLICY IF EXISTS "Can view checklists" ON checklists;
CREATE POLICY "Can view checklists" ON checklists
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Can manage checklists" ON checklists;
CREATE POLICY "Can manage checklists" ON checklists
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- ---- task_watchers ----
DROP POLICY IF EXISTS "Can view watchers" ON task_watchers;
CREATE POLICY "Can view watchers" ON task_watchers
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Can manage watchers" ON task_watchers;
CREATE POLICY "Can manage watchers" ON task_watchers
  FOR ALL USING (
    user_id = auth.uid()
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- ---- tags ----
DROP POLICY IF EXISTS "Can view tags" ON tags;
CREATE POLICY "Can view tags" ON tags
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can manage tags" ON tags;
CREATE POLICY "Can manage tags" ON tags
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- task_tags ----
DROP POLICY IF EXISTS "Can view task tags" ON task_tags;
CREATE POLICY "Can view task tags" ON task_tags
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Can manage task tags" ON task_tags;
CREATE POLICY "Can manage task tags" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- ---- photos ----
DROP POLICY IF EXISTS "Project members can view photos" ON photos;
CREATE POLICY "Project members can view photos" ON photos
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can create photos" ON photos;
CREATE POLICY "Can create photos" ON photos
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can update own photos" ON photos;
CREATE POLICY "Can update own photos" ON photos
  FOR UPDATE USING (
    taken_by = auth.uid()
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can delete photos" ON photos;
CREATE POLICY "Admin can delete photos" ON photos
  FOR DELETE USING (
    taken_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- comments ----
DROP POLICY IF EXISTS "Can view comments" ON comments;
CREATE POLICY "Can view comments" ON comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Can create comments" ON comments;
CREATE POLICY "Can create comments" ON comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- Keep existing: "Can update own comments" and "Can delete own comments" are fine

-- ---- mentions ----
DROP POLICY IF EXISTS "Can view mentions" ON mentions;
CREATE POLICY "Can view mentions" ON mentions
  FOR SELECT USING (
    user_id = auth.uid()
    OR comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids(auth.uid()))
      )
    )
    OR comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Can create mentions" ON mentions;
CREATE POLICY "Can create mentions" ON mentions
  FOR INSERT WITH CHECK (
    comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
    OR comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- ---- documents ----
DROP POLICY IF EXISTS "Project members can view documents" ON documents;
CREATE POLICY "Project members can view documents" ON documents
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage documents" ON documents;
CREATE POLICY "Admin/member can manage documents" ON documents
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- timesheets ----
DROP POLICY IF EXISTS "Project members can view timesheets" ON timesheets;
CREATE POLICY "Project members can view timesheets" ON timesheets
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- Keep existing: "Users can manage own timesheets" is fine

-- ---- form_templates ----
DROP POLICY IF EXISTS "Project members can view templates" ON form_templates;
CREATE POLICY "Project members can view templates" ON form_templates
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage templates" ON form_templates;
CREATE POLICY "Admin/member can manage templates" ON form_templates
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- form_submissions ----
DROP POLICY IF EXISTS "Project members can view submissions" ON form_submissions;
CREATE POLICY "Project members can view submissions" ON form_submissions
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can create submissions" ON form_submissions;
CREATE POLICY "Can create submissions" ON form_submissions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can update own submissions" ON form_submissions;
CREATE POLICY "Can update own submissions" ON form_submissions
  FOR UPDATE USING (
    submitted_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- rfis ----
DROP POLICY IF EXISTS "Project members can view RFIs" ON rfis;
CREATE POLICY "Project members can view RFIs" ON rfis
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can manage RFIs" ON rfis;
CREATE POLICY "Can manage RFIs" ON rfis
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- folders ----
DROP POLICY IF EXISTS "Project members can view folders" ON folders;
CREATE POLICY "Project members can view folders" ON folders
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage folders" ON folders;
CREATE POLICY "Admin/member can manage folders" ON folders
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- specifications ----
DROP POLICY IF EXISTS "Project members can view specifications" ON specifications;
CREATE POLICY "Project members can view specifications" ON specifications
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin/member can manage specifications" ON specifications;
CREATE POLICY "Admin/member can manage specifications" ON specifications
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- project_member_permissions ----
DROP POLICY IF EXISTS "Project members can view own permissions" ON project_member_permissions;
CREATE POLICY "Project members can view own permissions" ON project_member_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can manage permissions" ON project_member_permissions;
CREATE POLICY "Admin can manage permissions" ON project_member_permissions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- folder_permissions ----
DROP POLICY IF EXISTS "Users can view own folder permissions" ON folder_permissions;
CREATE POLICY "Users can view own folder permissions" ON folder_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can manage folder permissions" ON folder_permissions;
CREATE POLICY "Admin can manage folder permissions" ON folder_permissions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- report_schedules ----
DROP POLICY IF EXISTS "Project members can view schedules" ON report_schedules;
CREATE POLICY "Project members can view schedules" ON report_schedules
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admin can manage schedules" ON report_schedules;
CREATE POLICY "Admin can manage schedules" ON report_schedules
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- exports ----
DROP POLICY IF EXISTS "Project members can view exports" ON exports;
CREATE POLICY "Project members can view exports" ON exports
  FOR SELECT USING (
    project_id IN (SELECT get_user_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Can create exports" ON exports;
CREATE POLICY "Can create exports" ON exports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ============================================================
-- 5) Storage policies - add org admin access
-- ============================================================

-- Plans bucket
DROP POLICY IF EXISTS "Project members can view plans" ON storage.objects;
CREATE POLICY "Project members can view plans" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'plans'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_user_project_ids(auth.uid()))
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can upload plans" ON storage.objects;
CREATE POLICY "Admin/member can upload plans" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'plans'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- Photos bucket
DROP POLICY IF EXISTS "Project members can view photos" ON storage.objects;
CREATE POLICY "Project members can view photos storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_user_project_ids(auth.uid()))
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Members can upload photos" ON storage.objects;
CREATE POLICY "Members can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- Documents bucket
DROP POLICY IF EXISTS "Project members can view documents" ON storage.objects;
CREATE POLICY "Project members can view documents storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_user_project_ids(auth.uid()))
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can upload documents" ON storage.objects;
CREATE POLICY "Admin/member can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- Specifications bucket
DROP POLICY IF EXISTS "Project members can view specifications files" ON storage.objects;
CREATE POLICY "Project members can view specifications files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'specifications'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_user_project_ids(auth.uid()))
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can upload specifications" ON storage.objects;
CREATE POLICY "Admin/member can upload specifications" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'specifications'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "Admin/member can delete specifications" ON storage.objects;
CREATE POLICY "Admin/member can delete specifications" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'specifications'
    AND (
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (
          SELECT project_id FROM project_members
          WHERE user_id = auth.uid() AND role IN ('admin', 'member')
        )
      )
      OR (storage.foldername(name))[1] IN (
        SELECT id::text FROM projects WHERE id IN (SELECT get_org_admin_project_ids(auth.uid()))
      )
    )
  );

-- ============================================================
-- 6) Performance indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user_role ON organization_members(user_id, role);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
