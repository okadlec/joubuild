import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, email, role } = await req.json();

    if (!organizationId || !email || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (role === 'owner') {
      return new Response(JSON.stringify({ error: 'Cannot invite as owner' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is org admin/owner or superadmin
    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .single();

    if (!callerProfile?.is_superadmin) {
      const { data: callerMembership } = await serviceClient
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .maybeSingle();

      if (!callerMembership) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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
        return new Response(JSON.stringify({ error: 'User is already a member' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await serviceClient
        .from('organization_members')
        .insert({ organization_id: organizationId, user_id: existingProfile.id, role });

      return new Response(JSON.stringify({ success: true, directlyAdded: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check existing pending invitation
    const { data: existingInvite } = await serviceClient
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: 'Invitation already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert invitation
    const { error: invError } = await serviceClient
      .from('organization_invitations')
      .upsert(
        {
          organization_id: organizationId,
          email,
          role,
          invited_by: user.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'organization_id,email' }
      );

    if (invError) {
      return new Response(JSON.stringify({ error: invError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send invitation email
    const appUrl = Deno.env.get('APP_URL') || supabaseUrl.replace('.supabase.co', '.vercel.app');
    const { error: emailError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/invite/accept`,
      data: { invited_org_name: org?.name || '' },
    });

    if (emailError) {
      return new Response(JSON.stringify({ error: 'Failed to send invitation: ' + emailError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
