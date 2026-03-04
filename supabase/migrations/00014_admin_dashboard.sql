-- Migration: Admin Dashboard support
-- Add file_size tracking and RPC functions for storage/platform stats

-- Add file_size column to sheet_versions for storage tracking
ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- RPC: Get total database size (superadmin only)
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  db_size BIGINT;
  is_super BOOLEAN;
BEGIN
  SELECT is_superadmin INTO is_super FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(is_super, false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT pg_database_size(current_database()) INTO db_size;
  RETURN db_size;
END;
$$;

-- RPC: Get platform-wide storage stats (superadmin only)
-- Returns total bytes from photos, documents, and sheet_versions
CREATE OR REPLACE FUNCTION get_platform_storage_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  photos_size BIGINT;
  documents_size BIGINT;
  sheets_size BIGINT;
  is_super BOOLEAN;
BEGIN
  SELECT is_superadmin INTO is_super FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(is_super, false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(file_size), 0) INTO photos_size FROM photos;
  SELECT COALESCE(SUM(file_size), 0) INTO documents_size FROM documents;
  SELECT COALESCE(SUM(file_size), 0) INTO sheets_size FROM sheet_versions;

  RETURN json_build_object(
    'photos', photos_size,
    'documents', documents_size,
    'sheets', sheets_size,
    'total', photos_size + documents_size + sheets_size
  );
END;
$$;

-- RPC: Get storage stats for a specific organization
-- Accessible by superadmin or org owner/admin
CREATE OR REPLACE FUNCTION get_org_storage_stats(org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  photos_size BIGINT;
  documents_size BIGINT;
  sheets_size BIGINT;
  is_super BOOLEAN;
  has_org_access BOOLEAN;
BEGIN
  SELECT is_superadmin INTO is_super FROM profiles WHERE id = auth.uid();

  IF NOT COALESCE(is_super, false) THEN
    SELECT EXISTS(
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND organization_id = org_id
        AND role IN ('owner', 'admin')
    ) INTO has_org_access;

    IF NOT has_org_access THEN
      RAISE EXCEPTION 'Access denied';
    END IF;
  END IF;

  -- Photos in projects belonging to this org
  SELECT COALESCE(SUM(ph.file_size), 0) INTO photos_size
  FROM photos ph
  JOIN projects p ON ph.project_id = p.id
  WHERE p.organization_id = org_id;

  -- Documents in projects belonging to this org
  SELECT COALESCE(SUM(d.file_size), 0) INTO documents_size
  FROM documents d
  JOIN projects p ON d.project_id = p.id
  WHERE p.organization_id = org_id;

  -- Sheet versions in projects belonging to this org
  SELECT COALESCE(SUM(sv.file_size), 0) INTO sheets_size
  FROM sheet_versions sv
  JOIN sheets s ON sv.sheet_id = s.id
  JOIN plan_sets ps ON s.plan_set_id = ps.id
  JOIN projects p ON ps.project_id = p.id
  WHERE p.organization_id = org_id;

  RETURN json_build_object(
    'photos', photos_size,
    'documents', documents_size,
    'sheets', sheets_size,
    'total', photos_size + documents_size + sheets_size
  );
END;
$$;

-- RPC: Get storage stats per organization (superadmin only)
-- Returns array of {org_id, org_name, photos, documents, sheets, total}
CREATE OR REPLACE FUNCTION get_all_orgs_storage()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  is_super BOOLEAN;
BEGIN
  SELECT is_superadmin INTO is_super FROM profiles WHERE id = auth.uid();
  IF NOT COALESCE(is_super, false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT
      o.id AS org_id,
      o.name AS org_name,
      COALESCE(ph_stats.total, 0) AS photos,
      COALESCE(doc_stats.total, 0) AS documents,
      COALESCE(sv_stats.total, 0) AS sheets,
      COALESCE(ph_stats.total, 0) + COALESCE(doc_stats.total, 0) + COALESCE(sv_stats.total, 0) AS total
    FROM organizations o
    LEFT JOIN LATERAL (
      SELECT SUM(ph.file_size) AS total
      FROM photos ph
      JOIN projects p ON ph.project_id = p.id
      WHERE p.organization_id = o.id
    ) ph_stats ON true
    LEFT JOIN LATERAL (
      SELECT SUM(d.file_size) AS total
      FROM documents d
      JOIN projects p ON d.project_id = p.id
      WHERE p.organization_id = o.id
    ) doc_stats ON true
    LEFT JOIN LATERAL (
      SELECT SUM(sv.file_size) AS total
      FROM sheet_versions sv
      JOIN sheets s ON sv.sheet_id = s.id
      JOIN plan_sets ps ON s.plan_set_id = ps.id
      JOIN projects p ON ps.project_id = p.id
      WHERE p.organization_id = o.id
    ) sv_stats ON true
    ORDER BY total DESC
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
