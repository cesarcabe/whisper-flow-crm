import { useEffect, useRef, useState } from 'react';
import { Message, Conversation } from '@/types/crm';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { mockMessages } from '@/data/mockData';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatViewProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
}

function DateSeparator({ date }: { date: Date }) {
  let label = format(date, "d 'de' MMMM", { locale: ptBR });
  if (isToday(date)) label = 'Hoje';
  else if (isYesterday(date)) label = 'Ontem';

  return (
    <div className="flex items-center justify-center my-4">
      <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

export function ChatView({ conversation, onBack, showBackButton = false }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading
    const timer = setTimeout(() => {
      setMessages(mockMessages[conversation.id] || []);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation.isTyping]);

  const handleSendMessage = (body: string) => {
    const newMessage: Message = {
      id: `new-${Date.now()}`,
      conversationId: conversation.id,
      body,
      type: 'text',
      status: 'sending',
      isOutgoing: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate status updates
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMessage.id ? { ...m, status: 'sent' } : m
        )
      );
    }, 500);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMessage.id ? { ...m, status: 'delivered' } : m
        )
      );
    }, 1500);
  };

  const renderMessages = () => {
    const elements: JSX.Element[] = [];
    let lastDate: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp);

      if (!lastDate || !isSameDay(lastDate, messageDate)) {
        elements.push(
          <DateSeparator key={`date-${message.id}`} date={messageDate} />
        );
        lastDate = messageDate;
      }

      elements.push(<MessageBubble key={message.id} message={message} />);
    });

    return elements;
  };

  return (
    <div className="flex flex-col h-full bg-chat-bg">
      <ChatHeader
        contact={conversation.contact}
        onBack={onBack}
        showBackButton={showBackButton}
      />

      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {renderMessages()}
            {conversation.isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
