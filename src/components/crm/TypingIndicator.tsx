export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="message-bubble-received px-4 py-3 flex items-center gap-1">
        <span
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-typing-dot"
          style={{ animationDelay: '0s' }}
        />
        <span
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-typing-dot"
          style={{ animationDelay: '0.2s' }}
        />
        <span
          className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-typing-dot"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  );
}
