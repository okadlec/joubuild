import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { UsersList } from './users-list';
import type { OrgRole } from '@joubuild/shared';

export default async function UsersPage() {
  const ctx = await getCurrentAdminContext();
  if (!ctx) redirect('/projects');

  const supabase = await createClient();

  if (ctx.isSuperadmin) {
    // Superadmin: all users with their org memberships
    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, is_superadmin, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('organization_members')
        .select('user_id, role, organization_id, organizations(name)'),
    ]);

    const memberMap = new Map<string, { role: OrgRole; org_id: string; org_name: string }>();
    if (memberships) {
      for (const m of memberships) {
        const orgName = (m as any).organizations?.name ?? '';
        memberMap.set(m.user_id, {
          role: m.role as OrgRole,
          org_id: m.organization_id,
          org_name: orgName,
        });
      }
    }

    const users = (profiles ?? []).map((p) => {
      const mem = memberMap.get(p.id);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        is_superadmin: p.is_superadmin ?? false,
        created_at: p.created_at,
        org_role: mem?.role ?? null,
        org_id: mem?.org_id ?? null,
        org_name: mem?.org_name ?? null,
      };
    });

    return (
      <UsersList
        users={users}
        isSuperadmin={true}
        currentUserId={ctx.userId}
        organizationId={null}
        availableRoles={['owner', 'admin', 'member', 'viewer']}
      />
    );
  }

  // Org admin: only members of their organization
  const orgId = ctx.organizationId!;

  const [{ data: memberships }, { data: org }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(id, email, full_name, is_superadmin, created_at)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single(),
  ]);

  const users = (memberships ?? []).map((m) => {
    const p = (m as any).profiles;
    return {
      id: m.user_id,
      email: p?.email ?? null,
      full_name: p?.full_name ?? null,
      is_superadmin: p?.is_superadmin ?? false,
      created_at: p?.created_at ?? '',
      org_role: m.role as OrgRole,
      org_id: orgId,
      org_name: org?.name ?? null,
    };
  });

  return (
    <UsersList
      users={users}
      isSuperadmin={false}
      currentUserId={ctx.userId}
      organizationId={orgId}
      availableRoles={['admin', 'member', 'viewer']}
    />
  );
}
