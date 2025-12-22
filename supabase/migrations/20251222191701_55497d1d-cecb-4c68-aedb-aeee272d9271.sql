
-- Remove all workspace members
DELETE FROM public.workspace_members;

-- Remove all user roles
DELETE FROM public.user_roles;

-- Remove all profiles
DELETE FROM public.profiles;

-- Remove all workspaces
DELETE FROM public.workspaces;

-- Remove all pipelines (will cascade to stages and cards)
DELETE FROM public.pipelines;

-- Remove all stages
DELETE FROM public.stages;

-- Remove all cards
DELETE FROM public.cards;

-- Remove all contacts
DELETE FROM public.contacts;
