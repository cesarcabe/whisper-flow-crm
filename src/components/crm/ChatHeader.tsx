import { ArrowLeft, Phone, Video, MoreVertical, Search } from 'lucide-react';
import { Contact } from '@/types/crm';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatHeaderProps {
  contact: Contact;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatHeader({ contact, onBack, showBackButton = false }: ChatHeaderProps) {
  const lastSeenText = contact.isOnline
    ? 'Online'
    : contact.lastSeen
    ? `Visto há ${formatDistanceToNow(new Date(contact.lastSeen), { locale: ptBR })}`
    : 'Offline';

  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border">
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}
      
      <Avatar name={contact.name} isOnline={contact.isOnline} size="md" />
      
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate">{contact.name}</h2>
        <p className="text-xs text-muted-foreground">{lastSeenText}</p>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
          <Video className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
