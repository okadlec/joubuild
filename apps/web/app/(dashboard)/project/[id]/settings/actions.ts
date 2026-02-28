'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function inviteMember(projectId: string, email: string, role: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Nejste přihlášen' };
  }

  // Check caller is admin
  const { data: callerMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!callerMember || callerMember.role !== 'admin') {
    return { error: 'Nemáte oprávnění přidávat členy' };
  }

  // Use service role to look up user by email in profiles
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (!profile) {
    return { error: 'Uživatel s tímto emailem nebyl nalezen. Uživatel se musí nejdříve zaregistrovat.' };
  }

  // Check if already a member
  const { data: existing } = await serviceClient
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    return { error: 'Uživatel je již členem projektu' };
  }

  // Add as member
  const { error } = await serviceClient
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: profile.id,
      role,
    });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
