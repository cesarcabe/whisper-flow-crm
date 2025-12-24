import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const hasActiveFilters = 
    filters.type !== 'all' || 
    filters.contactClassIds.length > 0 || 
    filters.stageIds.length > 0;

  const toggleContactClass = (classId: string) => {
    const newIds = filters.contactClassIds.includes(classId)
      ? filters.contactClassIds.filter(id => id !== classId)
      : [...filters.contactClassIds, classId];
    onFiltersChange({ ...filters, contactClassIds: newIds });
  };

  const toggleStage = (stageId: string) => {
    const newIds = filters.stageIds.includes(stageId)
      ? filters.stageIds.filter(id => id !== stageId)
      : [...filters.stageIds, stageId];
    onFiltersChange({ ...filters, stageIds: newIds });
  };

  const setType = (type: ConversationType) => {
    onFiltersChange({ ...filters, type });
  };

  const clearFilters = () => {
    onFiltersChange({ type: 'all', contactClassIds: [], stageIds: [] });
  };

  return (
    <div className="px-4 py-2 border-b border-border/50">
      {/* Filtros: Todos/Diretas/Grupos + Relacionamento + Estágio */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Filtro Tipo: Todos, Diretas, Grupos */}
        <Badge
          variant={filters.type === 'all' ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-xs px-3 py-1 transition-colors',
            filters.type === 'all' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-accent'
          )}
          onClick={() => setType('all')}
        >
          Todos
        </Badge>
        <Badge
          variant={filters.type === 'direct' ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-xs px-3 py-1 transition-colors',
            filters.type === 'direct' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-accent'
          )}
          onClick={() => setType('direct')}
        >
          Diretas
        </Badge>
        <Badge
          variant={filters.type === 'group' ? 'default' : 'outline'}
          className={cn(
            'cursor-pointer text-xs px-3 py-1 transition-colors',
            filters.type === 'group' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-accent'
          )}
          onClick={() => setType('group')}
        >
          Grupos
        </Badge>

        {/* Separador se houver filtros de relacionamento/estágio */}
        {(contactClasses.length > 0 || stages.length > 0) && (
          <div className="w-px h-5 bg-border self-center mx-1" />
        )}

        {/* Filtros de Relacionamento (Contact Classes) */}
        {contactClasses.map((cc) => (
          <Badge
            key={cc.id}
            variant={filters.contactClassIds.includes(cc.id) ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer text-xs px-3 py-1 transition-colors',
              filters.contactClassIds.includes(cc.id) 
                ? 'text-white' 
                : 'hover:bg-accent'
            )}
            style={{
              borderColor: cc.color || undefined,
              backgroundColor: filters.contactClassIds.includes(cc.id) 
                ? (cc.color || undefined) 
                : undefined,
            }}
            onClick={() => toggleContactClass(cc.id)}
          >
            {cc.name}
          </Badge>
        ))}

        {/* Filtros de Estágio (Stages) */}
        {stages.map((stage) => (
          <Badge
            key={stage.id}
            variant={filters.stageIds.includes(stage.id) ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer text-xs px-3 py-1 transition-colors',
              filters.stageIds.includes(stage.id) 
                ? 'text-white' 
                : 'hover:bg-accent'
            )}
            style={{
              borderColor: stage.color || undefined,
              backgroundColor: filters.stageIds.includes(stage.id) 
                ? (stage.color || undefined) 
                : undefined,
            }}
            onClick={() => toggleStage(stage.id)}
          >
            {stage.name}
          </Badge>
        ))}

        {/* Botão Limpar filtros */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground ml-1"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
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
