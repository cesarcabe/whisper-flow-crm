import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pipeline } from '@/types/database';
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
import { Plus, Settings, Pencil, Trash2, LayoutGrid, MessageSquare, LogOut, User, Users } from 'lucide-react';
import { usePipelines } from '@/hooks/usePipelines';

interface PipelineHeaderProps {
  pipelines: Pipeline[];
  activePipeline: Pipeline | null;
  onSelectPipeline: (pipeline: Pipeline) => void;
  onCreatePipeline: () => void;
  onEditPipeline: () => void;
  onDeletePipeline: () => void;
  onViewChange: (view: 'kanban' | 'chat') => void;
  currentView: 'kanban' | 'chat';
  userName?: string;
  onSignOut: () => void;
}

export function PipelineHeader({
  pipelines,
  activePipeline,
  onSelectPipeline,
  onCreatePipeline,
  onEditPipeline,
  onDeletePipeline,
  onViewChange,
  currentView,
  userName,
  onSignOut,
}: PipelineHeaderProps) {
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
    onEditPipeline();
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 gap-4">
      {/* Left: Pipeline Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-lg hidden sm:block">CRM</span>
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />

        <Select
          value={activePipeline?.id || ''}
          onValueChange={(value) => {
            const pipeline = pipelines.find(p => p.id === value);
            if (pipeline) onSelectPipeline(pipeline);
          }}
        >
          <SelectTrigger className="w-[180px] border-0 bg-muted/50">
            <SelectValue placeholder="Selecione um pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: pipeline.color }}
                  />
                  {pipeline.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={onCreatePipeline}>
          <Plus className="h-4 w-4" />
        </Button>

        {activePipeline && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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

      {/* Center: View Toggle */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Button
          variant={currentView === 'kanban' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('kanban')}
          className="gap-2"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Kanban</span>
        </Button>
        <Button
          variant={currentView === 'chat' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('chat')}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Conversas</span>
        </Button>
      </div>

      {/* Right: User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate">
              {userName || 'Usuário'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/workspace/admin" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Gerenciar Equipe
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
