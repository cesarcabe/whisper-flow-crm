import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWhatsappConnection } from '@/hooks/useWhatsappConnection';

interface CreateWhatsappDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (whatsappNumberId: string) => void;
  connection?: ReturnType<typeof useWhatsappConnection>;
}

export function CreateWhatsappDialog({ open, onOpenChange, onCreated, connection }: CreateWhatsappDialogProps) {
  const [internalName, setInternalName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { creating, createInstance, error, setError } = connection ?? useWhatsappConnection();

  const handleCreate = async () => {
    if (!internalName.trim()) {
      setError('Digite um nome para a conexão');
      return;
    }

    const result = await createInstance(internalName.trim(), phoneNumber.trim() || undefined);
    
    if (result.ok && result.whatsapp_number_id) {
      setInternalName('');
      setPhoneNumber('');
      onCreated(result.whatsapp_number_id);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!creating) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setInternalName('');
        setPhoneNumber('');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar novo WhatsApp</DialogTitle>
          <DialogDescription>
            Crie uma nova conexão WhatsApp para receber e enviar mensagens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="internalName">Nome da conexão *</Label>
            <Input
              id="internalName"
              placeholder="Ex: Atendimento, Vendas, Suporte..."
              value={internalName}
              onChange={(e) => setInternalName(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Número do telefone (opcional)</Label>
            <Input
              id="phoneNumber"
              placeholder="Ex: +5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={creating}
            />
            <p className="text-xs text-muted-foreground">
              Se informado, será usado para identificar a conexão.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={creating || !internalName.trim()}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar e conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
