import { useState, useEffect } from 'react';
import { Loader2, Search, Forward } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ConversationItem {
  id: string;
  contact: {
    name: string;
    phone: string;
    avatar_url: string | null;
  } | null;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageBody: string;
  messageType: string;
  currentConversationId: string;
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  messageBody,
  messageType,
  currentConversationId,
}: ForwardMessageDialogProps) {
  const { workspaceId } = useWorkspace();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [forwarding, setForwarding] = useState<string | null>(null);

  // Fetch conversations when dialog opens
  useEffect(() => {
    if (!open || !workspaceId) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, contact:contacts(name, phone, avatar_url)')
          .eq('workspace_id', workspaceId)
          .neq('id', currentConversationId)
          .order('last_message_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setConversations((data || []) as unknown as ConversationItem[]);
      } catch (err) {
        console.error('[ForwardDialog] fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [open, workspaceId, currentConversationId]);

  // Filter conversations (exclude current one)
  const filteredConversations = conversations.filter(conv => {
    if (!search.trim()) return true;
    const name = conv.contact?.name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
  });

  const handleForward = async (targetConversationId: string) => {
    if (forwarding) return;
    
    setForwarding(targetConversationId);
    
    try {
      // Only forward text messages for now
      if (messageType !== 'text') {
        toast.error('Apenas mensagens de texto podem ser encaminhadas');
        return;
      }

      const forwardedText = `⤵️ Mensagem encaminhada\n\n${messageBody}`;

      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: targetConversationId,
          message: forwardedText,
        },
      });

      if (error || !data?.ok) {
        throw new Error(data?.message || 'Erro ao encaminhar');
      }

      toast.success('Mensagem encaminhada');
      onOpenChange(false);
    } catch (err: any) {
      console.error('[Forward] error:', err);
      toast.error('Erro ao encaminhar mensagem');
    } finally {
      setForwarding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Conversations list */}
          <ScrollArea className="h-[300px] -mx-6 px-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma conversa encontrada
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => {
                  const name = conv.contact?.name || 'Contato';
                  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const isForwarding = forwarding === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleForward(conv.id)}
                      disabled={!!forwarding}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                        "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.contact?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {conv.contact?.phone || 'Sem telefone'}
                        </p>
                      </div>
                      {isForwarding && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Message preview */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-xs text-muted-foreground mb-1">Mensagem:</p>
            <p className="line-clamp-2">
              {messageType === 'text' ? messageBody : `📎 ${messageType}`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
