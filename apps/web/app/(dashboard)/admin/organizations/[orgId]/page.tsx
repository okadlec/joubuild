import { redirect, notFound } from 'next/navigation';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import { OrgDetail } from './org-detail';
import type { OrgRole } from '@joubuild/shared';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) redirect('/admin');

  const { orgId } = await params;
  const supabase = getServiceClient();

  const [
    { data: org },
    { data: memberships },
    { data: projects },
    { data: storageData },
    { data: invitationsData },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name, slug, plan')
      .eq('id', orgId)
      .single(),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles!inner(email, full_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, status, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_org_storage_stats', { org_id: orgId }),
    supabase
      .from('organization_invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  if (!org) notFound();

  const members = (memberships ?? []).filter((m: any) => m.user_id).map((m: any) => ({
    user_id: m.user_id,
    email: m.profiles?.email ?? null,
    full_name: m.profiles?.full_name ?? null,
    role: m.role as OrgRole,
  }));

  const storage = storageData ?? { photos: 0, documents: 0, sheets: 0, total: 0 };

  return (
    <OrgDetail
      org={org}
      members={members}
      projects={projects ?? []}
      storage={storage}
      pendingInvitations={(invitationsData ?? []).map((i: any) => ({
        id: i.id,
        email: i.email,
        role: i.role as OrgRole,
        created_at: i.created_at,
        expires_at: i.expires_at,
      }))}
    />
  );
}
