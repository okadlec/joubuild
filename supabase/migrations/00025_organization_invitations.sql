-- Organization Invitations
-- Enables inviting users by email to join an organization

CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX idx_invitations_org ON organization_invitations(organization_id) WHERE status = 'pending';
CREATE INDEX idx_invitations_email ON organization_invitations(email) WHERE status = 'pending';

-- RLS
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Superadmins can do everything
CREATE POLICY "superadmin_full_access" ON organization_invitations
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_superadmin = true)
  );

-- Org admins/owners can view their org's invitations
CREATE POLICY "org_admin_select" ON organization_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_invitations.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Org admins/owners can insert invitations
CREATE POLICY "org_admin_insert" ON organization_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_invitations.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Org admins/owners can update invitations (cancel, resend)
CREATE POLICY "org_admin_update" ON organization_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_invitations.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Trigger: auto-accept pending invitations when a profile is created
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
BEGIN
  FOR inv IN
    SELECT id, organization_id, role
    FROM organization_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (inv.organization_id, NEW.id, inv.role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_accept_pending_invitations
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION accept_pending_invitations();
