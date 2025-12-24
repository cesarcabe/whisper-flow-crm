import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations, ConversationWithContact } from '@/hooks/useConversations';
import { useWhatsappNumbers } from '@/hooks/useWhatsappNumbers';
import { useContactClasses } from '@/hooks/useContactClasses';
import { usePipelines } from '@/hooks/usePipelines';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { ConversationItem } from '@/components/whatsapp/ConversationItem';
import { 
  ConversationFilters, 
  FilterState, 
  useConversationFilters 
} from '@/components/whatsapp/ConversationFilters';
import { cn } from '@/lib/utils';
import { Loader2, MessageSquare, AlertTriangle, RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CRMLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { numbers, loading: numbersLoading } = useWhatsappNumbers();
  const { contactClasses } = useContactClasses();
  const { activePipeline } = usePipelines();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    contactClassIds: [],
    stageIds: [],
  });

  // Read whatsapp number from URL query param
  const whatsappFromUrl = searchParams.get('whatsapp');
  
  // Set selected number from URL param when available
  useEffect(() => {
    if (whatsappFromUrl && numbers.length > 0) {
      const numberExists = numbers.some(n => n.id === whatsappFromUrl);
      if (numberExists) {
        setSelectedNumberId(whatsappFromUrl);
        // Clear the URL param after applying
        searchParams.delete('whatsapp');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [whatsappFromUrl, numbers, searchParams, setSearchParams]);

  // Auto-select first WhatsApp number if available
  const activeNumberId = selectedNumberId || (numbers.length > 0 ? numbers[0].id : null);
  
  const { conversations, loading, error, refetch } = useConversations(activeNumberId);
  
  // Get stages from active pipeline
  const stages = useMemo(() => {
    if (!activePipeline?.stages) return [];
    return activePipeline.stages.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    }));
  }, [activePipeline]);

  // Apply filters client-side
  const filteredConversations = useConversationFilters(conversations, filters);

  // Apply search filter
  const displayedConversations = useMemo(() => {
    if (!searchQuery.trim()) return filteredConversations;
    const query = searchQuery.toLowerCase();
    return filteredConversations.filter(c => 
      c.contact?.name?.toLowerCase().includes(query) ||
      c.contact?.phone?.toLowerCase().includes(query)
    );
  }, [filteredConversations, searchQuery]);
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  if (numbersLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (numbers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma conexão WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Configure uma conexão WhatsApp nas configurações do workspace para ver as conversas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-background overflow-hidden">
      {/* Conversations List */}
      <div
        className={cn(
          'w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border flex flex-col',
          'md:block',
          selectedConversationId ? 'hidden' : 'block'
        )}
      >
        {/* Header: Ícone + Mensagens + Seletor de Número + Seletor Todos/Diretas/Grupos */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Mensagens</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* WhatsApp Number Selector */}
            {numbers.length > 0 && (
              <Select value={activeNumberId || ''} onValueChange={setSelectedNumberId}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Conexão" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map((num) => (
                    <SelectItem key={num.id} value={num.id}>
                      {num.internal_name || num.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select 
              value={filters.type} 
              onValueChange={(value: 'all' | 'direct' | 'group') => 
                setFilters({ ...filters, type: value })
              }
            >
              <SelectTrigger className="h-8 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="direct">Diretas</SelectItem>
                <SelectItem value="group">Grupos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>
        </div>


        {/* Barra de Busca */}
        <div className="px-4 py-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Dropdowns: Relacionamento + Estágios de Vendas */}
        <ConversationFilters
          contactClasses={contactClasses}
          stages={stages}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Conversation List */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : displayedConversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {conversations.length === 0 ? 'Nenhuma conversa ainda' : 'Nenhum resultado'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {conversations.length === 0 
                  ? 'Envie ou receba uma mensagem no WhatsApp.'
                  : 'Tente ajustar os filtros ou a busca.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="flex flex-col">
                {displayedConversations.map(conversation => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={selectedConversationId === conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Message Thread */}
      <div
        className={cn(
          'flex-1 min-w-0 flex flex-col',
          'md:block',
          !selectedConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {selectedConversationId ? (
          <>
            {/* Back button for mobile */}
            <div className="md:hidden p-2 border-b flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setSelectedConversationId(null)}>
                ← Voltar
              </Button>
            </div>
            <MessageThread
              conversationId={selectedConversationId}
              contact={selectedConversation?.contact}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">Selecione uma conversa</h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa para ver as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
