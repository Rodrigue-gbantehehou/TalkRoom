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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="gradient-primary shadow-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/20 transition-all duration-200 rounded-lg sm:rounded-xl p-1.5 sm:p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{roomName}</h1>
              <div className="flex items-center space-x-2 sm:space-x-3 mt-1">
                <span className="font-mono bg-white/25 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold tracking-wider">{roomCode}</span>
                <Badge className="hidden sm:flex bg-white/20 text-white border-white/30 rounded-xl px-3 py-1">
                  <Users className="w-4 h-4 mr-1" />
                  2 participants
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="text-white hover:bg-white/20 transition-all duration-200 rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 font-semibold"
            data-testid="button-copy-link"
          >
            <Share className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 gradient-primary rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 shadow-xl">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3 text-gray-800 dark:text-gray-200 text-center">Conversation sécurisée</h3>
            <p className="text-center mb-4 sm:mb-6 max-w-xs sm:max-w-md text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Messages chiffrés qui disparaissent automatiquement
            </p>
            
            {/* Version desktop */}
            <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Chiffré</p>
              </div>
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Éphémère</p>
              </div>
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Privé</p>
              </div>
            </div>
            
            {/* Version mobile compacte */}
            <div className="sm:hidden flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                <Shield className="w-3 h-3 mr-1 text-green-500" />
                Sécurisé
              </span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1 text-blue-500" />
                Éphémère
              </span>
            </div>
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
                <Card 
                  className={`max-w-sm p-4 ${
                    isOwnMessage
                      ? 'gradient-primary text-white rounded-3xl rounded-br-lg shadow-lg' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-3xl rounded-bl-lg shadow-lg'
                  }`}
                  data-testid={`message-${message.id}`}
                >
                  <div className="space-y-2">
                    {!isOwnMessage && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs font-bold">
                            {message.senderName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {message.senderName}
                        </p>
                      </div>
                    )}
                    <p className={`${
                      isOwnMessage 
                        ? 'text-white' 
                        : 'text-gray-800 dark:text-gray-200'
                    } leading-relaxed`}>
                      {message.content}
                    </p>
                    <div className={`flex items-center space-x-2 text-xs ${
                      isOwnMessage 
                        ? 'text-white/80' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(message.timestamp, { locale: fr, addSuffix: true })}</span>
                      <span className="mx-1">•</span>
                      <span>{formatExpiryTime(message.expiryDuration)}</span>
                      {message.deleteAfterRead && (
                        <>
                          <span className="mx-1">•</span>
                          <span>🔒 Une fois</span>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 sm:p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-3 sm:space-y-4">
          {/* Masquer les paramètres d'expiration sur mobile pour plus d'aération */}
          <div className="hidden sm:block">
            <MessageExpirySelector
              selectedDuration={expiryDuration}
              onDurationChange={setExpiryDuration}
              deleteAfterRead={deleteAfterRead}
              onDeleteAfterReadChange={setDeleteAfterRead}
            />
          </div>
          
          <div className="flex space-x-2 sm:space-x-4">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-650 text-base sm:text-lg px-4 sm:px-6"
              disabled={isLoading}
              data-testid="input-message"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="h-12 w-12 sm:h-14 sm:w-14 gradient-primary hover:opacity-90 transition-all duration-200 transform hover:scale-105 rounded-xl sm:rounded-2xl shadow-xl"
              data-testid="button-send-message"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </Button>
          </div>
          
          {/* Paramètres d'expiration pour mobile - version compacte */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Expiration: {formatExpiryTime(expiryDuration)}</span>
              {deleteAfterRead && <span>🔒 Lecture unique</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}