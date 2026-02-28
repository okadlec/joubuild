-- ============================================================
-- Reports Module Schema
-- Report schedules, exports
-- ============================================================

-- Planovane reporty
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  schedule_cron TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  format TEXT DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exporty
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('report', 'as_built', 'tasks_csv', 'photos')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  config JSONB,
  requested_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy
CREATE INDEX idx_report_schedules_project ON report_schedules(project_id);
CREATE INDEX idx_exports_project ON exports(project_id);

-- RLS
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Report schedules
CREATE POLICY "Project members can view schedules" ON report_schedules
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage schedules" ON report_schedules
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Exports
CREATE POLICY "Project members can view exports" ON exports
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can create exports" ON exports
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "Can update own exports" ON exports
  FOR UPDATE USING (requested_by = auth.uid());
