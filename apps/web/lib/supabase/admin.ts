import { createClient } from './server';

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle(),
  ]);

  return profile?.is_superadmin === true || membership !== null;
}
