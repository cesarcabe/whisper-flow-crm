-- Create workspace_invitations table
CREATE TABLE public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_invitations
CREATE POLICY "Workspace admins can view invitations"
ON public.workspace_invitations
FOR SELECT
USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create invitations"
ON public.workspace_invitations
FOR INSERT
WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete invitations"
ON public.workspace_invitations
FOR DELETE
USING (is_workspace_admin(auth.uid(), workspace_id));

-- Allow anyone to view invitation by token (for accepting invites)
CREATE POLICY "Anyone can view invitation by token"
ON public.workspace_invitations
FOR SELECT
USING (true);

-- Index for fast token lookup
CREATE INDEX idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);