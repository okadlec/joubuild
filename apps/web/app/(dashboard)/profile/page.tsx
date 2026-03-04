import { createClient } from '@/lib/supabase/server';
import { ProfileSettings } from './profile-settings';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="mb-2 text-lg font-medium">Nepřihlášen</p>
      </div>
    );
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="mb-2 text-lg font-medium">Profil nenalezen</p>
      </div>
    );
  }

  // Get org info
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, organizations:organization_id(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const orgName = membership
    ? (membership.organizations as unknown as { name: string })?.name ?? null
    : null;
  const orgRole = membership?.role ?? null;

  return (
    <ProfileSettings
      profile={profile}
      orgName={orgName}
      orgRole={orgRole}
    />
  );
}
