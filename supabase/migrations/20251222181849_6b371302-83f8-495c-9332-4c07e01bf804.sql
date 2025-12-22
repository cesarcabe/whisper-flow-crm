-- Create a function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
  )
$$;

-- Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- workspace_members policies
CREATE POLICY "Users can view their workspace memberships"
ON public.workspace_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Workspace owners/admins can manage members"
ON public.workspace_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- Enable RLS on workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- workspaces policies
CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), id)
);

CREATE POLICY "Workspace owners can manage workspaces"
ON public.workspaces
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
  )
);

-- Drop old policies and create new workspace-based policies for contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

CREATE POLICY "Workspace members can view contacts"
ON public.contacts
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create contacts"
ON public.contacts
FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update contacts"
ON public.contacts
FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete contacts"
ON public.contacts
FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for pipelines
DROP POLICY IF EXISTS "Users can view own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can create pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can update own pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "Users can delete own pipelines" ON public.pipelines;

CREATE POLICY "Workspace members can view pipelines"
ON public.pipelines
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can create pipelines"
ON public.pipelines
FOR INSERT
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can update pipelines"
ON public.pipelines
FOR UPDATE
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can delete pipelines"
ON public.pipelines
FOR DELETE
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for stages
DROP POLICY IF EXISTS "Users can view stages of own pipelines" ON public.stages;
DROP POLICY IF EXISTS "Users can manage stages of own pipelines" ON public.stages;

CREATE POLICY "Workspace members can view stages"
ON public.stages
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage stages"
ON public.stages
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for cards
DROP POLICY IF EXISTS "Users can view cards in own pipelines" ON public.cards;
DROP POLICY IF EXISTS "Users can manage cards in own pipelines" ON public.cards;

CREATE POLICY "Workspace members can view cards"
ON public.cards
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage cards"
ON public.cards
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for tags
DROP POLICY IF EXISTS "Users can view own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;

CREATE POLICY "Workspace members can view tags"
ON public.tags
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage tags"
ON public.tags
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for whatsapp_numbers
DROP POLICY IF EXISTS "Users can view own whatsapp numbers" ON public.whatsapp_numbers;
DROP POLICY IF EXISTS "Users can manage own whatsapp numbers" ON public.whatsapp_numbers;

CREATE POLICY "Workspace members can view whatsapp_numbers"
ON public.whatsapp_numbers
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage whatsapp_numbers"
ON public.whatsapp_numbers
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.conversations;

CREATE POLICY "Workspace members can view conversations"
ON public.conversations
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage conversations"
ON public.conversations
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Drop old policies and create new workspace-based policies for messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;

CREATE POLICY "Workspace members can view messages"
ON public.messages
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage messages"
ON public.messages
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Enable RLS on new tables
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_recurrence ENABLE ROW LEVEL SECURITY;

-- contact_tags policies
CREATE POLICY "Workspace members can view contact_tags"
ON public.contact_tags
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage contact_tags"
ON public.contact_tags
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- segments policies
CREATE POLICY "Workspace members can view segments"
ON public.segments
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage segments"
ON public.segments
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- segment_members policies
CREATE POLICY "Workspace members can view segment_members"
ON public.segment_members
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage segment_members"
ON public.segment_members
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- catalogs policies
CREATE POLICY "Workspace members can view catalogs"
ON public.catalogs
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage catalogs"
ON public.catalogs
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- catalog_assets policies
CREATE POLICY "Workspace members can view catalog_assets"
ON public.catalog_assets
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage catalog_assets"
ON public.catalog_assets
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- catalog_sends policies
CREATE POLICY "Workspace members can view catalog_sends"
ON public.catalog_sends
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage catalog_sends"
ON public.catalog_sends
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- purchases policies
CREATE POLICY "Workspace members can view purchases"
ON public.purchases
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage purchases"
ON public.purchases
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- customer_recurrence policies
CREATE POLICY "Workspace members can view customer_recurrence"
ON public.customer_recurrence
FOR SELECT
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage customer_recurrence"
ON public.customer_recurrence
FOR ALL
USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Update handle_new_user to create a default workspace for new users
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
  INSERT INTO public.workspaces (id, name, created_by)
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