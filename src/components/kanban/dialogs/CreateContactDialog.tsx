import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

// Brazilian phone validation (accepts formats like +55 11 99999-9999)
const phoneSchema = z.string()
  .min(10, 'Telefone deve ter pelo menos 10 dígitos')
  .max(20, 'Telefone muito longo')
  .regex(/^[\d\s()+\-]+$/, 'Telefone inválido');

const nameSchema = z.string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome muito longo');

const emailSchema = z.string()
  .email('Email inválido')
  .optional()
  .or(z.literal(''));

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (contact: {
    name: string;
    phone: string;
    email: string | null;
    avatar_url: string | null;
    notes: string | null;
    status: 'active' | 'inactive' | 'blocked';
    tags: string[];
  }) => Promise<void>;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateContactDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      nameSchema.parse(name);
      phoneSchema.parse(phone);
      if (email) emailSchema.parse(email);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    await onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      avatar_url: null,
      notes: null,
      status: 'active',
      tags: [],
    });
    setIsLoading(false);
    setName('');
    setPhone('');
    setEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Nome</Label>
            <Input
              id="contact-name"
              placeholder="Nome do contato"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Telefone (WhatsApp)</Label>
            <Input
              id="contact-phone"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email (opcional)</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !phone.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Contato'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
