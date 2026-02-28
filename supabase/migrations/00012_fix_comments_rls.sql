-- Drop legacy RLS policies from migration 00004 that conflict with the
-- annotation-aware policies added in 00009.
-- Migration 00009 only dropped "comments_insert" (the new name), but
-- the old policies created under "Can ..." names were never removed.

DROP POLICY IF EXISTS "Can view comments" ON comments;
DROP POLICY IF EXISTS "Can create comments" ON comments;
DROP POLICY IF EXISTS "Can update own comments" ON comments;
DROP POLICY IF EXISTS "Can delete own comments" ON comments;
