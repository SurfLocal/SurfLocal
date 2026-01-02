-- ============================================
-- MAKE USER ADMIN SCRIPT
-- Run this to grant admin role to a user
-- ============================================

-- Option 1: Make admin by email (requires get_user_id_by_email function)
-- Replace 'user@example.com' with the actual email

-- DO $$
-- DECLARE
--     target_user_id UUID;
-- BEGIN
--     SELECT id INTO target_user_id FROM auth.users WHERE email = 'user@example.com';
--     
--     IF target_user_id IS NOT NULL THEN
--         INSERT INTO public.user_roles (user_id, role)
--         VALUES (target_user_id, 'admin')
--         ON CONFLICT (user_id, role) DO NOTHING;
--         RAISE NOTICE 'Admin role granted to user %', target_user_id;
--     ELSE
--         RAISE EXCEPTION 'User not found with email: user@example.com';
--     END IF;
-- END $$;

-- Option 2: Make admin by user_id (simpler, more direct)
-- Replace the UUID below with the actual user_id

-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- HELPER QUERIES
-- ============================================

-- List all users with their emails (to find user_id)
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- List all current admins
-- SELECT ur.user_id, p.display_name, ur.role, ur.created_at
-- FROM public.user_roles ur
-- LEFT JOIN public.profiles p ON p.user_id = ur.user_id
-- WHERE ur.role = 'admin';

-- Remove admin role from user
-- DELETE FROM public.user_roles 
-- WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' 
-- AND role = 'admin';

-- ============================================
-- BATCH SCRIPT EXAMPLE
-- ============================================

-- Make multiple users admins at once
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES 
--     ('user-id-1', 'admin'),
--     ('user-id-2', 'admin'),
--     ('user-id-3', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
