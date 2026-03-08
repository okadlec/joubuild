-- Add project_ids to organization_invitations
-- Stores which projects the invited user should be added to upon acceptance

ALTER TABLE organization_invitations ADD COLUMN project_ids UUID[] DEFAULT '{}';

-- Replace accept_pending_invitations trigger to also process project assignments
CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
  pid UUID;
  mod TEXT;
  perm_modules TEXT[] := ARRAY['files','specifications','plans','tasks','photos','forms','timesheets','reports'];
BEGIN
  FOR inv IN
    SELECT id, organization_id, role, project_ids
    FROM organization_invitations
    WHERE email = NEW.email
      AND status = 'pending'
      AND expires_at > now()
  LOOP
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (inv.organization_id, NEW.id, inv.role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Process project assignments
    IF inv.project_ids IS NOT NULL THEN
      FOREACH pid IN ARRAY inv.project_ids
      LOOP
        -- Only add if the project still exists
        IF EXISTS (SELECT 1 FROM projects WHERE id = pid) THEN
          INSERT INTO project_members (project_id, user_id, role)
          VALUES (pid, NEW.id, 'member')
          ON CONFLICT (project_id, user_id) DO NOTHING;

          -- Create default permissions for each module
          FOREACH mod IN ARRAY perm_modules
          LOOP
            INSERT INTO project_member_permissions (project_id, user_id, module, can_view, can_create, can_edit, can_delete)
            VALUES (pid, NEW.id, mod, true, true, true, false)
            ON CONFLICT (project_id, user_id, module) DO NOTHING;
          END LOOP;
        END IF;
      END LOOP;
    END IF;

    UPDATE organization_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
