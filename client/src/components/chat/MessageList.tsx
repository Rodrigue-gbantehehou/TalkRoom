import { useRef, useEffect, useState } from 'react';
import { Message } from '@/types/chat';
import { useChatContext } from '@/context/ChatContext';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Button } from '@/components/ui/button';
import { FaSmile, FaTrash } from 'react-icons/fa';
import { ImageModal } from '@/components/ui/image-modal';
import { useToast } from '@/hooks/use-toast';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function MessageList({ messages, currentUserId, onAddReaction, onDeleteMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState<{ url: string; messageId: string } | null>(null);
  const context = useChatContext();
  const { toast } = useToast();

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

  const handleImageClick = (url: string, messageId: string) => {
    setShowImageModal({ url, messageId });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé avec succès.",
      });
    }
  };

  return (
    <div 
      className="flex-1 bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-4 overflow-y-auto space-y-3 md:space-y-4 mb-3 md:mb-4 border border-white/10 max-h-[60vh] min-h-[400px] scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500/70" 
      data-testid="messages-container"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(168, 85, 247, 0.5) rgba(255, 255, 255, 0.1)'
      }}
    >
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
            <div className="ml-auto max-w-xs md:max-w-sm relative">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl rounded-tr-md p-3 md:p-4 shadow-lg">
                <div className="text-xs opacity-80 mb-1">
                  Vous • {formatTime(message.timestamp)}
                </div>
                {message.type === 'image' && message.imageUrl && (
                  <div className="mb-2 relative group">
                    <img 
                      src={message.imageUrl} 
                      alt="Image partagée" 
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(message.imageUrl!, message.id)}
                    />
                    <Button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0 transition-all opacity-0 group-hover:opacity-100"
                      title="Supprimer l'image"
                    >
                      <FaTrash className="text-xs" />
                    </Button>
                  </div>
                )}
                <div className="text-sm md:text-base">{message.content}</div>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <span key={index} className="bg-white/20 rounded-full px-2 py-1 text-xs">
                        {reaction.emoji} 1
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                  className="absolute -bottom-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full p-0 transition-colors"
                  title="Réagir"
                >
                  <FaSmile className="text-xs" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-xs md:max-w-sm relative">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-tl-md p-3 md:p-4 shadow-lg">
                <div className="text-xs text-white/70 mb-1">
                  {message.senderName} • {formatTime(message.timestamp)}
                </div>
                {message.type === 'image' && message.imageUrl && (
                  <div className="mb-2 relative group">
                    <img 
                      src={message.imageUrl} 
                      alt="Image partagée" 
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(message.imageUrl!, message.id)}
                    />
                    <Button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-0 transition-all opacity-0 group-hover:opacity-100"
                      title="Supprimer l'image"
                    >
                      <FaTrash className="text-xs" />
                    </Button>
                  </div>
                )}
                <div className="text-white text-sm md:text-base">{message.content}</div>
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <span key={index} className="bg-white/20 rounded-full px-2 py-1 text-xs">
                        {reaction.emoji} 1
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                  className="absolute -bottom-2 right-2 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full p-0 transition-colors"
                  title="Réagir"
                >
                  <FaSmile className="text-xs" />
                </Button>
              </div>
              {showEmojiPicker === message.id && (
                <div className="absolute bottom-0 left-0 z-50">
                  <EmojiPicker
                    isOpen={true}
                    onClose={() => setShowEmojiPicker(null)}
                    onEmojiSelect={(emoji) => {
                      onAddReaction(message.id, emoji);
                      setShowEmojiPicker(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />

      {/* Modal d'image */}
      {showImageModal && (
        <ImageModal
          isOpen={true}
          imageUrl={showImageModal.url}
          onClose={() => setShowImageModal(null)}
          onDelete={() => {
            handleDeleteMessage(showImageModal.messageId);
            setShowImageModal(null);
          }}
          canDelete={true}
        />
      )}
    </div>
  );
}
