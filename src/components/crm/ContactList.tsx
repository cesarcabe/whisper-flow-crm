import { useState } from 'react';
import { Search, Plus, Filter, MessageSquare } from 'lucide-react';
import { Conversation } from '@/types/crm';
import { ContactItem } from './ContactItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContactListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ContactList({
  conversations,
  activeConversationId,
  onSelectConversation,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contact.phone.includes(searchQuery);

    const matchesTag = !filterTag || conv.contact.tags.includes(filterTag);

    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(conversations.flatMap((c) => c.contact.tags))];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Mensagens</h1>
          </div>
          <Button size="icon" className="bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar contato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-4 py-2 rounded-lg',
              'bg-muted border-0 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          />
        </div>

        {/* Tag Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
          <Button
            variant={filterTag === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterTag(null)}
            className="flex-shrink-0 text-xs h-7"
          >
            Todos
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={filterTag === tag ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTag(tag === filterTag ? null : tag)}
              className="flex-shrink-0 text-xs h-7"
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Filter className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || filterTag
                ? 'Nenhum contato encontrado'
                : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ContactItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => onSelectConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
