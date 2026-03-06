-- ============================================================
-- Soft Delete + Admin Trash
-- Adds deleted_at columns, updates RLS, creates helper functions
-- ============================================================

-- ============================================================
-- 1) Add deleted_at columns
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE plan_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- 2) Partial indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON projects(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_plan_sets_not_deleted ON plan_sets(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_sets_deleted ON plan_sets(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- 3) Update RLS policies — hide soft-deleted rows from normal users
-- ============================================================

-- ---- projects ----

DROP POLICY IF EXISTS "Users can view projects" ON projects;
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      id IN (SELECT get_user_project_ids(auth.uid()))
      OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Project admins can update projects" ON projects;
CREATE POLICY "Project admins can update projects" ON projects
  FOR UPDATE USING (
    deleted_at IS NULL
    AND (
      id IN (SELECT get_user_project_ids(auth.uid()))
      OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Project admins can delete projects" ON projects;
CREATE POLICY "Project admins can delete projects" ON projects
  FOR DELETE USING (
    deleted_at IS NULL
    AND (
      id IN (SELECT get_user_project_ids(auth.uid()))
      OR organization_id IN (SELECT get_user_admin_org_ids(auth.uid()))
    )
  );

-- ---- plan_sets ----

DROP POLICY IF EXISTS "Project members can view plan sets" ON plan_sets;
CREATE POLICY "Project members can view plan sets" ON plan_sets
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      project_id IN (SELECT get_user_project_ids(auth.uid()))
      OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Admin/member can manage plan sets" ON plan_sets;
CREATE POLICY "Admin/member can manage plan sets" ON plan_sets
  FOR ALL USING (
    deleted_at IS NULL
    AND (
      project_id IN (SELECT get_user_member_project_ids(auth.uid()))
      OR project_id IN (SELECT get_org_admin_project_ids(auth.uid()))
    )
  );

-- ============================================================
-- 4) SECURITY DEFINER functions for soft delete
--    (bypass RLS WITH CHECK issue on UPDATE setting deleted_at)
-- ============================================================

CREATE OR REPLACE FUNCTION soft_delete_project(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has permission (project member or org admin)
  IF NOT (
    p_id IN (SELECT get_user_project_ids(auth.uid()))
    OR (SELECT organization_id FROM projects WHERE id = p_id)
       IN (SELECT get_user_admin_org_ids(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE projects SET deleted_at = now() WHERE id = p_id AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION soft_delete_plan_set(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has permission (project member or org admin)
  IF NOT (
    (SELECT project_id FROM plan_sets WHERE id = p_id)
      IN (SELECT get_user_member_project_ids(auth.uid()))
    OR (SELECT project_id FROM plan_sets WHERE id = p_id)
      IN (SELECT get_org_admin_project_ids(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE plan_sets SET deleted_at = now() WHERE id = p_id AND deleted_at IS NULL;
END;
$$;

-- ============================================================
-- 5) Helper functions to get storage paths before permanent delete
-- ============================================================

CREATE OR REPLACE FUNCTION get_project_storage_paths(p_project_id UUID)
RETURNS TABLE(bucket TEXT, path TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Sheet version PDFs (plans bucket)
  SELECT 'plans' AS bucket, sv.file_url AS path
  FROM sheet_versions sv
  JOIN sheets s ON s.id = sv.sheet_id
  WHERE s.project_id = p_project_id AND sv.file_url IS NOT NULL

  UNION ALL

  -- Sheet version thumbnails (thumbnails bucket)
  SELECT 'thumbnails' AS bucket, sv.thumbnail_url AS path
  FROM sheet_versions sv
  JOIN sheets s ON s.id = sv.sheet_id
  WHERE s.project_id = p_project_id AND sv.thumbnail_url IS NOT NULL

  UNION ALL

  -- Photos
  SELECT 'photos' AS bucket, p.file_url AS path
  FROM photos p
  WHERE p.project_id = p_project_id AND p.file_url IS NOT NULL

  UNION ALL

  -- Photo thumbnails
  SELECT 'photos' AS bucket, p.thumbnail_url AS path
  FROM photos p
  WHERE p.project_id = p_project_id AND p.thumbnail_url IS NOT NULL

  UNION ALL

  -- Documents
  SELECT 'documents' AS bucket, d.file_url AS path
  FROM documents d
  WHERE d.project_id = p_project_id AND d.file_url IS NOT NULL

  UNION ALL

  -- Specifications
  SELECT 'specifications' AS bucket, sp.file_url AS path
  FROM specifications sp
  WHERE sp.project_id = p_project_id AND sp.file_url IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION get_plan_set_storage_paths(p_plan_set_id UUID)
RETURNS TABLE(bucket TEXT, path TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Sheet version PDFs (plans bucket)
  SELECT 'plans' AS bucket, sv.file_url AS path
  FROM sheet_versions sv
  JOIN sheets s ON s.id = sv.sheet_id
  WHERE s.plan_set_id = p_plan_set_id AND sv.file_url IS NOT NULL

  UNION ALL

  -- Sheet version thumbnails (thumbnails bucket)
  SELECT 'thumbnails' AS bucket, sv.thumbnail_url AS path
  FROM sheet_versions sv
  JOIN sheets s ON s.id = sv.sheet_id
  WHERE s.plan_set_id = p_plan_set_id AND sv.thumbnail_url IS NOT NULL;
$$;
