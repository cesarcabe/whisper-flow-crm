import { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useForwardMessage } from '@/hooks/useForwardMessage';
import { getInitials } from '@/lib/normalize';

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
  const [search, setSearch] = useState('');

  const {
    conversations,
    loading,
    forwarding,
    forwardMessage,
    filterConversations,
  } = useForwardMessage({
    workspaceId,
    currentConversationId,
    isOpen: open,
  });

  const filteredConversations = useMemo(
    () => filterConversations(search),
    [filterConversations, search]
  );

  const handleForward = async (targetConversationId: string) => {
    const success = await forwardMessage(targetConversationId, messageBody, messageType);
    if (success) {
      onOpenChange(false);
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
                        <AvatarImage src={conv.contact?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(name)}
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
