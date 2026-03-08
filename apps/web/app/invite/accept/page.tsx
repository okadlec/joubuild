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
    .select('id, organization_id, role')
    .eq('email', email)
    .eq('status', 'pending');

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

      await serviceClient
        .from('organization_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', inv.id);
    }
  }

  // This page is only reachable via invite link, so always show password setup
  return <SetPasswordForm email={email} />;
}
