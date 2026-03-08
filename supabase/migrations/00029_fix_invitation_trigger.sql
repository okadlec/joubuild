-- Drop the trigger that auto-accepts invitations on profile creation.
-- Invitations are now processed only when the user visits /invite/accept.
DROP TRIGGER IF EXISTS trg_accept_pending_invitations ON profiles;
DROP FUNCTION IF EXISTS accept_pending_invitations();
