
-- Step 1: Add 'master' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';

-- Rename 'member' to 'user' (PostgreSQL 10+)
ALTER TYPE public.app_role RENAME VALUE 'member' TO 'user';
