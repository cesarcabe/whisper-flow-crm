-- Add business_type column to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS business_type text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.workspaces.business_type IS 'Type of business: wholesale_clothing, retail_clothing, clinic, or other';

-- Update handle_new_pipeline function to create stages based on workspace business_type
CREATE OR REPLACE FUNCTION public.handle_new_pipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_business_type text;
BEGIN
  -- Get the business_type from the workspace
  SELECT business_type INTO v_business_type
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  -- Create stages based on business type
  CASE v_business_type
    WHEN 'wholesale_clothing' THEN
      -- Atacado de Roupas: 6 stages
      INSERT INTO public.stages (workspace_id, pipeline_id, name, color, position) VALUES
        (NEW.workspace_id, NEW.id, 'Novo Lead', '#6B7280', 0),
        (NEW.workspace_id, NEW.id, 'Qualificação', '#F59E0B', 1),
        (NEW.workspace_id, NEW.id, 'Catálogo Enviado', '#3B82F6', 2),
        (NEW.workspace_id, NEW.id, 'Negociação', '#8B5CF6', 3),
        (NEW.workspace_id, NEW.id, 'Pedido Fechado', '#06B6D4', 4),
        (NEW.workspace_id, NEW.id, 'Venda Realizada', '#10B981', 5);
    
    WHEN 'retail_clothing' THEN
      -- Varejo de Roupas: 5 stages
      INSERT INTO public.stages (workspace_id, pipeline_id, name, color, position) VALUES
        (NEW.workspace_id, NEW.id, 'Novo Lead', '#6B7280', 0),
        (NEW.workspace_id, NEW.id, 'Interesse', '#F59E0B', 1),
        (NEW.workspace_id, NEW.id, 'Atendimento', '#3B82F6', 2),
        (NEW.workspace_id, NEW.id, 'Pedido Escolhido', '#8B5CF6', 3),
        (NEW.workspace_id, NEW.id, 'Venda Realizada', '#10B981', 4);
    
    WHEN 'clinic' THEN
      -- Clínica: 5 stages
      INSERT INTO public.stages (workspace_id, pipeline_id, name, color, position) VALUES
        (NEW.workspace_id, NEW.id, 'Novo Lead', '#6B7280', 0),
        (NEW.workspace_id, NEW.id, 'Triagem', '#F59E0B', 1),
        (NEW.workspace_id, NEW.id, 'Agendamento', '#3B82F6', 2),
        (NEW.workspace_id, NEW.id, 'Consulta', '#8B5CF6', 3),
        (NEW.workspace_id, NEW.id, 'Retorno', '#10B981', 4);
    
    ELSE
      -- Outros / Default: 5 stages genéricos
      INSERT INTO public.stages (workspace_id, pipeline_id, name, color, position) VALUES
        (NEW.workspace_id, NEW.id, 'Novo Lead', '#6B7280', 0),
        (NEW.workspace_id, NEW.id, 'Qualificação', '#F59E0B', 1),
        (NEW.workspace_id, NEW.id, 'Proposta', '#3B82F6', 2),
        (NEW.workspace_id, NEW.id, 'Negociação', '#8B5CF6', 3),
        (NEW.workspace_id, NEW.id, 'Fechado', '#10B981', 4);
  END CASE;
  
  RETURN NEW;
END;
$function$;