-- Rename workspaces.created_by to owner_id and update dependent functions

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.workspaces RENAME COLUMN created_by TO owner_id;
  END IF;
END
$$;

-- Rename foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workspaces_created_by_fkey'
  ) THEN
    ALTER TABLE public.workspaces RENAME CONSTRAINT workspaces_created_by_fkey TO workspaces_owner_id_fkey;
  END IF;
END
$$;

-- Update function that ensures workspace for user
CREATE OR REPLACE FUNCTION public.ensure_workspace_for_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_user_id uuid;
  v_workspace_id uuid;
  v_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- find existing workspace membership
  select wm.workspace_id
    into v_workspace_id
  from public.workspace_members wm
  where wm.user_id = v_user_id
  order by wm.created_at asc
  limit 1;

  if v_workspace_id is not null then
    return v_workspace_id;
  end if;

  -- default workspace name from profile if exists
  select coalesce(p.full_name, p.email, 'Workspace')
    into v_name
  from public.profiles p
  where p.id = v_user_id;

  insert into public.workspaces(name, owner_id)
  values (coalesce(v_name, 'Workspace'), v_user_id)
  returning id into v_workspace_id;

  -- first user is OWNER
  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$$;

-- Update function that creates default workspace on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Assign default member role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  -- Create default workspace for new user
  INSERT INTO public.workspaces (id, name, owner_id)
  VALUES (gen_random_uuid(), 'Meu Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;
  
  -- Add user as owner of the workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  -- Create default pipeline in the new workspace
  INSERT INTO public.pipelines (id, name, description, created_by, color, workspace_id)
  VALUES (gen_random_uuid(), 'Vendas', 'Pipeline padrão de vendas', NEW.id, '#3B82F6', new_workspace_id);
  
  RETURN NEW;
END;
$$;
