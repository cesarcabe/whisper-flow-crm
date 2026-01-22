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

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string | null;
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSave: () => Promise<void>;
}

export function EditClassDialog({
  open,
  onOpenChange,
  classId,
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
}: EditClassDialogProps) {
  const handleSave = async () => {
    if (classId) {
      await onSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Classe</DialogTitle>
          <DialogDescription>Altere o nome e cor da classe</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Nome</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-color">Cor</Label>
            <Input
              id="class-color"
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
