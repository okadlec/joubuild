'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function createOrganizationAndProject(data: {
  name: string;
  description: string | null;
  address: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Nejste přihlášen' };
  }

  // Use service role to bypass RLS for initial org/project setup
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if user already has an organization
  const { data: existingMembership } = await serviceClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1);

  let orgId: string;

  if (existingMembership && existingMembership.length > 0) {
    orgId = existingMembership[0].organization_id;
  } else {
    // Create organization
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'org';

    const { data: newOrg, error: orgError } = await serviceClient
      .from('organizations')
      .insert({ name: 'Moje firma', slug: slug + '-' + Date.now() })
      .select()
      .single();

    if (orgError || !newOrg) {
      return { error: 'Chyba při vytváření organizace: ' + (orgError?.message || '') };
    }

    // Add user as owner
    await serviceClient
      .from('organization_members')
      .insert({ organization_id: newOrg.id, user_id: user.id, role: 'owner' });

    orgId = newOrg.id;
  }

  // Create project
  const { data: project, error: projectError } = await serviceClient
    .from('projects')
    .insert({
      organization_id: orgId,
      name: data.name,
      description: data.description,
      address: data.address,
    })
    .select()
    .single();

  if (projectError || !project) {
    return { error: 'Chyba při vytváření projektu: ' + (projectError?.message || '') };
  }

  // Add user as project admin
  await serviceClient
    .from('project_members')
    .insert({ project_id: project.id, user_id: user.id, role: 'admin' });

  return { data: project };
}
