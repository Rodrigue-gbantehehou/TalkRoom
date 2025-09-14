import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Copy, Clock, Trash2, Users, Share, Shield } from 'lucide-react';
import { authService } from '@/lib/auth';
import { API_URL } from '@/config';
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
  const [expiryDuration, setExpiryDuration] = useState<string>('1h');
  const [deleteAfterRead, setDeleteAfterRead] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Charger les messages au démarrage et initialiser WebSocket
  useEffect(() => {
    loadMessages();
    initializeWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomCode]);

  const initializeWebSocket = () => {
    try {
      const wsUrl = `ws://127.0.0.1:3000/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connecté');
        setIsConnected(true);
        
        // Rejoindre la room
        ws.send(JSON.stringify({
          type: 'join_room',
          userId: currentUser.id,
          username: currentUser.username,
          roomId: roomCode
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'message_received') {
            const message = data.message;
            const newMsg = {
              id: message.id,
              content: message.content,
              senderName: message.senderName || 'Utilisateur',
              senderId: message.userId,
              timestamp: new Date(message.timestamp),
              expiryDuration: message.expiryDuration || '1h',
              deleteAfterRead: message.deleteAfterRead || false,
              expiresAt: message.expiresAt ? new Date(message.expiresAt) : undefined
            };
            
            setMessages(prev => {
              // Éviter les doublons
              const exists = prev.find(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
          }
        } catch (error) {
          console.error('Erreur parsing message WebSocket:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket déconnecté');
        setIsConnected(false);
        
        // Tentative de reconnexion après 3 secondes
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            initializeWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Erreur initialisation WebSocket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomCode}/messages`, {
        headers: authService.getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          expiresAt: msg.expiresAt ? new Date(msg.expiresAt) : undefined
        })));
      } else {
        console.error('Erreur chargement messages:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return;

    console.log('Envoi message:', newMessage.trim());
    setIsLoading(true);
    
    try {
      // Utiliser WebSocket si connecté, sinon fallback HTTP
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Envoi via WebSocket pour temps réel
        wsRef.current.send(JSON.stringify({
          type: 'broadcast_message',
          content: newMessage.trim()
        }));
        
        setNewMessage('');
      } else {
        // Fallback HTTP si WebSocket non disponible
        const response = await fetch(`${API_URL}/api/rooms/${roomCode}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authService.getAuthHeaders()
          },
          body: JSON.stringify({
            content: newMessage.trim()
          })
        });

        if (response.ok) {
          const message = await response.json();
          
          if (message && message.id && message.content) {
            const newMsg = {
              id: message.id,
              content: message.content,
              senderName: message.senderName || currentUser.username,
              senderId: message.senderId || currentUser.id,
              timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
              expiryDuration: message.expiryDuration || '1h',
              deleteAfterRead: message.deleteAfterRead || false,
              expiresAt: message.expiresAt ? new Date(message.expiresAt) : undefined
            };
            
            setMessages(prev => {
              const exists = prev.find(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            setNewMessage('');
          }
        } else {
          console.error('Erreur réponse serveur:', response.status, await response.text());
        }
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 glass border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-white hover:bg-white/20 transition-all duration-300 rounded-xl p-2 backdrop-blur-sm"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate animate-fade-in">{roomName}</h1>
              <div className="flex items-center space-x-2 sm:space-x-3 mt-1">
                <span className="font-mono bg-white/10 text-white px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold tracking-wider border border-white/20 backdrop-blur-sm">{roomCode}</span>
                <Badge className="hidden sm:flex bg-white/10 text-white border-white/20 rounded-xl px-3 py-1 backdrop-blur-sm">
                  <Users className="w-4 h-4 mr-1" />
                  2 participants
                </Badge>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} title={isConnected ? 'Connecté' : 'Déconnecté'}></div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="text-white hover:bg-white/20 transition-all duration-300 rounded-xl px-4 py-2 font-semibold backdrop-blur-sm border border-white/10"
            data-testid="button-copy-link"
          >
            <Share className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
            <span className="hidden sm:inline">Partager</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-900/20">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 px-4 animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur opacity-75 animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white text-center">Conversation sécurisée</h3>
            <p className="text-center mb-6 max-w-md text-gray-300 leading-relaxed">
              Messages chiffrés qui disparaissent automatiquement
            </p>
            
            {/* Version desktop */}
            <div className="hidden sm:grid grid-cols-3 gap-4 text-center">
              <div className="glass p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-xs font-medium text-white">Chiffré</p>
              </div>
              <div className="glass p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-xs font-medium text-white">Éphémère</p>
              </div>
              <div className="glass p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="w-8 h-8 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-xs font-medium text-white">Privé</p>
              </div>
            </div>
            
            {/* Version mobile compacte */}
            <div className="sm:hidden flex justify-center space-x-4 text-xs text-gray-300">
              <span className="flex items-center">
                <Shield className="w-3 h-3 mr-1 text-green-400" />
                Sécurisé
              </span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1 text-blue-400" />
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
                className={`flex mb-4 animate-slide-up ${
                  isOwnMessage ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Avatar pour les messages des autres (à gauche) */}
                {!isOwnMessage && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {(message.senderName || 'U').substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                )}
                
                {/* Bulle de message */}
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg relative`}>
                  {/* Nom de l'expéditeur pour les messages des autres */}
                  {!isOwnMessage && (
                    <p className="text-xs text-gray-300 mb-1 ml-2 font-medium">
                      {message.senderName || 'Utilisateur'}
                    </p>
                  )}
                  
                  {/* Bulle de message */}
                  <div 
                    className={`p-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md' 
                        : 'bg-gray-700/80 backdrop-blur-sm text-white rounded-bl-md border border-gray-600/50'
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    <p className="text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                    
                    {/* Métadonnées du message */}
                    <div className={`flex items-center justify-end space-x-1 mt-2 text-xs ${
                      isOwnMessage 
                        ? 'text-white/80' 
                        : 'text-gray-400'
                    }`}>
                      <span>{formatDistanceToNow(message.timestamp, { locale: fr, addSuffix: true })}</span>
                      {isOwnMessage && (
                        <div className="flex items-center space-x-1">
                          <span>•</span>
                          <div className="w-4 h-4 flex items-center justify-center">
                            {/* Indicateur de statut du message (lu/non lu) */}
                            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Flèche de la bulle */}
                  <div className={`absolute top-4 w-0 h-0 ${
                    isOwnMessage
                      ? 'right-0 border-l-8 border-l-blue-500 border-t-4 border-t-transparent border-b-4 border-b-transparent'
                      : 'left-0 border-r-8 border-r-gray-700 border-t-4 border-t-transparent border-b-4 border-b-transparent'
                  }`}></div>
                </div>
                
                {/* Avatar pour mes messages (à droite) */}
                {isOwnMessage && (
                  <div className="flex-shrink-0 ml-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                      {currentUser.username.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <div className="relative z-10 p-4 sm:p-6 glass border-t border-white/10 backdrop-blur-xl">
        <div className="space-y-4">
          {/* Paramètres d'expiration - version moderne */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-300" />
                <span className="text-sm text-gray-300">Expiration:</span>
                <select 
                  value={expiryDuration}
                  onChange={(e) => setExpiryDuration(e.target.value as any)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white backdrop-blur-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                >
                  <option value="15s">15 secondes</option>
                  <option value="1min">1 minute</option>
                  <option value="5min">5 minutes</option>
                  <option value="1h">1 heure</option>
                  <option value="24h">24 heures</option>
                </select>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAfterRead}
                  onChange={(e) => setDeleteAfterRead(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-400"
                />
                <span className="text-sm text-gray-300">🔒 Lecture unique</span>
              </label>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              className="flex-1 h-12 sm:h-14 rounded-2xl bg-white/10 border border-white/20 focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm px-4 sm:px-6 text-base sm:text-lg"
              disabled={isLoading}
              data-testid="input-message"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isLoading}
              className="h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 rounded-2xl shadow-xl border border-white/20"
              data-testid="button-send-message"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </Button>
          </div>
          
          {/* Paramètres d'expiration pour mobile - version compacte */}
          <div className="sm:hidden flex items-center justify-between text-xs text-gray-300">
            <span>⏱️ {formatExpiryTime(expiryDuration)}</span>
            {deleteAfterRead && <span>🔒 Lecture unique</span>}
          </div>
        </div>
      </div>
    </div>
  );
}