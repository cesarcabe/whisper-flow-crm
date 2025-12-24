import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MessageSquare, Loader2, AlertTriangle, RefreshCw, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useConversations } from '@/hooks/useConversations';
import { useContactClasses } from '@/hooks/useContactClasses';
import { usePipelines } from '@/hooks/usePipelines';
import { ConversationItem } from '@/components/whatsapp/ConversationItem';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { 
  ConversationFilters, 
  FilterState, 
  useConversationFilters 
} from '@/components/whatsapp/ConversationFilters';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function WhatsappConversations() {
  const { whatsappNumberId } = useParams<{ whatsappNumberId: string }>();
  const { workspace } = useWorkspace();
  const { conversations, loading, error, refetch } = useConversations(whatsappNumberId || null);
  const { contactClasses } = useContactClasses();
  const { activePipeline } = usePipelines();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    contactClassIds: [],
    stageIds: [],
  });

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

  return (
    <>
      <Helmet>
        <title>Conversas WhatsApp - {workspace?.name || 'CRM'}</title>
        <meta name="description" content="Gerencie suas conversas do WhatsApp." />
      </Helmet>

      <div className="h-screen flex bg-background">
        {/* Conversations Sidebar */}
        <div className="w-96 border-r bg-card flex flex-col flex-shrink-0">
          {/* Header com título "Mensagens" + botão + */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold text-foreground">Mensagens</h1>
            </div>
            <Button size="icon" className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>

          {/* Busca */}
          <div className="px-4 py-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          {/* Filtros (tipo + relacionamento/estágio) */}
          <ConversationFilters
            contactClasses={contactClasses}
            stages={stages}
            filters={filters}
            onFiltersChange={setFilters}
          />

          {/* Lista de conversas */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4">
              <Card className="border-destructive/50">
                <CardContent className="flex flex-col items-center gap-3 py-6">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <p className="text-sm text-destructive text-center">{error}</p>
                  <Button variant="outline" size="sm" onClick={refetch}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : displayedConversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">
                    {conversations.length === 0 ? 'Nenhuma conversa' : 'Nenhum resultado'}
                  </CardTitle>
                  <CardDescription>
                    {conversations.length === 0 
                      ? 'As conversas aparecerão aqui quando você receber mensagens.'
                      : 'Tente ajustar os filtros ou a busca.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              {displayedConversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={selectedConversationId === conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                />
              ))}
            </ScrollArea>
          )}
        </div>

        {/* Message Thread */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <MessageThread
              conversationId={selectedConversationId}
              contact={selectedConversation?.contact}
              isGroup={(selectedConversation as any)?.is_group}
            />
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
    </>
  );
}
