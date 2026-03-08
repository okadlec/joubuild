import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrgRole } from '@joubuild/shared';

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  created_at: string;
  expires_at: string;
}

export function useInvitations(orgId: string | null) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('organization_invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setInvitations((data ?? []) as Invitation[]);
    }
    setLoading(false);
  }, [orgId]);

  const inviteMember = useCallback(async (email: string, role: OrgRole) => {
    if (!orgId) return { error: 'No organization' };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { error: 'Not authenticated' };

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const res = await fetch(`${supabaseUrl}/functions/v1/invite-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizationId: orgId, email, role }),
    });

    const result = await res.json();
    if (!res.ok) return { error: result.error || 'Failed to invite' };

    await fetchInvitations();
    return { success: true, directlyAdded: result.directlyAdded };
  }, [orgId, fetchInvitations]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    if (!orgId) return { error: 'No organization' };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { error: 'Not authenticated' };

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const res = await fetch(`${supabaseUrl}/functions/v1/cancel-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizationId: orgId, invitationId }),
    });

    const result = await res.json();
    if (!res.ok) return { error: result.error || 'Failed to cancel' };

    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    return { success: true };
  }, [orgId]);

  const resendInvitation = useCallback(async (invitationId: string) => {
    if (!orgId) return { error: 'No organization' };

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { error: 'Not authenticated' };

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const res = await fetch(`${supabaseUrl}/functions/v1/resend-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizationId: orgId, invitationId }),
    });

    const result = await res.json();
    if (!res.ok) return { error: result.error || 'Failed to resend' };

    return { success: true };
  }, [orgId]);

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    inviteMember,
    cancelInvitation,
    resendInvitation,
  };
}
