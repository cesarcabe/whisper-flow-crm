-- Add pipeline_id column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_contacts_pipeline_id ON public.contacts(pipeline_id);

-- Populate pipeline_id based on the conversation's whatsapp_number pipeline_preferential_id
UPDATE public.contacts c
SET pipeline_id = wn.pipeline_preferential_id
FROM public.conversations conv
JOIN public.whatsapp_numbers wn ON conv.whatsapp_number_id = wn.id
WHERE c.id = conv.contact_id
  AND wn.pipeline_preferential_id IS NOT NULL
  AND c.pipeline_id IS NULL;