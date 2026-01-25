import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    name: string;
    phone?: string;
    email?: string | null;
    tags?: string[];
    notes?: string | null;
    contact_class_id?: string | null;
  } | null;
  contactClasses: ContactClass[];
  onEdit?: () => void;
}

export function ContactDetailsDialog({
  open,
  onOpenChange,
  contact,
  contactClasses,
  onEdit,
}: ContactDetailsDialogProps) {
  const getClassName = () => {
    if (!contact?.contact_class_id) return 'Sem classificação';
    return contactClasses.find((c) => c.id === contact.contact_class_id)?.name || 'Sem classificação';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do Contato</DialogTitle>
        </DialogHeader>
        {contact && (
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Nome</Label>
              <p className="font-medium">{contact.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Telefone</Label>
              <p className="font-medium">{contact.phone || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{contact.email || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tags</Label>
              <p className="font-medium">
                {contact.tags && contact.tags.length > 0
                  ? contact.tags.join(', ')
                  : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Notas</Label>
              <p className="font-medium">{contact.notes || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Classe</Label>
              <p className="font-medium">{getClassName()}</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          {onEdit && (
            <Button variant="outline" onClick={onEdit} className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
