-- Corrigir a função handle_new_pipeline para incluir workspace_id
CREATE OR REPLACE FUNCTION public.handle_new_pipeline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.stages (workspace_id, pipeline_id, name, color, position) VALUES
    (NEW.workspace_id, NEW.id, 'Novo Lead', '#6B7280', 0),
    (NEW.workspace_id, NEW.id, 'Qualificação', '#F59E0B', 1),
    (NEW.workspace_id, NEW.id, 'Proposta', '#3B82F6', 2),
    (NEW.workspace_id, NEW.id, 'Negociação', '#8B5CF6', 3),
    (NEW.workspace_id, NEW.id, 'Fechado', '#10B981', 4);
  
  RETURN NEW;
END;
$function$;