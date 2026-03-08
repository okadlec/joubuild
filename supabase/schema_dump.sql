
-- Table: annotations
CREATE TABLE public.annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sheet_version_id UUID,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: calibrations
CREATE TABLE public.calibrations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sheet_version_id UUID,
  point1_x DOUBLE PRECISION NOT NULL,
  point1_y DOUBLE PRECISION NOT NULL,
  point2_x DOUBLE PRECISION NOT NULL,
  point2_y DOUBLE PRECISION NOT NULL,
  real_distance DOUBLE PRECISION NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: checklists
CREATE TABLE public.checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  task_id UUID,
  title TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT False,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: comments
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  task_id UUID,
  user_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  annotation_id UUID,
  photo_id UUID
);

-- Table: documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  folder_path TEXT DEFAULT /,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  folder_id UUID,
  tags TEXT[]
);

-- Table: exports
CREATE TABLE public.exports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  type TEXT NOT NULL,
  status TEXT DEFAULT pending,
  file_url TEXT,
  config JSONB,
  requested_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: folder_permissions
CREATE TABLE public.folder_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  folder_id UUID NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT True,
  can_create BOOLEAN NOT NULL DEFAULT True,
  can_delete BOOLEAN NOT NULL DEFAULT False
);

-- Table: folders
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  parent_id UUID,
  name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: form_submissions
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  template_id UUID,
  project_id UUID,
  data JSONB NOT NULL,
  status TEXT DEFAULT draft,
  submitted_by UUID,
  reviewed_by UUID,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: form_templates
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  schema JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: hyperlinks
CREATE TABLE public.hyperlinks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sheet_version_id UUID,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_url TEXT,
  label TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: mentions
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  comment_id UUID,
  user_id UUID
);

-- Table: notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT False,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: organization_invitations
CREATE TABLE public.organization_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID,
  status TEXT NOT NULL DEFAULT pending,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_at TIMESTAMPTZ,
  project_ids UUID[]
);

-- Table: organization_members
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: organizations
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  plan TEXT DEFAULT free,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: photos
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  task_id UUID,
  sheet_id UUID,
  pin_x DOUBLE PRECISION,
  pin_y DOUBLE PRECISION,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT DEFAULT photo,
  markup_data JSONB,
  caption TEXT,
  tags TEXT[],
  taken_at TIMESTAMPTZ,
  taken_by UUID,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  annotation_id UUID
);

-- Table: plan_sets
CREATE TABLE public.plan_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Table: profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_superadmin BOOLEAN DEFAULT False,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: project_member_permissions
CREATE TABLE public.project_member_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  module TEXT CHECK (module IN ('files', 'specifications', 'plans', 'tasks', 'photos', 'forms', 'timesheets', 'reports')) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT True,
  can_create BOOLEAN NOT NULL DEFAULT True,
  can_edit BOOLEAN NOT NULL DEFAULT True,
  can_delete BOOLEAN NOT NULL DEFAULT False
);

-- Table: project_members
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  cover_image_url TEXT,
  status TEXT DEFAULT active,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Table: report_schedules
CREATE TABLE public.report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  schedule_cron TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  format TEXT DEFAULT pdf,
  is_active BOOLEAN DEFAULT True,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: rfis
CREATE TABLE public.rfis (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT DEFAULT open,
  requested_by UUID,
  assigned_to UUID,
  due_date DATE,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: sheet_versions
CREATE TABLE public.sheet_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sheet_id UUID,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  page_number INTEGER DEFAULT 1,
  ocr_data JSONB,
  is_current BOOLEAN DEFAULT True,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  file_size BIGINT
);

-- Table: sheets
CREATE TABLE public.sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  plan_set_id UUID,
  project_id UUID,
  name TEXT NOT NULL,
  sheet_number TEXT,
  current_version_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: specifications
CREATE TABLE public.specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  color TEXT
);

-- Table: task_categories
CREATE TABLE public.task_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT #3B82F6,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Table: task_tags
CREATE TABLE public.task_tags (
  task_id UUID NOT NULL,
  tag_id UUID NOT NULL
);

-- Table: task_watchers
CREATE TABLE public.task_watchers (
  task_id UUID NOT NULL,
  user_id UUID NOT NULL
);

-- Table: tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  sheet_id UUID,
  category_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT open,
  priority TEXT DEFAULT normal,
  pin_x DOUBLE PRECISION,
  pin_y DOUBLE PRECISION,
  assignee_id UUID,
  created_by UUID,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours DOUBLE PRECISION,
  actual_hours DOUBLE PRECISION DEFAULT 0,
  estimated_cost NUMERIC,
  actual_cost NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  annotation_id UUID
);

-- Table: timesheets
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id UUID,
  user_id UUID,
  task_id UUID,
  date DATE NOT NULL,
  hours DOUBLE PRECISION NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
