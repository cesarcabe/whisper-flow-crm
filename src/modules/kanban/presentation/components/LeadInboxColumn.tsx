import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LeadInboxStage, ConversationWithStage } from '@/hooks/useConversationStages';
import { StageCard } from './StageCard';
import { Inbox } from 'lucide-react';

interface LeadInboxColumnProps {
  leadInbox: LeadInboxStage;
  onConversationClick: (conversation: ConversationWithStage) => void;
}

export function LeadInboxColumn({
  leadInbox,
  onConversationClick,
}: LeadInboxColumnProps) {
  // Lead inbox is not a drop target - contacts must be dragged TO stages
  const { setNodeRef, isOver } = useDroppable({
    id: leadInbox.id,
    disabled: true, // Cannot drop items back to lead inbox
  });

  return (
    <div
      className={`flex-shrink-0 w-72 bg-[hsl(var(--lead-inbox))]/10 border border-dashed border-[hsl(var(--lead-inbox))]/30 rounded-xl flex flex-col max-h-[calc(100vh-200px)] transition-colors ${
        isOver ? 'bg-accent/50' : ''
      }`}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-[hsl(var(--lead-inbox))]/20">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-[hsl(var(--lead-inbox))]" />
          <h3 className="font-semibold text-sm text-[hsl(var(--lead-inbox))]">{leadInbox.name}</h3>
          <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
            {leadInbox.conversations.length}
          </span>
        </div>
      </div>

      {/* Conversations Container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin min-h-[100px]"
      >
        <SortableContext
          items={leadInbox.conversations.map(c => c.contact_id)}
          strategy={verticalListSortingStrategy}
        >
          {leadInbox.conversations.map((conversation) => (
            <StageCard
              key={conversation.contact_id}
              conversation={conversation}
              onClick={() => onConversationClick(conversation)}
            />
          ))}
        </SortableContext>

        {leadInbox.conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum lead novo
          </div>
        )}
      </div>
    </div>
  );
}
