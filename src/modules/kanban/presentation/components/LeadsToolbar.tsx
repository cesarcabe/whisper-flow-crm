import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, TrendingUp, UsersRound, Plus, Settings, Pencil, Trash2 } from 'lucide-react';
import { BoardViewType } from '@/types/ui';
import { Tables } from '@/integrations/supabase/types';
import { usePipelines } from '@/hooks/usePipelines';

type Pipeline = Tables<'pipelines'>;

interface LeadsToolbarProps {
  // Board type
  boardType: BoardViewType;
  onBoardTypeChange: (type: BoardViewType) => void;
  // Pipeline
  pipelines: Pipeline[];
  activePipeline: Pipeline | null;
  onSelectPipeline: (pipeline: Pipeline) => void;
  onCreatePipeline: () => void;
  onDeletePipeline: () => void;
}

export function LeadsToolbar({
  boardType,
  onBoardTypeChange,
  pipelines,
  activePipeline,
  onSelectPipeline,
  onCreatePipeline,
  onDeletePipeline,
}: LeadsToolbarProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { updatePipeline } = usePipelines();

  const handleOpenEditDialog = () => {
    if (activePipeline) {
      setEditName(activePipeline.name);
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!activePipeline || !editName.trim()) return;
    setIsSaving(true);
    await updatePipeline(activePipeline.id, { name: editName.trim() });
    setIsSaving(false);
    setEditDialogOpen(false);
  };

  return (
    <>
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card">
        {/* Board Type Selector */}
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pipeline Selector - only visible when in stage view */}
        {boardType === 'stage' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Pipeline:</span>
            <Select
              value={activePipeline?.id || ''}
              onValueChange={(value) => {
                const pipeline = pipelines.find(p => p.id === value);
                if (pipeline) onSelectPipeline(pipeline);
              }}
            >
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pipeline.color || 'hsl(var(--primary))' }}
                      />
                      {pipeline.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreatePipeline}>
              <Plus className="h-4 w-4" />
            </Button>

            {activePipeline && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenEditDialog}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar Pipeline
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDeletePipeline} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Pipeline
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Edit Pipeline Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Nome</Label>
              <Input
                id="pipeline-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do pipeline"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
