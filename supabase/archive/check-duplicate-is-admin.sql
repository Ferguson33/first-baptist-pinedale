-- Check if there are multiple is_admin functions (this can cause weird RLS behavior)
SELECT 
    p.proname,
    n.nspname as schema,
    p.prosrc as function_body,
    p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'is_admin'
ORDER BY n.nspname;
