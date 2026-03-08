import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrgRole } from '@joubuild/shared';
import { getOrganizations } from '@joubuild/supabase';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth-provider';

const STORAGE_KEY = '@joubuild/currentOrgId';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  created_at: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentOrgId: string | null;
  orgRole: OrgRole | null;
  setCurrentOrgId: (id: string) => Promise<void>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(true);

  const extractRole = useCallback(
    (orgs: any[], orgId: string | null): OrgRole | null => {
      if (!orgId || !user) return null;
      const org = orgs.find((o: any) => o.id === orgId);
      if (!org?.organization_members) return null;
      const membership = org.organization_members.find(
        (m: any) => m.user_id === user.id
      );
      return (membership?.role as OrgRole) ?? null;
    },
    [user]
  );

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrgIdState(null);
      setOrgRole(null);
      setLoading(false);
      return;
    }

    const { data, error } = await getOrganizations(supabase);
    if (error) {
      console.error('OrgProvider fetch error:', error);
      setLoading(false);
      return;
    }

    const orgs = (data ?? []) as any[];
    setOrganizations(orgs);

    // Restore persisted org or fallback to first
    const storedId = await AsyncStorage.getItem(STORAGE_KEY);
    const validStored = orgs.find((o: any) => o.id === storedId);
    const selectedId = validStored ? storedId! : orgs[0]?.id ?? null;

    setCurrentOrgIdState(selectedId);
    setOrgRole(extractRole(orgs, selectedId));
    setLoading(false);
  }, [user, extractRole]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const setCurrentOrgId = useCallback(
    async (id: string) => {
      setCurrentOrgIdState(id);
      setOrgRole(extractRole(organizations, id));
      await AsyncStorage.setItem(STORAGE_KEY, id);
    },
    [organizations, extractRole]
  );

  const currentOrg =
    organizations.find((o) => o.id === currentOrgId) ?? null;

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        currentOrgId,
        orgRole,
        setCurrentOrgId,
        loading,
        refresh: fetchOrganizations,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
