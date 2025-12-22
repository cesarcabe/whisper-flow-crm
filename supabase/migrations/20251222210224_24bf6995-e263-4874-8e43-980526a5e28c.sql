-- Create contact_classes table for relationship classification
CREATE TABLE public.contact_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_classes ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_classes
CREATE POLICY "Workspace members can view contact_classes"
ON public.contact_classes FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage contact_classes"
ON public.contact_classes FOR ALL
USING (is_workspace_member(auth.uid(), workspace_id));

-- Add contact_class_id to contacts
ALTER TABLE public.contacts
ADD COLUMN contact_class_id UUID REFERENCES public.contact_classes(id) ON DELETE SET NULL;

-- Add stage_id to conversations for sales process tracking
ALTER TABLE public.conversations
ADD COLUMN stage_id UUID REFERENCES public.stages(id) ON DELETE SET NULL;

-- Add owner_user_id to pipelines for seller ownership
ALTER TABLE public.pipelines
ADD COLUMN owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_contacts_contact_class_id ON public.contacts(contact_class_id);
CREATE INDEX idx_conversations_stage_id ON public.conversations(stage_id);
CREATE INDEX idx_pipelines_owner_user_id ON public.pipelines(owner_user_id);

-- Create trigger for updated_at on contact_classes
CREATE TRIGGER update_contact_classes_updated_at
BEFORE UPDATE ON public.contact_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default contact classes for existing workspaces
INSERT INTO public.contact_classes (workspace_id, name, color, position)
SELECT DISTINCT w.id, 'Novo', '#6B7280', 0
FROM public.workspaces w;

INSERT INTO public.contact_classes (workspace_id, name, color, position)
SELECT DISTINCT w.id, 'Qualificado', '#F59E0B', 1
FROM public.workspaces w;

INSERT INTO public.contact_classes (workspace_id, name, color, position)
SELECT DISTINCT w.id, 'Cliente', '#10B981', 2
FROM public.workspaces w;

INSERT INTO public.contact_classes (workspace_id, name, color, position)
SELECT DISTINCT w.id, 'VIP', '#8B5CF6', 3
FROM public.workspaces w;

INSERT INTO public.contact_classes (workspace_id, name, color, position)
SELECT DISTINCT w.id, 'Inativo', '#EF4444', 4
FROM public.workspaces w;