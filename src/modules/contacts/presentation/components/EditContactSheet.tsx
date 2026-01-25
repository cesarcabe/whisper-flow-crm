import { useState, useEffect } from 'react';
import { Contact, ContactStatus } from '@/core/domain/entities/Contact';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save
} from 'lucide-react';
import { toast } from 'sonner';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface EditContactSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactClasses: ContactClass[];
  groupClasses: ContactClass[];
  onSave: (contactId: string, updates: {
    name: string;
    email: string | null;
    notes: string | null;
    status: ContactStatus;
    contact_class_id: string | null;
    group_class_id: string | null;
  }) => Promise<boolean>;
}

export function EditContactSheet({
  contact,
  open,
  onOpenChange,
  contactClasses,
  groupClasses,
  onSave,
}: EditContactSheetProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ContactStatus>('active');
  const [contactClassId, setContactClassId] = useState<string | null>(null);
  const [groupClassId, setGroupClassId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync state when contact changes
  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email || '');
      setNotes(contact.notes || '');
      setStatus(contact.status);
      setContactClassId(contact.contactClassId);
      setGroupClassId(contact.groupClassId);
    }
  }, [contact]);

  if (!contact) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const success = await onSave(contact.id, {
        name: name.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        status,
        contact_class_id: contactClassId,
        group_class_id: groupClassId,
      });

      if (success) {
        toast.success('Contato atualizado!');
        onOpenChange(false);
      }
    } catch (err) {
      console.error('[EditContactSheet] Error saving:', err);
      toast.error('Erro ao salvar contato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="text-left">
          <SheetTitle>Editar Contato</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6 space-y-6">
          {/* Avatar and phone (read-only) */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={contact.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials(name || contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{contact.phone.format()}</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do contato"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContactStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactClass">Classe do Contato</Label>
              <Select 
                value={contactClassId || 'none'} 
                onValueChange={(v) => setContactClassId(v === 'none' ? null : v)}
              >
                <SelectTrigger id="contactClass">
                  <SelectValue placeholder="Selecione uma classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem classificação</SelectItem>
                  {contactClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: cls.color || '#6B7280' }}
                        />
                        {cls.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupClass">Classe do Grupo</Label>
              <Select 
                value={groupClassId || 'none'} 
                onValueChange={(v) => setGroupClassId(v === 'none' ? null : v)}
              >
                <SelectTrigger id="groupClass">
                  <SelectValue placeholder="Selecione uma classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem classificação</SelectItem>
                  {groupClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: cls.color || '#6B7280' }}
                        />
                        {cls.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre o contato..."
                rows={4}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
