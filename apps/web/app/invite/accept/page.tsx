import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { SetPasswordForm } from './set-password-form';

export default async function InviteAcceptPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const email = user.email;
  if (!email) {
    redirect('/projects');
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check for pending invitations
  const { data: invitations } = await serviceClient
    .from('organization_invitations')
    .select('id, organization_id, role, project_ids')
    .eq('email', email)
    .eq('status', 'pending');

  const PERMISSION_MODULES = ['files','specifications','plans','tasks','photos','forms','timesheets','reports'];

  if (invitations && invitations.length > 0) {
    for (const inv of invitations) {
      const { data: existing } = await serviceClient
        .from('organization_members')
        .select('id')
        .eq('organization_id', inv.organization_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing) {
        await serviceClient
          .from('organization_members')
          .insert({
            organization_id: inv.organization_id,
            user_id: user.id,
            role: inv.role,
          });
      }

      // Process project assignments
      const projectIds: string[] = inv.project_ids || [];
      for (const projectId of projectIds) {
        const { data: existingMember } = await serviceClient
          .from('project_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingMember) {
          await serviceClient
            .from('project_members')
            .insert({ project_id: projectId, user_id: user.id, role: 'member' });

          const defaultPerms = PERMISSION_MODULES.map((mod) => ({
            project_id: projectId,
            user_id: user.id,
            module: mod,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: false,
          }));

          await serviceClient
            .from('project_member_permissions')
            .upsert(defaultPerms, { onConflict: 'project_id,user_id,module' });
        }
      }

      await serviceClient
        .from('organization_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', inv.id);
    }
  }

  // This page is only reachable via invite link, so always show password setup
  return <SetPasswordForm email={email} />;
}
