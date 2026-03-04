// ============================================================
// JouBuild Shared Types
// ============================================================

// --- Auth & Organization ---

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_superadmin?: boolean;
}

// --- Projects ---

export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectRole = 'admin' | 'member' | 'follower';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
}

// --- Plans ---

export interface PlanSet {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Sheet {
  id: string;
  plan_set_id: string;
  project_id: string;
  name: string;
  sheet_number: string | null;
  current_version_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SheetVersion {
  id: string;
  sheet_id: string;
  version_number: number;
  file_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  page_number: number;
  ocr_data: Record<string, unknown> | null;
  is_current: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface Calibration {
  id: string;
  sheet_version_id: string;
  point1_x: number;
  point1_y: number;
  point2_x: number;
  point2_y: number;
  real_distance: number;
  created_by: string | null;
  created_at: string;
}

export type AnnotationType =
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'cloud'
  | 'arrow'
  | 'text'
  | 'highlighter'
  | 'freehand'
  | 'measurement'
  | 'area';

export interface Annotation {
  id: string;
  sheet_version_id: string;
  type: AnnotationType;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hyperlink {
  id: string;
  sheet_version_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  target_type: 'sheet' | 'document' | 'url';
  target_id: string | null;
  target_url: string | null;
  label: string | null;
  created_by: string | null;
  created_at: string;
}

// --- Tasks ---

export type TaskStatus = 'open' | 'in_progress' | 'done' | 'closed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface TaskCategory {
  id: string;
  project_id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
}

export interface Task {
  id: string;
  project_id: string;
  sheet_id: string | null;
  category_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  pin_x: number | null;
  pin_y: number | null;
  assignee_id: string | null;
  created_by: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  estimated_cost: number | null;
  actual_cost: number;
  annotation_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
}

// --- Communication ---

export interface Comment {
  id: string;
  task_id: string;
  user_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Mention {
  id: string;
  comment_id: string;
  user_id: string;
}

export type PhotoType = 'photo' | 'video' | 'photo_360';

export interface Photo {
  id: string;
  project_id: string;
  task_id: string | null;
  sheet_id: string | null;
  pin_x: number | null;
  pin_y: number | null;
  file_url: string;
  thumbnail_url: string | null;
  type: PhotoType;
  markup_data: Record<string, unknown> | null;
  caption: string | null;
  tags: string[] | null;
  taken_at: string | null;
  taken_by: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
}

export type NotificationType =
  | 'mention'
  | 'task_assigned'
  | 'status_changed'
  | 'comment_added'
  | 'due_date_approaching';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// --- Forms & Documents ---

export type FormType = 'daily_report' | 'inspection' | 'rfi' | 'custom';

export interface FormTemplate {
  id: string;
  project_id: string;
  name: string;
  type: FormType;
  schema: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FormSubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface FormSubmission {
  id: string;
  template_id: string;
  project_id: string;
  data: Record<string, unknown>;
  status: FormSubmissionStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RfiStatus = 'open' | 'answered' | 'closed';

export interface Rfi {
  id: string;
  project_id: string;
  number: number;
  subject: string;
  question: string;
  answer: string | null;
  status: RfiStatus;
  requested_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface Timesheet {
  id: string;
  project_id: string;
  user_id: string;
  task_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  folder_path: string;
  name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Folders ---

export interface Folder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Specifications ---

export interface Specification {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// --- Permissions ---

export type PermissionModule =
  | 'files'
  | 'specifications'
  | 'plans'
  | 'tasks'
  | 'photos'
  | 'forms'
  | 'timesheets'
  | 'reports';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export interface ProjectMemberPermission {
  id: string;
  project_id: string;
  user_id: string;
  module: PermissionModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface FolderPermission {
  id: string;
  project_id: string;
  user_id: string;
  folder_id: string;
  can_view: boolean;
  can_create: boolean;
  can_delete: boolean;
}

// --- Reports ---

export type ReportFormat = 'pdf' | 'csv';
export type ExportType = 'report' | 'as_built' | 'tasks_csv' | 'photos';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportSchedule {
  id: string;
  project_id: string;
  name: string;
  filters: Record<string, unknown>;
  schedule_cron: string;
  recipients: string[];
  format: ReportFormat;
  is_active: boolean;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Export {
  id: string;
  project_id: string;
  type: ExportType;
  status: ExportStatus;
  file_url: string | null;
  config: Record<string, unknown> | null;
  requested_by: string | null;
  completed_at: string | null;
  created_at: string;
}
