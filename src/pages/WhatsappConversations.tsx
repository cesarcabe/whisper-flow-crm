import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MessageSquare, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversations } from '@/hooks/useConversations';
import { ConversationItem } from '@/components/whatsapp/ConversationItem';
import { MessageThread } from '@/components/whatsapp/MessageThread';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function WhatsappConversations() {
  const { whatsappNumberId } = useParams<{ whatsappNumberId: string }>();
  const { workspace } = useWorkspace();
  const { conversations, loading, error, refetch } = useConversations(whatsappNumberId || null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <>
      <Helmet>
        <title>Conversas WhatsApp - {workspace?.name || 'CRM'}</title>
        <meta name="description" content="Gerencie suas conversas do WhatsApp." />
      </Helmet>

      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm flex-shrink-0">
          <div className="container max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/workspace/admin">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Conversas WhatsApp
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {conversations.length} conversas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r bg-card flex flex-col flex-shrink-0">
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
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">Nenhuma conversa</CardTitle>
                    <CardDescription>
                      As conversas aparecerão aqui quando você receber mensagens.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                {conversations.map(conversation => (
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
      </div>
    </>
  );
}
