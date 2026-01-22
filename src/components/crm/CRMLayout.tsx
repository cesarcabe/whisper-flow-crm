import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConversations, type LegacyConversationWithContact } from '@/modules/conversation/presentation/hooks/useConversations';
import { useWhatsappNumbers } from '@/hooks/useWhatsappNumbers';
import { useContactClasses } from '@/hooks/useContactClasses';
import { usePipelines } from '@/hooks/usePipelines';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { ConversationItem } from '@/components/whatsapp/ConversationItem';
import { NewConversationDialog } from '@/components/whatsapp/NewConversationDialog';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export function CRMLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { numbers, loading: numbersLoading } = useWhatsappNumbers();
  const { contactClasses } = useContactClasses();
  const { activePipeline } = usePipelines();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'direct',
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
  
  // Get active number status
  const activeNumber = useMemo(() => 
    numbers.find(n => n.id === activeNumberId), 
    [numbers, activeNumberId]
  );
  const connectionStatus = useMemo(() => {
    if (!activeNumber) return 'unknown';
    return activeNumber.status === 'connected' ? 'connected' : 'disconnected';
  }, [activeNumber]) as 'connected' | 'disconnected' | 'unknown';
  
  const { conversations, loading, error, refetch } = useConversations(activeNumberId);

  const handleNewConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    refetch();
  };
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
  
  const selectedConversation = (conversations as LegacyConversationWithContact[]).find(c => c.id === selectedConversationId);

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
    <div className="h-full w-full min-h-0 bg-background overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Conversations List Panel */}
        <ResizablePanel 
          defaultSize={30} 
          minSize={20} 
          maxSize={50}
          className={cn(
            'flex flex-col min-h-0 overflow-hidden',
            selectedConversationId ? 'hidden md:flex' : 'flex'
          )}
        >
          <div className="h-full flex flex-col border-r border-border">
            {/* Header: Ícone + Mensagens + Seletor de Número + Seletor Todos/Diretas/Grupos */}
            <div className="px-3 py-3 border-b border-border flex flex-col gap-2 flex-shrink-0">
              {/* Row 1: Title + New button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h1 className="text-lg font-semibold text-foreground truncate">Mensagens</h1>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                      onClick={() => setNewConversationOpen(true)}
                      disabled={!activeNumberId || connectionStatus !== 'connected'}
                    >
                      <Plus className="h-4 w-4 text-primary-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!activeNumberId 
                      ? 'Selecione uma conexão' 
                      : connectionStatus !== 'connected' 
                        ? 'Conexão inativa' 
                        : 'Nova conversa'}
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Row 2: Selectors - stacked on mobile, inline on larger screens */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
                {/* WhatsApp Number Selector */}
                {numbers.length > 0 && (
                  <Select value={activeNumberId || ''} onValueChange={setSelectedNumberId}>
                    <SelectTrigger className="h-8 text-xs flex-1 xs:w-[140px] xs:flex-none">
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
                  onValueChange={(value: 'all' | 'direct' | 'group') => setFilters({ ...filters, type: value })}
                >
                  <SelectTrigger className="h-8 text-xs flex-1 xs:w-[100px] xs:flex-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="direct">Diretas</SelectItem>
                    <SelectItem value="group">Grupos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Barra de Busca */}
            <div className="px-4 py-2 border-b border-border/50 flex-shrink-0">
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
            <div className="flex-shrink-0">
              <ConversationFilters
                contactClasses={contactClasses}
                stages={stages}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>

            {/* Conversation List */}
            {loading ? (
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
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
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
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
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="flex flex-col min-w-0">
                    {displayedConversations.map((conversation) => (
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
        </ResizablePanel>

        {/* Resizable Handle - only visible on desktop */}
        <ResizableHandle withHandle className="hidden md:flex" />

        {/* Message Thread Panel */}
        <ResizablePanel 
          defaultSize={70}
          className={cn(
            'flex flex-col min-h-0 overflow-hidden',
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
                contact={selectedConversation?.contact as any} 
                connectionStatus={connectionStatus}
                currentStageId={selectedConversation?.stage_id}
              />
            </>
          ) : (
            <div className="flex-1 min-h-0 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">Selecione uma conversa</h3>
                <p className="text-sm text-muted-foreground">Escolha uma conversa para ver as mensagens</p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        whatsappNumberId={activeNumberId}
        onConversationCreated={handleNewConversationCreated}
      />
    </div>
  );
}
