import { MessageSquare, Lock, Zap } from 'lucide-react';

export function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-chat-bg text-center p-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-primary" />
      </div>
      
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        CRM WhatsApp
      </h2>
      
      <p className="text-muted-foreground max-w-md mb-8">
        Selecione uma conversa para começar a enviar mensagens ou inicie uma nova conversa com um contato.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span>Mensagens criptografadas</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>Respostas em tempo real</span>
        </div>
      </div>
    </div>
  );
}
