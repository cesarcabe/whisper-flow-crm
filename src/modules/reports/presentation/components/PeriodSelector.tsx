/**
 * Period Selector Component
 * Allows users to select report date range
 */
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PeriodPreset } from '../../domain/entities/ReportFilter';

interface PeriodSelectorProps {
  periodPreset: PeriodPreset;
  onPeriodChange: (preset: PeriodPreset) => void;
  customDateRange: { start?: Date; end?: Date };
  onCustomDateChange: (range: { start?: Date; end?: Date }) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const periodLabels: Record<PeriodPreset, string> = {
  today: 'Hoje',
  '7days': 'Últimos 7 dias',
  '30days': 'Últimos 30 dias',
  thisMonth: 'Este mês',
  custom: 'Personalizado'
};

export function PeriodSelector({
  periodPreset,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
  onRefresh,
  isRefreshing
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={periodPreset} onValueChange={(v) => onPeriodChange(v as PeriodPreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecione o período" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(periodLabels).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {periodPreset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !customDateRange.start && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.start ? (
                  format(customDateRange.start, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Início</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.start}
                onSelect={(date) => onCustomDateChange({ ...customDateRange, start: date })}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !customDateRange.end && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.end ? (
                  format(customDateRange.end, 'dd/MM/yyyy', { locale: ptBR })
                ) : (
                  <span>Fim</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.end}
                onSelect={(date) => onCustomDateChange({ ...customDateRange, end: date })}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        title="Atualizar dados"
      >
        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </Button>
    </div>
  );
}
