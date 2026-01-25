import { Contact } from '@/core/domain/entities/Contact';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Phone, Mail, Calendar, Clock, Tag, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactDetailsSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactClasses: ContactClass[];
  groupClasses: ContactClass[];
  onOpenChat: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
}

export function ContactDetailsSheet({
  contact,
  open,
  onOpenChange,
  contactClasses,
  groupClasses,
  onOpenChat,
  onEdit,
}: ContactDetailsSheetProps) {
  if (!contact) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getContactClass = () => {
    if (!contact.contactClassId) return null;
    return contactClasses.find((c) => c.id === contact.contactClassId);
  };

  const getGroupClass = () => {
    if (!contact.groupClassId) return null;
    return groupClasses.find((c) => c.id === contact.groupClassId);
  };

  const contactClass = getContactClass();
  const groupClass = getGroupClass();

  const getStatusBadge = () => {
    switch (contact.status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativo</Badge>;
      case 'blocked':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Bloqueado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Detalhes do Contato</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Header with avatar and name */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={contact.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-foreground truncate">
                {contact.name}
              </h2>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>
          </div>

          <Separator />

          {/* Contact info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Informações
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium text-foreground">
                    {contact.phone.format()}
                  </p>
                </div>
              </div>

              {contact.email && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">
                      {contact.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(contact.createdAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última atualização</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(contact.updatedAt, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Classifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Classificações
            </h3>

            <div className="flex flex-wrap gap-2">
              {contactClass ? (
                <Badge
                  variant="outline"
                  className="gap-1.5"
                  style={{
                    borderColor: contactClass.color || undefined,
                    color: contactClass.color || undefined,
                  }}
                >
                  <Tag className="h-3 w-3" />
                  {contactClass.name}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Sem classificação</span>
              )}

              {groupClass && (
                <Badge
                  variant="outline"
                  className="gap-1.5"
                  style={{
                    borderColor: groupClass.color || undefined,
                    color: groupClass.color || undefined,
                  }}
                >
                  <Tag className="h-3 w-3" />
                  {groupClass.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Notas
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1 gap-2" 
              onClick={() => {
                onOpenChat(contact);
                onOpenChange(false);
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Iniciar Conversa
            </Button>
            {onEdit && (
              <Button 
                variant="outline"
                className="gap-2" 
                onClick={() => {
                  onEdit(contact);
                  onOpenChange(false);
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
