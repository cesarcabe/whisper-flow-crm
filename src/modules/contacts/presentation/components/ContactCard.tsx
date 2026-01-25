import { Contact } from '@/core/domain/entities/Contact';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, MessageSquare, Eye, Trash2, Phone, Mail } from 'lucide-react';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactCardProps {
  contact: Contact;
  contactClasses: ContactClass[];
  onViewDetails: (contact: Contact) => void;
  onOpenChat: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactCard({
  contact,
  contactClasses,
  onViewDetails,
  onOpenChat,
  onDelete,
}: ContactCardProps) {
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

  const contactClass = getContactClass();

  const getStatusBadge = () => {
    switch (contact.status) {
      case 'active':
        return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativo</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Bloqueado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={contact.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">
                {contact.name}
              </h3>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                <span>{contact.phone.format()}</span>
              </div>
              {contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[200px]">{contact.email}</span>
                </div>
              )}
            </div>

            {contactClass && (
              <div className="pt-1">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: contactClass.color || undefined,
                    color: contactClass.color || undefined,
                  }}
                >
                  {contactClass.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => onOpenChat(contact)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => onViewDetails(contact)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenChat(contact)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Abrir conversa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(contact)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
