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

  // Load members with profiles
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, user_id, role, profiles:user_id(email, full_name)')
    .eq('organization_id', org.id)
    .order('created_at');

  const formattedMembers = (members || []).map((m: Record<string, unknown>) => {
    const profile = m.profiles as Record<string, unknown> | null;
    return {
      id: m.id as string,
      user_id: m.user_id as string,
      role: m.role as string,
      full_name: profile?.full_name as string | null,
      email: profile?.email as string | null,
    };
  });

  const isAdmin = membership.role === 'owner' || membership.role === 'admin';

  return (
    <OrgSettings
      org={org}
      members={formattedMembers}
      isAdmin={isAdmin}
    />
  );
}
