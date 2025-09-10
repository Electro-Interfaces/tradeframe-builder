-- Fix users table role constraint to include bto_manager
-- This script should be executed in Supabase SQL Editor

-- 1. First, check current constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass;

-- 2. Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 3. Add new constraint with bto_manager role included
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN (
    'system_admin',
    'network_admin', 
    'manager',
    'operator',
    'bto_manager'
));

-- 4. Verify the new constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass;

-- 5. Test the constraint by checking existing roles
SELECT DISTINCT role, COUNT(*) as user_count
FROM public.users 
GROUP BY role
ORDER BY role;