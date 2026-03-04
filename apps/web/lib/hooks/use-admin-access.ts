'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export function useAdminAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: profile }, { data: membership }] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_superadmin')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('organization_members')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin'])
          .limit(1)
          .maybeSingle(),
      ]);

      const superadmin = profile?.is_superadmin === true;
      setIsSuperadmin(superadmin);
      setHasAccess(superadmin || membership !== null);
      setLoading(false);
    }
    check();
  }, []);

  return { hasAccess, isSuperadmin, loading };
}
