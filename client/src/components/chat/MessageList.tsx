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
    <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-4 overflow-y-auto space-y-3 md:space-y-4 mb-3 md:mb-4 border border-white/10" data-testid="messages-container">
      {messages.length === 0 && (
        <div className="text-center text-white/70 py-8">
          <i className="fas fa-comments text-4xl mb-4 opacity-50"></i>
          <p>Aucun message pour le moment. Commencez la conversation !</p>
        </div>
      )}
      
      {messages.map((message) => (
        <div key={message.id} className="message-bubble animate-slide-in" data-testid={`message-${message.id}`}>
          {message.type === 'system' ? (
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 mx-auto max-w-sm text-center">
              <div className="text-xs text-yellow-200 mb-1">
                Système • {formatTime(message.timestamp)}
              </div>
              <div className="text-sm text-yellow-100">{message.content}</div>
            </div>
          ) : message.senderId === currentUserId ? (
            <div className="ml-auto max-w-xs md:max-w-sm">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-md p-3 md:p-4 shadow-lg">
                <div className="text-xs opacity-80 mb-1">
                  Vous • {formatTime(message.timestamp)}
                </div>
                <div className="text-sm md:text-base">{message.content}</div>
              </div>
            </div>
          ) : (
            <div className="max-w-xs md:max-w-sm">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-md p-3 md:p-4 shadow-lg">
                <div className="text-xs text-white/70 mb-1">
                  {message.senderName} • {formatTime(message.timestamp)}
                </div>
                <div className="text-white text-sm md:text-base">{message.content}</div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
