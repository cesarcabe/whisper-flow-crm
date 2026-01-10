import { Button } from '@/components/ui/button';
import { Users, TrendingUp, UsersRound } from 'lucide-react';
import { BoardViewType } from '@/types/database';

interface BoardTypeSelectorProps {
  boardType: BoardViewType;
  onBoardTypeChange: (type: BoardViewType) => void;
}

export function BoardTypeSelector({ boardType, onBoardTypeChange }: BoardTypeSelectorProps) {
  return (
    <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-2">Visualizar:</span>
      <Button
        variant={boardType === 'relationship' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onBoardTypeChange('relationship')}
        className="gap-2"
      >
        <Users className="h-4 w-4" />
        Relacionamento
      </Button>
      <Button
        variant={boardType === 'stage' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onBoardTypeChange('stage')}
        className="gap-2"
      >
        <TrendingUp className="h-4 w-4" />
        Estágios de Venda
      </Button>
      <Button
        variant={boardType === 'groups' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onBoardTypeChange('groups')}
        className="gap-2"
      >
        <UsersRound className="h-4 w-4" />
        Grupos
      </Button>
    </div>
  );
}
