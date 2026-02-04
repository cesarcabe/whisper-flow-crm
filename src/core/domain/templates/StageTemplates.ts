import { BusinessTypeValue } from '../value-objects/BusinessType';

/**
 * Stage Template - defines the structure of a stage before creation
 */
export interface StageTemplate {
  name: string;
  color: string;
  position: number;
}

/**
 * Stage templates by business type
 * These are the default stages created when a new pipeline is added
 */
export const STAGE_TEMPLATES: Record<BusinessTypeValue, StageTemplate[]> = {
  wholesale_clothing: [
    { name: 'Novo Lead', color: '#6B7280', position: 0 },
    { name: 'Qualificação', color: '#F59E0B', position: 1 },
    { name: 'Catálogo Enviado', color: '#3B82F6', position: 2 },
    { name: 'Negociação', color: '#8B5CF6', position: 3 },
    { name: 'Pedido Fechado', color: '#06B6D4', position: 4 },
    { name: 'Venda Realizada', color: '#10B981', position: 5 },
  ],
  retail_clothing: [
    { name: 'Novo Lead', color: '#6B7280', position: 0 },
    { name: 'Interesse', color: '#F59E0B', position: 1 },
    { name: 'Atendimento', color: '#3B82F6', position: 2 },
    { name: 'Pedido Escolhido', color: '#8B5CF6', position: 3 },
    { name: 'Venda Realizada', color: '#10B981', position: 4 },
  ],
  clinic: [
    { name: 'Novo Lead', color: '#6B7280', position: 0 },
    { name: 'Triagem', color: '#F59E0B', position: 1 },
    { name: 'Agendamento', color: '#3B82F6', position: 2 },
    { name: 'Consulta', color: '#8B5CF6', position: 3 },
    { name: 'Retorno', color: '#10B981', position: 4 },
  ],
  other: [
    { name: 'Novo Lead', color: '#6B7280', position: 0 },
    { name: 'Qualificação', color: '#F59E0B', position: 1 },
    { name: 'Proposta', color: '#3B82F6', position: 2 },
    { name: 'Negociação', color: '#8B5CF6', position: 3 },
    { name: 'Fechado', color: '#10B981', position: 4 },
  ],
};

/**
 * Get stage templates for a specific business type
 */
export function getStageTemplates(businessType: BusinessTypeValue | null | undefined): StageTemplate[] {
  if (!businessType || !(businessType in STAGE_TEMPLATES)) {
    return STAGE_TEMPLATES.other;
  }
  return STAGE_TEMPLATES[businessType];
}

/**
 * Get the first stage name (entry stage) for a business type
 */
export function getEntryStage(businessType: BusinessTypeValue | null | undefined): StageTemplate {
  const templates = getStageTemplates(businessType);
  return templates[0];
}

/**
 * Get the last stage name (completion stage) for a business type
 */
export function getCompletionStage(businessType: BusinessTypeValue | null | undefined): StageTemplate {
  const templates = getStageTemplates(businessType);
  return templates[templates.length - 1];
}
