import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

interface EditStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string | null;
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSave: () => Promise<void>;
}

export function EditStageDialog({
  open,
  onOpenChange,
  stageId,
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
}: EditStageDialogProps) {
  const handleSave = async () => {
    if (stageId) {
      await onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Estágio</DialogTitle>
          <DialogDescription>Altere o nome e cor do estágio</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-color">Cor</Label>
            <Input
              id="stage-color"
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-10 w-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
