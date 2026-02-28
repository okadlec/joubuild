-- ============================================================
-- Plans Module Schema
-- Plan sets, sheets, versions, calibrations, annotations, hyperlinks
-- ============================================================

-- Vykresove sady
CREATE TABLE plan_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Jednotlive listy
CREATE TABLE sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_set_id UUID REFERENCES plan_sets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sheet_number TEXT,
  current_version_id UUID,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Verze listu
CREATE TABLE sheet_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  page_number INT DEFAULT 1,
  ocr_data JSONB,
  is_current BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sheets ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES sheet_versions(id);

-- Kalibrace meritka
CREATE TABLE calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_version_id UUID REFERENCES sheet_versions(id) ON DELETE CASCADE,
  point1_x DOUBLE PRECISION NOT NULL,
  point1_y DOUBLE PRECISION NOT NULL,
  point2_x DOUBLE PRECISION NOT NULL,
  point2_y DOUBLE PRECISION NOT NULL,
  real_distance DOUBLE PRECISION NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anotace na vykresu
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_version_id UUID REFERENCES sheet_versions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('line', 'rectangle', 'ellipse', 'cloud', 'arrow', 'text', 'highlighter', 'freehand', 'measurement', 'area')),
  data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hyperlinky na vykresu
CREATE TABLE hyperlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_version_id UUID REFERENCES sheet_versions(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('sheet', 'document', 'url')),
  target_id UUID,
  target_url TEXT,
  label TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy
CREATE INDEX idx_plan_sets_project ON plan_sets(project_id);
CREATE INDEX idx_sheets_plan_set ON sheets(plan_set_id);
CREATE INDEX idx_sheets_project ON sheets(project_id);
CREATE INDEX idx_sheet_versions_sheet ON sheet_versions(sheet_id);
CREATE INDEX idx_annotations_version ON annotations(sheet_version_id);
CREATE INDEX idx_hyperlinks_version ON hyperlinks(sheet_version_id);

-- RLS
ALTER TABLE plan_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hyperlinks ENABLE ROW LEVEL SECURITY;

-- Plan sets: project members can view
CREATE POLICY "Project members can view plan sets" ON plan_sets
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can manage plan sets" ON plan_sets
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Sheets
CREATE POLICY "Project members can view sheets" ON sheets
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can manage sheets" ON sheets
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Sheet versions
CREATE POLICY "Project members can view versions" ON sheet_versions
  FOR SELECT USING (
    sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can manage versions" ON sheet_versions
  FOR ALL USING (
    sheet_id IN (
      SELECT id FROM sheets WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Calibrations
CREATE POLICY "Project members can view calibrations" ON calibrations
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

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
  );

-- Annotations
CREATE POLICY "Project members can view annotations" ON annotations
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

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
  );

-- Hyperlinks
CREATE POLICY "Project members can view hyperlinks" ON hyperlinks
  FOR SELECT USING (
    sheet_version_id IN (
      SELECT id FROM sheet_versions WHERE sheet_id IN (
        SELECT id FROM sheets WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

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
  );
