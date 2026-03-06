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

  const isAdmin = membership.role === 'owner' || membership.role === 'admin';

  return (
    <OrgSettings
      org={org}
      isAdmin={isAdmin}
    />
  );
}
