import { Contact } from '@/core/domain/entities/Contact';
import { ContactCard } from './ContactCard';
import { Loader2, Users } from 'lucide-react';

interface ContactClass {
  id: string;
  name: string;
  color?: string | null;
}

interface ContactsListProps {
  contacts: Contact[];
  contactClasses: ContactClass[];
  loading: boolean;
  onViewDetails: (contact: Contact) => void;
  onOpenChat: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactsList({
  contacts,
  contactClasses,
  loading,
  onViewDetails,
  onOpenChat,
  onDelete,
}: ContactsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          Nenhum contato encontrado
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ajuste os filtros ou adicione novos contatos para vê-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
      {contacts.map((contact) => (
        <ContactCard
          key={contact.id}
          contact={contact}
          contactClasses={contactClasses}
          onViewDetails={onViewDetails}
          onOpenChat={onOpenChat}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
