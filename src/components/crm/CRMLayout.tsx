import { useState } from 'react';
import { Conversation } from '@/types/crm';
import { ContactList } from './ContactList';
import { ChatView } from './ChatView';
import { EmptyChat } from './EmptyChat';
import { mockConversations } from '@/data/mockData';
import { cn } from '@/lib/utils';

export function CRMLayout() {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations] = useState<Conversation[]>(mockConversations);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleBackToList = () => {
    setActiveConversation(null);
  };

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      {/* Contact List - Hidden on mobile when chat is open */}
      <div
        className={cn(
          'w-full md:w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border',
          'md:block',
          activeConversation ? 'hidden' : 'block'
        )}
      >
        <ContactList
          conversations={conversations}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat View - Full width on mobile, remaining space on desktop */}
      <div
        className={cn(
          'flex-1 min-w-0',
          'md:block',
          !activeConversation ? 'hidden md:block' : 'block'
        )}
      >
        {activeConversation ? (
          <ChatView
            conversation={activeConversation}
            onBack={handleBackToList}
            showBackButton={true}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
}
