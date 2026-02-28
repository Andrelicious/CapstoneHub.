-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 2: Users can only update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy 3: Admins can read/update any profile
-- Uses auth.jwt() to check role from JWT token metadata instead of querying profiles table
CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);

-- Policy 4: Allow unauthenticated read access to minimal profile data (for public browsing)
CREATE POLICY "profiles_public_read"
ON public.profiles
FOR SELECT
TO anon
USING (true);
