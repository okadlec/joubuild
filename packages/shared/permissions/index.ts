import type {
  OrgRole,
  ProjectRole,
  PermissionModule,
  PermissionAction,
  ProjectMemberPermission,
} from '../types';

export interface DefaultPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const ROLE_DEFAULTS: Record<ProjectRole, DefaultPermissions> = {
  admin: { can_view: true, can_create: true, can_edit: true, can_delete: true },
  member: { can_view: true, can_create: true, can_edit: true, can_delete: false },
  follower: { can_view: true, can_create: false, can_edit: false, can_delete: false },
};

export function getDefaultPermissionsForRole(role: ProjectRole): DefaultPermissions {
  return ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.member;
}

export interface PermissionContext {
  orgRole: OrgRole | null;
  projectRole?: ProjectRole | null;
  modulePermissions?: ProjectMemberPermission[];
  isSuperadmin?: boolean;
}

export function can(
  ctx: PermissionContext,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  // Superadmin can do everything
  if (ctx.isSuperadmin) return true;

  // Org owner/admin can do everything
  if (ctx.orgRole === 'owner' || ctx.orgRole === 'admin') return true;

  // Org viewer can only view
  if (ctx.orgRole === 'viewer') return action === 'can_view';

  // Project admin can do everything in the project
  if (ctx.projectRole === 'admin') return true;

  // Project follower can only view
  if (ctx.projectRole === 'follower') return action === 'can_view';

  // Project member - check module permissions
  if (ctx.projectRole === 'member' && ctx.modulePermissions) {
    const perm = ctx.modulePermissions.find((p) => p.module === module);
    if (perm) return !!perm[action];
    // No explicit permission for this module - default to view only
    return action === 'can_view';
  }

  // Org member without project role - view only
  if (ctx.orgRole === 'member') return action === 'can_view';

  return false;
}

export function isOrgAdmin(orgRole: OrgRole | null): boolean {
  return orgRole === 'owner' || orgRole === 'admin';
}

export function canManageMembers(orgRole: OrgRole | null): boolean {
  return orgRole === 'owner' || orgRole === 'admin';
}
