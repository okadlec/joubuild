'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function checkOrgAdmin(orgId: string) {
  const user = await getAuthUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .maybeSingle();

  return data !== null;
}

export async function updateOrganization(orgId: string, updates: { name?: string; slug?: string }) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from('organizations')
    .update(updates)
    .eq('id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadOrgLogo(orgId: string, formData: FormData) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const file = formData.get('logo') as File;
  if (!file) return { error: 'Žádný soubor' };

  const serviceClient = getServiceClient();
  const fileName = `org-logos/${orgId}-${Date.now()}.${file.name.split('.').pop()}`;

  const { error: uploadError } = await serviceClient.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = serviceClient.storage.from('avatars').getPublicUrl(fileName);

  const { error: updateError } = await serviceClient
    .from('organizations')
    .update({ logo_url: urlData.publicUrl })
    .eq('id', orgId);

  if (updateError) return { error: updateError.message };
  return { data: { logo_url: urlData.publicUrl } };
}

export async function addOrgMember(orgId: string, email: string, role: string) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Find user by email
  const { data: profiles } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle();

  if (!profiles) {
    return { error: 'Uživatel s tímto emailem nebyl nalezen' };
  }

  // Check if already a member
  const { data: existing } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', profiles.id)
    .maybeSingle();

  if (existing) {
    return { error: 'Uživatel je již členem organizace' };
  }

  const { error } = await serviceClient
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: profiles.id,
      role,
    });

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeOrgMember(orgId: string, userId: string) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  // Prevent removing yourself
  const currentUser = await getAuthUser();
  if (currentUser?.id === userId) {
    return { error: 'Nemůžete odebrat sami sebe' };
  }

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from('organization_members')
    .delete()
    .eq('organization_id', orgId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateOrgMemberRole(orgId: string, userId: string, role: string) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from('organization_members')
    .update({ role })
    .eq('organization_id', orgId)
    .eq('user_id', userId);

  if (error) return { error: error.message };
  return { success: true };
}
