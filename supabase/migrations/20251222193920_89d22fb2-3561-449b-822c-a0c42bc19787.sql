-- Fix infinite recursion in RLS policies for workspace_members
-- and align permissions with the desired workspace flow.

-- 1) Helper: workspace admin/owner check (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = _user_id
      AND wm.workspace_id = _workspace_id
      AND wm.role = ANY (ARRAY['owner'::text, 'admin'::text])
  )
$$;

-- 2) Replace the recursive policy that queries workspace_members inside workspace_members RLS
DROP POLICY IF EXISTS "Workspace owners/admins can manage members" ON public.workspace_members;

-- Admins/owners can see all members in their workspace
CREATE POLICY "Workspace admins can view all members"
ON public.workspace_members
FOR SELECT
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- Admins/owners can add members to their workspace
CREATE POLICY "Workspace admins can insert members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- Admins/owners can update members in their workspace
CREATE POLICY "Workspace admins can update members"
ON public.workspace_members
FOR UPDATE
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
)
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- Admins/owners can remove members from their workspace
CREATE POLICY "Workspace admins can delete members"
ON public.workspace_members
FOR DELETE
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- 3) Ensure first-login workspace provisioning creates an OWNER (so they can manage the workspace)
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

  insert into public.workspaces(name, created_by)
  values (coalesce(v_name, 'Workspace'), v_user_id)
  returning id into v_workspace_id;

  -- first user is OWNER
  insert into public.workspace_members(workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$$;