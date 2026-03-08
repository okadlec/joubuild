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

export async function inviteOrgMember(orgId: string, email: string, role: string) {
  const user = await getAuthUser();
  if (!user) return { error: 'Nepřihlášen' };

  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  if (role === 'owner') return { error: 'Nelze pozvat jako vlastníka' };

  const serviceClient = getServiceClient();

  // Get org name for the invitation email
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
    // Check if already a member
    const { data: existingMember } = await serviceClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      return { error: 'Uživatel je již členem organizace' };
    }

    // User exists but not a member — add directly
    const { error: insertError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: existingProfile.id,
        role,
      });

    if (insertError) return { error: insertError.message };
    return { success: true, directlyAdded: true };
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await serviceClient
    .from('organization_invitations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingInvite) {
    return { error: 'Pozvánka pro tento email již existuje' };
  }

  // Upsert invitation (handles re-invite after expiry/cancel)
  const { error: invError } = await serviceClient
    .from('organization_invitations')
    .upsert(
      {
        organization_id: orgId,
        email,
        role,
        invited_by: user.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'organization_id,email' }
    );

  if (invError) return { error: invError.message };

  // Send invitation email via Supabase Auth
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

export async function cancelInvitation(orgId: string, invitationId: string) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

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

export async function resendInvitation(orgId: string, invitationId: string) {
  const hasAccess = await checkOrgAdmin(orgId);
  if (!hasAccess) return { error: 'Nemáte oprávnění' };

  const serviceClient = getServiceClient();

  // Get invitation details
  const { data: invitation } = await serviceClient
    .from('organization_invitations')
    .select('email, organization_id')
    .eq('id', invitationId)
    .eq('organization_id', orgId)
    .single();

  if (!invitation) return { error: 'Pozvánka nenalezena' };

  // Get org name
  const { data: org } = await serviceClient
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // Reset expiry
  const { error: updateError } = await serviceClient
    .from('organization_invitations')
    .update({
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', invitationId);

  if (updateError) return { error: updateError.message };

  // Resend email
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
