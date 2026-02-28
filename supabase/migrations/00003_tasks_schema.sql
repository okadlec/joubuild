-- ============================================================
-- Tasks Module Schema
-- Categories, tasks, checklists, watchers, tags
-- ============================================================

-- Kategorie (remesla)
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- Ukoly
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  sheet_id UUID REFERENCES sheets(id) ON DELETE SET NULL,
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  pin_x DOUBLE PRECISION,
  pin_y DOUBLE PRECISION,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours DOUBLE PRECISION,
  actual_hours DOUBLE PRECISION DEFAULT 0,
  estimated_cost DECIMAL(12,2),
  actual_cost DECIMAL(12,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklisty
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Watchers ukolu
CREATE TABLE task_watchers (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

-- Tagy
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT
);

CREATE TABLE task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Indexy
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_sheet ON tasks(sheet_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_checklists_task ON checklists(task_id);
CREATE INDEX idx_task_categories_project ON task_categories(project_id);
CREATE INDEX idx_tags_project ON tags(project_id);

-- RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- Task categories
CREATE POLICY "Project members can view categories" ON task_categories
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can manage categories" ON task_categories
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Tasks
CREATE POLICY "Project members can view tasks" ON tasks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admin/member can update tasks, followers own" ON tasks
  FOR UPDATE USING (
    assignee_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admin can delete tasks" ON tasks
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Checklists
CREATE POLICY "Can view checklists" ON checklists
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can manage checklists" ON checklists
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Task watchers
CREATE POLICY "Can view watchers" ON task_watchers
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can manage watchers" ON task_watchers
  FOR ALL USING (
    user_id = auth.uid()
    OR task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Tags
CREATE POLICY "Can view tags" ON tags
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can manage tags" ON tags
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Task tags
CREATE POLICY "Can view task tags" ON task_tags
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can manage task tags" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );
