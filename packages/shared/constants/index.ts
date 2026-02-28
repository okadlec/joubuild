// Task statuses
export const TASK_STATUSES = ['open', 'in_progress', 'done', 'closed'] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'Otevřený',
  in_progress: 'Probíhá',
  done: 'Hotovo',
  closed: 'Uzavřený',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  done: '#10B981',
  closed: '#6B7280',
};

// Task priorities
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  low: 'Nízká',
  normal: 'Normální',
  high: 'Vysoká',
  critical: 'Kritická',
};

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: '#6B7280',
  normal: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

// Project statuses
export const PROJECT_STATUSES = ['active', 'archived', 'completed'] as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktivní',
  archived: 'Archivovaný',
  completed: 'Dokončený',
};

// Roles
export const ORG_ROLES = ['owner', 'admin', 'member'] as const;
export const PROJECT_ROLES = ['admin', 'member', 'follower'] as const;

export const PROJECT_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrátor',
  member: 'Člen',
  follower: 'Sledující',
};

// Annotation types
export const ANNOTATION_TYPES = [
  'line',
  'rectangle',
  'ellipse',
  'cloud',
  'arrow',
  'text',
  'highlighter',
  'freehand',
  'measurement',
  'area',
] as const;

// Form types
export const FORM_TYPES = ['daily_report', 'inspection', 'rfi', 'custom'] as const;

export const FORM_TYPE_LABELS: Record<string, string> = {
  daily_report: 'Stavební deník',
  inspection: 'Inspekce',
  rfi: 'RFI',
  custom: 'Vlastní',
};

// Notification types
export const NOTIFICATION_TYPES = [
  'mention',
  'task_assigned',
  'status_changed',
  'comment_added',
  'due_date_approaching',
] as const;

// Supabase Storage buckets
export const STORAGE_BUCKETS = {
  PLANS: 'plans',
  THUMBNAILS: 'thumbnails',
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  EXPORTS: 'exports',
  AVATARS: 'avatars',
} as const;

// Default category colors
export const DEFAULT_CATEGORY_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
] as const;
