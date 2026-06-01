-- ============================================================
-- RECREATE is_admin() FUNCTION (safe to run anytime)
-- This ensures the function is correctly defined
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- Grant execute so authenticated users can call it inside policies
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Quick test (run this while impersonating a user)
-- SELECT is_admin();
