-- Migration: Restrict INSERT on photos and form_submissions to admin/member only
-- Viewers/followers should not be able to create content

-- ---- photos: restrict INSERT to admin/member (not any project member) ----
DROP POLICY IF EXISTS "Can create photos" ON photos;
CREATE POLICY "Can create photos" ON photos
  FOR INSERT WITH CHECK (
    project_id IN (SELECT get_user_member_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );

-- ---- form_submissions: restrict INSERT to admin/member ----
DROP POLICY IF EXISTS "Can create submissions" ON form_submissions;
CREATE POLICY "Can create submissions" ON form_submissions
  FOR INSERT WITH CHECK (
    project_id IN (SELECT get_user_member_project_ids(auth.uid()))
    OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
  );
