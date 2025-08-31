import { useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import { useChatContext } from '@/context/ChatContext';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 bg-muted/50 rounded-2xl p-4 overflow-y-auto space-y-4 mb-4" data-testid="messages-container">
      {messages.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <i className="fas fa-comments text-4xl mb-4 opacity-50"></i>
          <p>Aucun message pour le moment. Commencez la conversation !</p>
        </div>
      )}
      
      {messages.map((message) => (
        <div key={message.id} className="message-bubble animate-slide-in" data-testid={`message-${message.id}`}>
          {message.type === 'system' ? (
            <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mx-auto max-w-sm text-center">
              <div className="text-xs text-muted-foreground mb-1">
                Système • {formatTime(message.timestamp)}
              </div>
              <div className="text-sm">{message.content}</div>
            </div>
          ) : message.senderId === currentUserId ? (
            <div className="ml-auto max-w-xs">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md p-4">
                <div className="text-xs opacity-80 mb-1">
                  Vous • {formatTime(message.timestamp)}
                </div>
                <div>{message.content}</div>
              </div>
            </div>
          ) : (
            <div className="max-w-xs">
              <div className="bg-card border border-border rounded-2xl rounded-tl-md p-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {message.senderName} • {formatTime(message.timestamp)}
                </div>
                <div className="text-foreground">{message.content}</div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
