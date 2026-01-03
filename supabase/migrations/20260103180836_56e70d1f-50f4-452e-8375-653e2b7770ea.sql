-- Create group_classes table for WhatsApp group classifications
CREATE TABLE public.group_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_class_id column to contacts for group classification
ALTER TABLE public.contacts 
ADD COLUMN group_class_id UUID REFERENCES public.group_classes(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.group_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_classes
CREATE POLICY "Workspace members can view group_classes"
ON public.group_classes
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace members can manage group_classes"
ON public.group_classes
FOR ALL
USING (is_workspace_member(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_group_classes_updated_at
BEFORE UPDATE ON public.group_classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_contacts_group_class_id ON public.contacts(group_class_id);
CREATE INDEX idx_group_classes_workspace_id ON public.group_classes(workspace_id);