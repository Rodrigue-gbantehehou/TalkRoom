import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageExpirySelector, type ExpiryDuration } from './MessageExpirySelector';
import { 
  ArrowLeft, 
  Send, 
  Users, 
  Share,
  Clock,
  Shield
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  senderName: string;
  senderId: string;
  timestamp: Date;
  expiryDuration: string;
  deleteAfterRead: boolean;
  expiresAt?: Date;
}

interface SimpleChatRoomProps {
  roomCode: string;
  roomName: string;
  currentUser: {
    id: string;
    username: string;
  };
  onBack: () => void;
  onCopyLink: () => void;
}

export function SimpleChatRoom({ 
  roomCode, 
  roomName, 
  currentUser, 
  onBack, 
  onCopyLink 
}: SimpleChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [expiryDuration, setExpiryDuration] = useState<ExpiryDuration>('1h');
  const [deleteAfterRead, setDeleteAfterRead] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les messages au démarrage
  useEffect(() => {
    loadMessages();
  }, [roomCode]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          expiresAt: msg.expiresAt ? new Date(msg.expiresAt) : undefined
        })));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomCode}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          senderId: currentUser.id,
          senderName: currentUser.username,
          expiryDuration,
          deleteAfterRead
        })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, {
          ...message,
          timestamp: new Date(message.timestamp),
          expiresAt: message.expiresAt ? new Date(message.expiresAt) : undefined
        }]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatExpiryTime = (duration: string) => {
    switch (duration) {
      case '15s': return '⏱️ 15s';
      case '1min': return '⏱️ 1min';
      case '5min': return '⏱️ 5min';
      case '1h': return '⏱️ 1h';
      case '24h': return '⏱️ 24h';
      default: return '⏱️ 1h';
    }
  };

  const getTimeRemaining = (expiresAt?: Date) => {
    if (!expiresAt) return '';
    const now = new Date();
    const remaining = expiresAt.getTime() - now.getTime();
    
    if (remaining <= 0) return 'Expiré';
    
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold">
              {roomName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="font-semibold text-gray-900">{roomName}</h2>
            <p className="text-sm text-gray-500">Room {roomCode}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            1 en ligne
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucun message</h3>
            <p>Soyez le premier à écrire dans cette room !</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === currentUser.id;
            const timeRemaining = getTimeRemaining(message.expiresAt);
            const isExpired = timeRemaining === 'Expiré';

            if (isExpired) return null; // Ne pas afficher les messages expirés

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all duration-200 ${
                    isOwnMessage
                      ? 'gradient-emerald-cyan text-white shadow-md'
                      : 'bg-white border shadow-sm hover:shadow-md'
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      {message.senderName}
                    </p>
                  )}
                  
                  <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                    {message.content}
                  </p>
                  
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>
                      {formatDistanceToNow(message.timestamp, { addSuffix: true, locale: fr })}
                    </span>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      {message.deleteAfterRead && (
                        <Shield className="w-3 h-3" />
                      )}
                      {timeRemaining && (
                        <span className="text-orange-400 font-medium">
                          {formatExpiryTime(message.expiryDuration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white">
        {/* Expiry Settings */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <MessageExpirySelector
            selectedDuration={expiryDuration}
            onDurationChange={setExpiryDuration}
            deleteAfterRead={deleteAfterRead}
            onDeleteAfterReadChange={setDeleteAfterRead}
          />
        </div>

        {/* Message Input */}
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                className="bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                disabled={isLoading}
                data-testid="input-message"
              />
            </div>
            
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="h-10 w-10 p-0 rounded-full gradient-emerald-cyan hover-gradient-emerald-cyan text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}