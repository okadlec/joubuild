-- JouBuild Seed Data
-- Note: Run this after creating a test user via the auth system

-- This seed file creates sample data for testing
-- The actual user_id will need to be replaced with a real auth.users id

-- Sample organization (will be created automatically via trigger when user creates one)
-- Sample project (will be created automatically via UI)

-- Default task categories for new projects
-- These would typically be created when a project is set up

SELECT 'Seed data ready. Create a user via the auth system and then create projects via the UI.' AS message;
