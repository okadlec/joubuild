-- ============================================================
-- Files, Specifications & Granular Permissions
-- ============================================================

-- ---- Fix: remove orphan project_members with NULL user_id ----
DELETE FROM project_members WHERE user_id IS NULL;

-- ---- Folders (hierarchie slozek) ----

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique name within same parent folder
DO $$ BEGIN
  ALTER TABLE folders ADD CONSTRAINT folders_unique_name UNIQUE (project_id, parent_id, name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partial index for root-level folders (parent_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS folders_unique_root_name
  ON folders (project_id, name)
  WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

-- ---- Documents – add folder_id ----

DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);

-- ---- Specifications (PDF specifikace) ----

CREATE TABLE IF NOT EXISTS specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specifications_project ON specifications(project_id);

-- ---- Permission module enum ----

DO $$ BEGIN
  CREATE TYPE permission_module AS ENUM (
    'files', 'specifications', 'plans', 'tasks', 'photos', 'forms', 'timesheets', 'reports'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---- Project member permissions (per modul) ----

CREATE TABLE IF NOT EXISTS project_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module permission_module NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT true,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (project_id, user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_pmp_project_user ON project_member_permissions(project_id, user_id);

-- ---- Folder permissions (restriktivni override per slozka) ----

CREATE TABLE IF NOT EXISTS folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT true,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (project_id, user_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_fp_project_user ON folder_permissions(project_id, user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_permissions ENABLE ROW LEVEL SECURITY;

-- Folders
DO $$ BEGIN
CREATE POLICY "Project members can view folders" ON folders
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin/member can manage folders" ON folders
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Specifications
DO $$ BEGIN
CREATE POLICY "Project members can view specifications" ON specifications
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin/member can manage specifications" ON specifications
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Project member permissions
DO $$ BEGIN
CREATE POLICY "Project members can view own permissions" ON project_member_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin can manage permissions" ON project_member_permissions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Folder permissions
DO $$ BEGIN
CREATE POLICY "Users can view own folder permissions" ON folder_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin can manage folder permissions" ON folder_permissions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Storage bucket for specifications
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('specifications', 'specifications', false, 104857600)  -- 100MB
ON CONFLICT (id) DO NOTHING;

-- Storage policies for specifications bucket
DO $$ BEGIN
CREATE POLICY "Project members can view specifications files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'specifications'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin/member can upload specifications" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'specifications'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE POLICY "Admin/member can delete specifications" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'specifications'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Trigger: create default permissions when member is added
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_member_permissions()
RETURNS TRIGGER AS $$
DECLARE
  m permission_module;
  modules permission_module[] := ARRAY[
    'files', 'specifications', 'plans', 'tasks', 'photos', 'forms', 'timesheets', 'reports'
  ]::permission_module[];
BEGIN
  -- Skip if user_id is null (e.g. service-role inserts)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH m IN ARRAY modules LOOP
    INSERT INTO project_member_permissions (project_id, user_id, module, can_view, can_create, can_edit, can_delete)
    VALUES (
      NEW.project_id,
      NEW.user_id,
      m,
      true,  -- can_view: all roles
      CASE WHEN NEW.role IN ('admin', 'member') THEN true ELSE false END,  -- can_create
      CASE WHEN NEW.role IN ('admin', 'member') THEN true ELSE false END,  -- can_edit
      CASE WHEN NEW.role = 'admin' THEN true ELSE false END                -- can_delete
    )
    ON CONFLICT (project_id, user_id, module) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_default_permissions ON project_members;
CREATE TRIGGER trg_create_default_permissions
  AFTER INSERT ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_member_permissions();

-- ============================================================
-- Backfill: create permissions for existing project members
-- (skip rows with NULL user_id)
-- ============================================================

INSERT INTO project_member_permissions (project_id, user_id, module, can_view, can_create, can_edit, can_delete)
SELECT
  pm.project_id,
  pm.user_id,
  m.module,
  true,
  CASE WHEN pm.role IN ('admin', 'member') THEN true ELSE false END,
  CASE WHEN pm.role IN ('admin', 'member') THEN true ELSE false END,
  CASE WHEN pm.role = 'admin' THEN true ELSE false END
FROM project_members pm
CROSS JOIN (
  SELECT unnest(ARRAY[
    'files', 'specifications', 'plans', 'tasks', 'photos', 'forms', 'timesheets', 'reports'
  ]::permission_module[]) AS module
) m
WHERE pm.user_id IS NOT NULL
ON CONFLICT (project_id, user_id, module) DO NOTHING;
