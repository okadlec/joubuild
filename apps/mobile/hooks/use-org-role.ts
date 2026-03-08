import { isOrgAdmin, canManageMembers } from '@joubuild/shared';
import { useOrg } from '@/providers/org-provider';

export function useOrgRole() {
  const { orgRole } = useOrg();

  return {
    orgRole,
    isOwner: orgRole === 'owner',
    isAdmin: isOrgAdmin(orgRole),
    canManageMembers: canManageMembers(orgRole),
  };
}
