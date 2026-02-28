-- ============================================================
-- JouBuild Core Schema
-- Organizations, Projects, Members
-- ============================================================

-- Organizace (firma)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clenove organizace
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Stavebni projekty
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  cover_image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clenove projektu (RBAC)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'follower')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Indexy
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization members (non-recursive: user can see own membership rows)
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage org members" ON organization_members
  FOR ALL USING (user_id = auth.uid() AND role IN ('owner', 'admin'));

-- Projects: visible to project members or org members
CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    OR organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can create projects" ON projects
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can update projects" ON projects
  FOR UPDATE USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Project admins can delete projects" ON projects
  FOR DELETE USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Project members (non-recursive: user can see own membership rows directly)
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage project members" ON project_members
  FOR ALL USING (
    project_id IN (
      SELECT pm.project_id FROM project_members pm
      WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
    )
  );

-- Auto-add creator as project admin
CREATE OR REPLACE FUNCTION add_project_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION add_project_creator();

-- Auto-add organization creator as owner
CREATE OR REPLACE FUNCTION add_org_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION add_org_creator();
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
  FOREIGN KEY (current_version_id) REFERENCES sheet_versions(id) ON DELETE SET NULL;

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
-- ============================================================
-- Communication Module Schema
-- Comments, mentions, photos, notifications
-- ============================================================

-- Komentare / chat na ukolu
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- @Zminky v komentarich
CREATE TABLE mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Fotky a media
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  sheet_id UUID REFERENCES sheets(id) ON DELETE SET NULL,
  pin_x DOUBLE PRECISION,
  pin_y DOUBLE PRECISION,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video', 'photo_360')),
  markup_data JSONB,
  caption TEXT,
  tags TEXT[],
  taken_at TIMESTAMPTZ,
  taken_by UUID REFERENCES auth.users(id),
  width INT,
  height INT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifikace
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_created ON comments(created_at);
CREATE INDEX idx_mentions_user ON mentions(user_id);
CREATE INDEX idx_photos_project ON photos(project_id);
CREATE INDEX idx_photos_task ON photos(task_id);
CREATE INDEX idx_photos_sheet ON photos(sheet_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE POLICY "Can view comments" ON comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can create comments" ON comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Can update own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Can delete own comments" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- Mentions
CREATE POLICY "Can view mentions" ON mentions
  FOR SELECT USING (
    user_id = auth.uid()
    OR comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Can create mentions" ON mentions
  FOR INSERT WITH CHECK (
    comment_id IN (
      SELECT id FROM comments WHERE task_id IN (
        SELECT id FROM tasks WHERE project_id IN (
          SELECT project_id FROM project_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Photos
CREATE POLICY "Project members can view photos" ON photos
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can create photos" ON photos
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Can update own photos" ON photos
  FOR UPDATE USING (taken_by = auth.uid());

CREATE POLICY "Admin can delete photos" ON photos
  FOR DELETE USING (
    taken_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Enable realtime for comments and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- ============================================================
-- Forms, Documents, RFIs, Timesheets Schema
-- ============================================================

-- Sablony formularu
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily_report', 'inspection', 'rfi', 'custom')),
  schema JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vyplnene formulare
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RFI
CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number SERIAL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  requested_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vykazy prace
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours DOUBLE PRECISION NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dokumenty
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  folder_path TEXT DEFAULT '/',
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexy
CREATE INDEX idx_form_templates_project ON form_templates(project_id);
CREATE INDEX idx_form_submissions_project ON form_submissions(project_id);
CREATE INDEX idx_form_submissions_template ON form_submissions(template_id);
CREATE INDEX idx_rfis_project ON rfis(project_id);
CREATE INDEX idx_timesheets_project ON timesheets(project_id);
CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_documents_project ON documents(project_id);

-- RLS
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Form templates
CREATE POLICY "Project members can view templates" ON form_templates
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can manage templates" ON form_templates
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Form submissions
CREATE POLICY "Project members can view submissions" ON form_submissions
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can create submissions" ON form_submissions
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Can update own submissions" ON form_submissions
  FOR UPDATE USING (
    submitted_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RFIs
CREATE POLICY "Project members can view RFIs" ON rfis
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Can manage RFIs" ON rfis
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );

-- Timesheets
CREATE POLICY "Project members can view timesheets" ON timesheets
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own timesheets" ON timesheets
  FOR ALL USING (user_id = auth.uid());

-- Documents
CREATE POLICY "Project members can view documents" ON documents
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin/member can manage documents" ON documents
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'member')
    )
  );
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
-- ============================================================
-- Storage Buckets Setup
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('plans', 'plans', true, 104857600),            -- 100MB, public (URLs contain UUIDs)
  ('thumbnails', 'thumbnails', false, 10485760),   -- 10MB
  ('photos', 'photos', false, 52428800),           -- 50MB
  ('documents', 'documents', false, 104857600),    -- 100MB
  ('exports', 'exports', false, 524288000),        -- 500MB
  ('avatars', 'avatars', true, 5242880)            -- 5MB, public
ON CONFLICT (id) DO NOTHING;

-- Storage policies for plans bucket
CREATE POLICY "Project members can view plans" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'plans'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can upload plans" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'plans'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Storage policies for photos bucket
CREATE POLICY "Project members can view photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage policies for documents bucket
CREATE POLICY "Project members can view documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects WHERE id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'member')
      )
    )
  );

-- Avatars - public bucket, users can upload their own
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Profiles table (public user data synced from auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_email ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read profiles
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow insert for trigger (service role)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Allow service role / trigger to update any profile (for handle_new_user trigger)
CREATE POLICY "Service role can update profiles" ON profiles
  FOR UPDATE USING (true) WITH CHECK (true);

-- Trigger to sync auth.users -> profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed existing users into profiles
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Set superadmin
UPDATE profiles SET is_superadmin = true WHERE email = 'ondra.kadlec@email.cz';

-- Fix: make plans bucket public so getPublicUrl() works (URLs contain UUIDs for security)
UPDATE storage.buckets SET public = true WHERE id = 'plans';

-- Fix: recursive RLS on project_members and organization_members
-- caused all data queries to return empty (infinite recursion in policy subqueries)
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org members can view members" ON organization_members;
CREATE POLICY "Org members can view members" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage org members" ON organization_members;
CREATE POLICY "Admins can manage org members" ON organization_members
  FOR ALL USING (user_id = auth.uid() AND role IN ('owner', 'admin'));

-- Fix: allow deleting sheets by making current_version_id ON DELETE SET NULL
ALTER TABLE sheets DROP CONSTRAINT IF EXISTS fk_current_version;
ALTER TABLE sheets ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES sheet_versions(id) ON DELETE SET NULL;
