import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type ConversationType = 'all' | 'direct' | 'group';

export interface FilterState {
  type: ConversationType;
  contactClassIds: string[];
  stageIds: string[];
}

interface ContactClass {
  id: string;
  name: string;
  color: string | null;
}

interface Stage {
  id: string;
  name: string;
  color: string | null;
}

interface ConversationFiltersProps {
  contactClasses: ContactClass[];
  stages: Stage[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function ConversationFilters({
  contactClasses,
  stages,
  filters,
  onFiltersChange,
}: ConversationFiltersProps) {
  const setContactClass = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, contactClassIds: [] });
    } else {
      onFiltersChange({ ...filters, contactClassIds: [value] });
    }
  };

  const setStage = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, stageIds: [] });
    } else {
      onFiltersChange({ ...filters, stageIds: [value] });
    }
  };

  const selectedContactClass = filters.contactClassIds[0] || 'all';
  const selectedStage = filters.stageIds[0] || 'all';

  return (
    <div className="px-4 py-2 border-b border-border/50">
      <div className="flex gap-2">
        {/* Dropdown Relacionamento */}
        <Select value={selectedContactClass} onValueChange={setContactClass}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Relacionamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Relacionamento</SelectItem>
            {contactClasses.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                <div className="flex items-center gap-2">
                  {cc.color && (
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: cc.color }} 
                    />
                  )}
                  {cc.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dropdown Estágios de Vendas */}
        <Select value={selectedStage} onValueChange={setStage}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Estágios de Vendas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estágios de Vendas</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                <div className="flex items-center gap-2">
                  {stage.color && (
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: stage.color }} 
                    />
                  )}
                  {stage.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Hook para aplicar filtros client-side
export function useConversationFilters<T extends { 
  is_group?: boolean | null; 
  contact?: { contact_class_id?: string | null } | null;
  stage_id?: string | null;
}>(
  conversations: T[], 
  filters: FilterState
): T[] {
  return useMemo(() => {
    let result = conversations;

    // Filtro por tipo (Diretas/Grupos)
    if (filters.type === 'direct') {
      result = result.filter(c => c.is_group !== true);
    } else if (filters.type === 'group') {
      result = result.filter(c => c.is_group === true);
    }

    // Filtro por Contact Class (Relacionamento)
    if (filters.contactClassIds.length > 0) {
      result = result.filter(c => 
        c.contact?.contact_class_id && 
        filters.contactClassIds.includes(c.contact.contact_class_id)
      );
    }

    // Filtro por Stage (Estágio de venda)
    if (filters.stageIds.length > 0) {
      result = result.filter(c => 
        c.stage_id && 
        filters.stageIds.includes(c.stage_id)
      );
    }

    return result;
  }, [conversations, filters]);
}
