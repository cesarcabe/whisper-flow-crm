
-- Create is_master function for easy master check
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master'::app_role
  )
$$;

-- Update cesar@newflow.me to master role
UPDATE public.user_roles 
SET role = 'master'::app_role 
WHERE user_id = '356da28f-ab66-4e49-be6e-9725dfdc0d85';

-- Create RLS policies for master users on all main tables

-- Workspaces
CREATE POLICY "Master users can view all workspaces"
ON public.workspaces FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all workspaces"
ON public.workspaces FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Workspace Members
CREATE POLICY "Master users can view all workspace_members"
ON public.workspace_members FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all workspace_members"
ON public.workspace_members FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Contacts
CREATE POLICY "Master users can view all contacts"
ON public.contacts FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all contacts"
ON public.contacts FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Pipelines
CREATE POLICY "Master users can view all pipelines"
ON public.pipelines FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all pipelines"
ON public.pipelines FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Stages
CREATE POLICY "Master users can view all stages"
ON public.stages FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all stages"
ON public.stages FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Cards
CREATE POLICY "Master users can view all cards"
ON public.cards FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all cards"
ON public.cards FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Messages
CREATE POLICY "Master users can view all messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all messages"
ON public.messages FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Conversations
CREATE POLICY "Master users can view all conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all conversations"
ON public.conversations FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Tags
CREATE POLICY "Master users can view all tags"
ON public.tags FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));

CREATE POLICY "Master users can manage all tags"
ON public.tags FOR ALL TO authenticated
USING (public.is_master(auth.uid()));

-- Profiles (master can view all)
CREATE POLICY "Master users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_master(auth.uid()));
