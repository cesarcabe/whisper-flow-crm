import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import { ContactsFiltersState, ContactStatusFilter } from '../hooks/useContactsModule';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactsFiltersProps {
  filters: ContactsFiltersState;
  contactClasses: ContactClass[];
  groupClasses: ContactClass[];
  hasActiveFilters: boolean;
  onFilterChange: <K extends keyof ContactsFiltersState>(
    key: K,
    value: ContactsFiltersState[K]
  ) => void;
  onClearFilters: () => void;
}

const STATUS_OPTIONS: { value: ContactStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'blocked', label: 'Bloqueados' },
];

export function ContactsFilters({
  filters,
  contactClasses,
  groupClasses,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
}: ContactsFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="pl-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onFilterChange('search', '')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter selects */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFilterChange('status', value as ContactStatusFilter)}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Contact class filter */}
        <Select
          value={filters.contactClassId || 'all'}
          onValueChange={(value) => 
            onFilterChange('contactClassId', value === 'all' ? null : value)
          }
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Classificação" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Todas as classes</SelectItem>
            {contactClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                <div className="flex items-center gap-2">
                  {cls.color && (
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: cls.color }}
                    />
                  )}
                  {cls.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Group class filter */}
        {groupClasses.length > 0 && (
          <Select
            value={filters.groupClassId || 'all'}
            onValueChange={(value) =>
              onFilterChange('groupClassId', value === 'all' ? null : value)
            }
          >
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os grupos</SelectItem>
              {groupClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  <div className="flex items-center gap-2">
                    {cls.color && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cls.color }}
                      />
                    )}
                    {cls.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
