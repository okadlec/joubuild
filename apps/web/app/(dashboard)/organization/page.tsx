import { createClient } from '@/lib/supabase/server';
import { OrgSettings } from './org-settings';

export default async function OrganizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="mb-2 text-lg font-medium">Žádná organizace</p>
        <p className="text-sm text-muted-foreground">
          Nejste členem žádné organizace
        </p>
      </div>
    );
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single();

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="mb-2 text-lg font-medium">Organizace nenalezena</p>
      </div>
    );
  }

  // Load members, then profiles separately (embedded join doesn't work with auth.users FK)
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, user_id, role')
    .eq('organization_id', org.id)
    .order('created_at');

  const userIds = (members || []).map(m => m.user_id);
  const { data: profileRows } = userIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [] as { id: string; email: string | null; full_name: string | null }[] };
  const profileMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]));

  const formattedMembers = (members || []).map(m => ({
    id: m.id as string,
    user_id: m.user_id as string,
    role: m.role as string,
    full_name: profileMap[m.user_id]?.full_name ?? null,
    email: profileMap[m.user_id]?.email ?? null,
  }));

  const isAdmin = membership.role === 'owner' || membership.role === 'admin';

  return (
    <OrgSettings
      org={org}
      members={formattedMembers}
      isAdmin={isAdmin}
    />
  );
}
