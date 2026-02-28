'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkAdminAccess } from '@/lib/supabase/admin';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  orgRole: 'owner' | 'admin' | 'member' | 'viewer';
}) {
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Create user via auth admin API
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });

  if (authError || !authData.user) {
    return { error: 'Chyba při vytváření uživatele: ' + (authError?.message || '') };
  }

  const userId = authData.user.id;

  // Find the first organization (single-company app)
  const { data: org } = await serviceClient
    .from('organizations')
    .select('id')
    .limit(1)
    .single();

  if (org) {
    // Add user to organization
    await serviceClient
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: data.orgRole,
      });
  }

  return { data: { id: userId, email: data.email, fullName: data.fullName } };
}

export async function updateUserRole(userId: string, orgRole: 'owner' | 'admin' | 'member' | 'viewer') {
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Find user's org membership
  const { data: membership } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // User has no org membership - find org and add them
    const { data: org } = await serviceClient
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (org) {
      const { error } = await serviceClient
        .from('organization_members')
        .insert({ organization_id: org.id, user_id: userId, role: orgRole });
      if (error) return { error: error.message };
    }
  } else {
    const { error } = await serviceClient
      .from('organization_members')
      .update({ role: orgRole })
      .eq('user_id', userId);
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function deleteUser(userId: string) {
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  // Prevent deleting yourself
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id === userId) {
    return { error: 'Nemůžete smazat sami sebe' };
  }

  const serviceClient = getServiceClient();

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) {
    return { error: 'Chyba při mazání uživatele: ' + error.message };
  }

  // Profile and memberships are cascade-deleted via auth.users FK
  return { success: true };
}
