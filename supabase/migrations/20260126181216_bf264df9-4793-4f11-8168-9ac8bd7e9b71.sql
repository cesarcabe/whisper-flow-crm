-- Fix the handle_new_user trigger to use correct role enum value
-- and automatically assign 'master' role to specific emails

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_workspace_id uuid;
  assigned_role app_role;
  master_emails text[] := ARRAY['cesar@newflow.me', 'trafego@newflow.me', 'arnaldo.newflow@gmail.com'];
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  
  -- Determine role: master for specific emails, user for everyone else
  IF NEW.email = ANY(master_emails) THEN
    assigned_role := 'master';
  ELSE
    assigned_role := 'user';
  END IF;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
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
$function$;