-- Quick test: Are you currently recognized as an admin?
SELECT 
    auth.uid() as your_user_id,
    (SELECT role FROM profiles WHERE id = auth.uid()) as your_role,
    is_admin() as is_admin_function_result;
