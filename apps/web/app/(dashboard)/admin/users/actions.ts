'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import type { OrgRole } from '@joubuild/shared';

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
  orgRole: OrgRole;
  organizationId?: string;
}) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  // Org admin can only create users in their own org with roles <= admin
  if (!ctx.isSuperadmin) {
    if (data.orgRole === 'owner') return { error: 'Nemůžete nastavit roli vlastníka' };
    if (data.organizationId && data.organizationId !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tuto organizaci' };
    }
  }

  const serviceClient = getServiceClient();

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
  const targetOrgId = data.organizationId ?? ctx.organizationId;

  if (targetOrgId) {
    await serviceClient
      .from('organization_members')
      .insert({
        organization_id: targetOrgId,
        user_id: userId,
        role: data.orgRole,
      });
  }

  revalidatePath('/admin/users');
  return { data: { id: userId } };
}

export async function inviteUser(email: string, orgRole: OrgRole, organizationId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  if (!ctx.isSuperadmin) {
    if (orgRole === 'owner') return { error: 'Nemůžete nastavit roli vlastníka' };
    if (organizationId !== ctx.organizationId) {
      return { error: 'Nemáte oprávnění pro tuto organizaci' };
    }
  }

  const serviceClient = getServiceClient();

  // Get org name
  const { data: org } = await serviceClient
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Check if user already exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await serviceClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      return { error: 'Uživatel je již členem organizace' };
    }

    const { error: insertError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: existingProfile.id,
        role: orgRole,
      });

    if (insertError) return { error: insertError.message };
    revalidatePath('/admin/users');
    return { success: true, directlyAdded: true };
  }

  // Insert invitation
  const { error: invError } = await serviceClient
    .from('organization_invitations')
    .upsert(
      {
        organization_id: organizationId,
        email,
        role: orgRole,
        invited_by: ctx.userId,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'organization_id,email' }
    );

  if (invError) return { error: invError.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  console.log('[invite] Sending invite email', { email, appUrl, redirectTo: `${appUrl}/auth/callback?next=/invite/accept` });
  const { data: emailData, error: emailError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/invite/accept`,
    data: { invited_org_name: org?.name || '' },
  });
  console.log('[invite] inviteUserByEmail result', { emailData, emailError: emailError ? { message: emailError.message, status: (emailError as any).status, name: emailError.name } : null });

  if (emailError) return { error: 'Chyba při odesílání pozvánky: ' + emailError.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function toggleSuperadmin(userId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };
  if (userId === ctx.userId) return { error: 'Nemůžete změnit sami sebe' };

  const serviceClient = getServiceClient();

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('is_superadmin')
    .eq('id', userId)
    .single();

  if (!profile) return { error: 'Uživatel nenalezen' };

  const { error } = await serviceClient
    .from('profiles')
    .update({ is_superadmin: !profile.is_superadmin })
    .eq('id', userId);

  if (error) return { error: error.message };
  return { data: { is_superadmin: !profile.is_superadmin } };
}

export async function updateUserOrgRole(userId: string, orgId: string, newRole: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  // Non-superadmin cannot set owner role, and can only manage their own org
  if (!ctx.isSuperadmin) {
    if (newRole === 'owner') return { error: 'Nemůžete nastavit roli vlastníka' };
    if (orgId !== ctx.organizationId) return { error: 'Nemáte oprávnění pro tuto organizaci' };
  }

  const serviceClient = getServiceClient();

  const { data: membership } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!membership) {
    const { error } = await serviceClient
      .from('organization_members')
      .insert({ organization_id: orgId, user_id: userId, role: newRole });
    if (error) return { error: error.message };
  } else {
    const { error } = await serviceClient
      .from('organization_members')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('organization_id', orgId);
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function deleteUser(userId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };
  if (userId === ctx.userId) return { error: 'Nemůžete smazat sami sebe' };

  const serviceClient = getServiceClient();

  // Explicitně smazat profil (nespoléhat na CASCADE z auth.users)
  await serviceClient.from('profiles').delete().eq('id', userId);

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) return { error: 'Chyba při mazání: ' + error.message };

  return { success: true };
}

export async function removeUserFromOrg(userId: string, orgId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx) return { error: 'Nemáte oprávnění' };

  if (!ctx.isSuperadmin && orgId !== ctx.organizationId) {
    return { error: 'Nemáte oprávnění pro tuto organizaci' };
  }

  if (userId === ctx.userId) return { error: 'Nemůžete odebrat sami sebe' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}
