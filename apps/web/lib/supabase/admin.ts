import { createClient } from './server';
import type { OrgRole } from '@joubuild/shared';

export interface AdminContext {
  userId: string;
  isSuperadmin: boolean;
  isOrgAdmin: boolean;
  organizationId: string | null;
  orgRole: OrgRole | null;
}

export async function getCurrentAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle(),
  ]);

  const isSuperadmin = profile?.is_superadmin === true;
  const isOrgAdmin = membership !== null;

  if (!isSuperadmin && !isOrgAdmin) return null;

  return {
    userId: user.id,
    isSuperadmin,
    isOrgAdmin,
    organizationId: membership?.organization_id ?? null,
    orgRole: (membership?.role as OrgRole) ?? null,
  };
}

export async function checkSuperadmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle();

  return data?.is_superadmin === true;
}

export async function checkAdminAccess(): Promise<boolean> {
  const ctx = await getCurrentAdminContext();
  return ctx !== null;
}
