-- ===========================================
-- STEP 1: First, check your existing users
-- ===========================================
-- Run this query first to see all profiles:
-- Updated to use display_name instead of full_name
SELECT id, email, role, display_name FROM profiles;

-- ===========================================
-- STEP 2: Promote an existing user to admin
-- ===========================================
-- Replace 'your-email@example.com' with the email of the user you want to make admin
UPDATE profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-email@example.com';

-- ===========================================
-- ALTERNATIVE: If you want to create a fresh admin via Supabase Auth
-- You'll need to:
-- 1. Register a new account through the app
-- 2. Then run the UPDATE query above with that email
-- ===========================================
