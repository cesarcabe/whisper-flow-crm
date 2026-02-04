import { Package, ShoppingBag, Stethoscope, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BUSINESS_TYPES, 
  type BusinessTypeValue 
} from '@/core/domain/value-objects/BusinessType';

interface BusinessTypeSelectorProps {
  value: BusinessTypeValue | null;
  onChange: (type: BusinessTypeValue) => void;
  disabled?: boolean;
}

const ICONS: Record<BusinessTypeValue, React.ReactNode> = {
  wholesale_clothing: <Package className="h-8 w-8" />,
  retail_clothing: <ShoppingBag className="h-8 w-8" />,
  clinic: <Stethoscope className="h-8 w-8" />,
  other: <Building2 className="h-8 w-8" />,
};

export function BusinessTypeSelector({ value, onChange, disabled }: BusinessTypeSelectorProps) {
  const types = Object.values(BUSINESS_TYPES);

  return (
    <div className="grid grid-cols-2 gap-3">
      {types.map((type) => {
        const isSelected = value === type.value;
        
        return (
          <button
            key={type.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.value)}
            className={cn(
              'relative flex flex-col items-center gap-3 rounded-lg border-2 p-4 text-center transition-all',
              'hover:border-primary/50 hover:bg-accent/50',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground'
            )}
          >
            <div className={cn(
              'rounded-full p-3',
              isSelected ? 'bg-primary/10' : 'bg-muted'
            )}>
              {ICONS[type.value]}
            </div>
            <div className="space-y-1">
              <p className={cn(
                'font-medium text-sm',
                isSelected ? 'text-primary' : 'text-foreground'
              )}>
                {type.label}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {type.description}
              </p>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
