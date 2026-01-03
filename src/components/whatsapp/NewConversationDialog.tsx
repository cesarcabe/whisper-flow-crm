import { useState, useCallback, useMemo } from 'react';
import { Loader2, Search, UserPlus, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useContacts } from '@/hooks/useContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumberId: string | null;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationDialog({ 
  open, 
  onOpenChange, 
  whatsappNumberId,
  onConversationCreated 
}: NewConversationDialogProps) {
  const { contacts, loading: contactsLoading } = useContacts();
  const { workspaceId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleSelectContact = useCallback(async (contactId: string, contactPhone: string) => {
    if (!whatsappNumberId || !workspaceId) {
      toast.error('Selecione uma conexão WhatsApp ativa');
      return;
    }

    setCreating(true);

    try {
      // Check if conversation already exists
      const { data: existingConv, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('whatsapp_number_id', whatsappNumberId)
        .maybeSingle();

      if (checkError) {
        console.error('[NewConversation] check_error', checkError);
        throw new Error('Erro ao verificar conversa existente');
      }

      if (existingConv) {
        toast.info('Conversa já existe');
        onConversationCreated(existingConv.id);
        onOpenChange(false);
        return;
      }

      // Format remote_jid from phone number
      const cleanPhone = contactPhone.replace(/\D/g, '');
      const remoteJid = `${cleanPhone}@s.whatsapp.net`;

      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contactId,
          whatsapp_number_id: whatsappNumberId,
          workspace_id: workspaceId,
          remote_jid: remoteJid,
          is_group: false,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[NewConversation] create_error', createError);
        throw new Error('Erro ao criar conversa');
      }

      toast.success('Conversa criada!');
      onConversationCreated(newConv.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error('[NewConversation] error', err);
      toast.error(err.message || 'Erro ao criar conversa');
    } finally {
      setCreating(false);
    }
  }, [whatsappNumberId, workspaceId, onConversationCreated, onOpenChange]);

  const handleClose = () => {
    if (!creating) {
      setSearchQuery('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Selecione um contato para iniciar uma conversa.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar contato..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={creating}
          />
        </div>

        {/* Contacts list */}
        <div className="border rounded-md">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {contacts.length === 0 
                  ? 'Nenhum contato cadastrado'
                  : 'Nenhum contato encontrado'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="divide-y">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact.id, contact.phone)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {contact.name?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
                    </div>
                    {creating && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
