'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentAdminContext } from '@/lib/supabase/admin';
import type { OrgRole } from '@joubuild/shared';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function updateMemberRole(userId: string, orgId: string, newRole: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('organization_id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function removeMember(userId: string, orgId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', orgId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function addMemberToOrg(userId: string, orgId: string, role: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { error } = await serviceClient
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: userId, role });

  if (error) return { error: error.message };
  return { success: true };
}

export async function inviteOrgMemberFromAdmin(orgId: string, email: string, role: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  if (role === 'owner') return { error: 'Nelze pozvat jako vlastníka' };

  const serviceClient = getServiceClient();

  const { data: org } = await serviceClient
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Check if user already exists
  const { data: existingProfile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    // Ověřit, že auth user skutečně existuje (profil mohl zůstat jako osiřelý)
    const { data: authUser } = await serviceClient.auth.admin.getUserById(existingProfile.id);

    if (authUser?.user) {
      // Skutečně existující uživatel — přidat přímo
      const { data: existingMember } = await serviceClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMember) return { error: 'Uživatel je již členem organizace' };

      const { error: insertError } = await serviceClient
        .from('organization_members')
        .insert({ organization_id: orgId, user_id: existingProfile.id, role });

      if (insertError) return { error: insertError.message };
      return { success: true, directlyAdded: true, userId: existingProfile.id };
    }

    // Osiřelý profil — smazat a pokračovat s invite flow
    await serviceClient.from('profiles').delete().eq('id', existingProfile.id);
  }

  const { error: invError } = await serviceClient
    .from('organization_invitations')
    .upsert(
      {
        organization_id: orgId,
        email,
        role,
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
  return { success: true };
}

export async function cancelInvitationFromAdmin(orgId: string, invitationId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();
  const { error } = await serviceClient
    .from('organization_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('organization_id', orgId)
    .eq('status', 'pending');

  if (error) return { error: error.message };
  return { success: true };
}

export async function resendInvitationFromAdmin(orgId: string, invitationId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  const { data: invitation } = await serviceClient
    .from('organization_invitations')
    .select('email')
    .eq('id', invitationId)
    .eq('organization_id', orgId)
    .single();

  if (!invitation) return { error: 'Pozvánka nenalezena' };

  const { data: org } = await serviceClient
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  const { error: updateError } = await serviceClient
    .from('organization_invitations')
    .update({
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', invitationId);

  if (updateError) return { error: updateError.message };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  console.log('[invite-resend] Resending invite email', { email: invitation.email, appUrl });
  const { data: emailData, error: emailError } = await serviceClient.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo: `${appUrl}/auth/callback?next=/invite/accept`,
    data: { invited_org_name: org?.name || '' },
  });
  console.log('[invite-resend] inviteUserByEmail result', { emailData, emailError: emailError ? { message: emailError.message, status: (emailError as any).status, name: emailError.name } : null });

  if (emailError) return { error: 'Chyba při odesílání: ' + emailError.message };
  return { success: true };
}

export async function getMemberProjectAccess(userId: string, orgId: string) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  // Projects where user is a member (within this org)
  const { data: memberProjects } = await serviceClient
    .from('project_members')
    .select('project_id, role, projects!inner(id, name, status)')
    .eq('user_id', userId)
    .eq('projects.organization_id', orgId);

  // All projects in org
  const { data: allProjects } = await serviceClient
    .from('projects')
    .select('id, name')
    .eq('organization_id', orgId);

  const memberProjectIds = new Set(
    (memberProjects || []).map((mp: any) => mp.project_id)
  );

  const availableProjects = (allProjects || []).filter(
    (p) => !memberProjectIds.has(p.id)
  );

  // Permissions for member projects
  const { data: permissions } = await serviceClient
    .from('project_member_permissions')
    .select('*')
    .eq('user_id', userId)
    .in(
      'project_id',
      (memberProjects || []).map((mp: any) => mp.project_id)
    );

  return {
    memberProjects: (memberProjects || []).map((mp: any) => ({
      project_id: mp.project_id,
      role: mp.role,
      name: mp.projects.name,
      status: mp.projects.status,
    })),
    permissions: permissions || [],
    availableProjects,
  };
}

export async function addMemberByEmail(orgId: string, email: string, role: OrgRole) {
  const ctx = await getCurrentAdminContext();
  if (!ctx?.isSuperadmin) return { error: 'Pouze superadmin' };

  const serviceClient = getServiceClient();

  // Look up user by email
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .maybeSingle();

  if (profileError) return { error: profileError.message };
  if (!profile) return { error: 'Uzivatel s timto emailem neexistuje' };

  // Check for duplicate membership
  const { data: existing } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', orgId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) return { error: 'Uzivatel je jiz clenem teto organizace' };

  const { error } = await serviceClient
    .from('organization_members')
    .insert({ organization_id: orgId, user_id: profile.id, role });

  if (error) return { error: error.message };
  return {
    success: true,
    member: {
      user_id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role,
    },
  };
}
