import { useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { UsersList } from './UsersList';
import { RoomInfo } from './RoomInfo';
import { useChatContext } from '@/context/ChatContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useEncryption } from '@/hooks/useEncryption';
import { CompressionService } from '@/lib/compression';
import { Message } from '@/types/chat';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ChatRoomProps {
  roomCode: string;
  username: string;
  role: 'user' | 'admin';
  onLeave: () => void;
}

export function ChatRoom({ roomCode, username, role, onLeave }: ChatRoomProps) {
  const {
    messages,
    participants,
    currentUser,
    typingUsers,
    messageCount,
    isConnected,
    addMessage,
    updateParticipants,
    setCurrentUser,
    setIsConnected,
    addTypingUser,
    removeTypingUser,
    clearMessages,
    incrementMessageCount
  } = useChatContext();

  const { toast } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [showMenu, setShowMenu] = useState(false);
  const { encryptMessage, decryptMessage, generateRoomKey, importRoomKey } = useEncryption();

  const handleWebSocketMessage = async (data: any) => {
    switch (data.type) {
      case 'joined_room':
        setCurrentUser({
          id: data.userId,
          username: data.username,
          role,
          isOnline: true
        });
        setIsConnected(true);
        
        // Generate or import encryption key
        await generateRoomKey(roomCode);
        
        // Add welcome message
        addMessage({
          id: `system-${Date.now()}`,
          content: 'Bienvenue dans la messagerie ! 🎉',
          senderId: 'system',
          senderName: 'Système',
          timestamp: Date.now(),
          type: 'system'
        });
        break;

      case 'user_joined':
        addMessage({
          id: `system-${Date.now()}`,
          content: `${data.username} a rejoint la conversation`,
          senderId: 'system',
          senderName: 'Système',
          timestamp: Date.now(),
          type: 'system'
        });
        break;

      case 'user_left':
        addMessage({
          id: `system-${Date.now()}`,
          content: `${data.username} a quitté la conversation`,
          senderId: 'system',
          senderName: 'Système',
          timestamp: Date.now(),
          type: 'system'
        });
        break;

      case 'participants_update':
        updateParticipants(data.participants);
        break;

      case 'typing_start':
        if (data.username !== username) {
          addTypingUser(data.username);
        }
        break;

      case 'typing_stop':
        removeTypingUser(data.username);
        break;

      case 'webrtc_signal':
        // Handle WebRTC signaling
        if (data.signal.type === 'offer') {
          const answer = await createAnswer(data.fromUserId, data.signal);
          sendWebSocketMessage({ 
            type: 'webrtc_signal', 
            targetUserId: data.fromUserId, 
            signal: answer 
          });
        } else if (data.signal.type === 'answer') {
          await handleAnswer(data.fromUserId, data.signal);
        } else if (data.signal.type === 'ice-candidate') {
          await handleIceCandidate(data.fromUserId, data.signal);
        }
        break;

      case 'message_received':
        // Handle messages received via WebSocket broadcast
        if (data.message && data.message.senderId !== currentUser?.id) {
          addMessage(data.message);
        }
        break;

      case 'error':
        toast({
          title: "Erreur",
          description: data.message,
          variant: "destructive"
        });
        break;
    }
  };

  const { connect, disconnect, sendMessage: sendWebSocketMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onOpen: () => {
      console.log('WebSocket opened, joining room...');
      setConnectionStatus('connected');
      setIsConnected(true);
      sendWebSocketMessage({
        type: 'join_room',
        username,
        roomId: roomCode,
        role
      });
    },
    onClose: () => {
      console.log('WebSocket closed');
      setConnectionStatus('disconnected');
      setIsConnected(false);
    },
    onError: () => {
      console.log('WebSocket error occurred');
      setConnectionStatus('error');
      setIsConnected(false);
    }
  });

  const handleWebRTCMessage = async (message: Message) => {
    // Decrypt message if encrypted
    try {
      // For now, messages come decrypted from WebRTC
      addMessage(message);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
    }
  };

  const { 
    sendMessage: sendWebRTCMessage,
    createAnswer,
    handleAnswer,
    handleIceCandidate
  } = useWebRTC({
    onMessage: handleWebRTCMessage,
    localUserId: currentUser?.id || '',
    localUsername: username
  });

  useEffect(() => {
    setConnectionStatus('connecting');
    connect();
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array to avoid reconnection loops

  const handleSendMessage = async (content: string) => {
    if (!currentUser) return;

    const message: Message = {
      id: `${currentUser.id}-${Date.now()}`,
      content,
      senderId: currentUser.id,
      senderName: currentUser.username,
      timestamp: Date.now(),
      type: 'user'
    };

    // Add to local messages immediately
    addMessage(message);

    try {
      // For now, send messages directly without encryption for simplicity
      // This ensures messages work while we can add encryption later
      sendWebRTCMessage(message);
      
      // Also broadcast via WebSocket for users who don't have P2P connection yet
      sendWebSocketMessage({
        type: 'broadcast_message',
        message: message
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
  };

  const handleTypingStart = () => {
    sendWebSocketMessage({ type: 'typing_start' });
  };

  const handleTypingStop = () => {
    sendWebSocketMessage({ type: 'typing_stop' });
  };

  const handleClearMessages = () => {
    if (role === 'admin') {
      clearMessages();
      toast({
        title: "Succès",
        description: "Tous les messages ont été effacés",
      });
    }
  };

  const handleExportConversation = () => {
    const conversationText = messages
      .filter(m => m.type === 'user')
      .map(m => `[${new Date(m.timestamp).toLocaleString('fr-FR')}] ${m.senderName}: ${m.content}`)
      .join('\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${roomCode}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Succès",
      description: "Conversation exportée avec succès !",
    });
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast({
        title: "Succès",
        description: "Code de salle copié dans le presse-papiers !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code de salle",
        variant: "destructive"
      });
    }
  };

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}?room=${roomCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez ma salle de chat',
          text: `Rejoignez-moi dans la salle ${roomCode}`,
          url: shareUrl
        });
      } catch (error) {
        // Fallback to copy
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Lien copié",
          description: "Le lien de partage a été copié dans le presse-papiers",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié",
        description: "Le lien de partage a été copié dans le presse-papiers",
      });
    }
  };

  const typingText = typingUsers.length > 0 
    ? `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'est en train' : 'sont en train'} d'écrire...`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 md:p-4">
      <div className="w-full max-w-7xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 md:p-6 relative">
          <div className="flex items-center justify-between">
            {/* Menu Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-colors"
                data-testid="button-menu"
              >
                <div className="flex flex-col space-y-1 w-5 h-4 justify-center">
                  <div className="h-0.5 bg-white rounded"></div>
                  <div className="h-0.5 bg-white rounded"></div>
                  <div className="h-0.5 bg-white rounded"></div>
                </div>
              </Button>
            </div>
            
            {/* App Title & Status */}
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold">
                Mini Messagerie
              </h1>
              <div className="flex items-center justify-center gap-2 text-sm opacity-90 mt-1" data-testid="current-user-info">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse-slow' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-400 animate-pulse' : 
                  'bg-gray-400'
                }`}></div>
                <span>{username} ({
                  connectionStatus === 'connected' ? 'en ligne' :
                  connectionStatus === 'connecting' ? 'connexion...' :
                  connectionStatus === 'error' ? 'erreur de connexion' :
                  'hors ligne'
                })</span>
              </div>
            </div>
            
            {/* Leave Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onLeave}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm transition-colors"
                data-testid="button-leave-room"
              >
                <i className="fas fa-sign-out-alt mr-1"></i>
                <span className="hidden md:inline">Quitter</span>
              </Button>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <Button
            onClick={toggleTheme}
            className="absolute top-4 right-4 p-2 rounded-lg glass-effect hover:bg-white/10 transition-colors"
            data-testid="button-toggle-theme"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </Button>
        </header>

        {/* Slide Menu Overlay */}
        {showMenu && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowMenu(false)}
          />
        )}

        {/* Slide Menu */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-purple-900 via-slate-900 to-slate-900 transform transition-transform duration-300 ease-in-out z-50 border-r border-white/20 ${
          showMenu ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6">
            {/* Menu Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Menu</h2>
              <Button
                onClick={() => setShowMenu(false)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"
              >
                <i className="fas fa-times text-white"></i>
              </Button>
            </div>

            {/* Room Sharing Section */}
            <div className="mb-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <i className="fas fa-share-alt"></i>
                  Partager la salle
                </h3>
                <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-sm font-mono mb-3" data-testid="room-code-display">
                  {roomCode}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={copyRoomCode}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
                    data-testid="button-copy-room-code"
                  >
                    <i className="fas fa-copy mr-2"></i>
                    Copier le code
                  </Button>
                  <Button
                    onClick={shareRoom}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
                    data-testid="button-share-room"
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Partager le lien
                  </Button>
                </div>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="mb-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-chart-bar"></i>
                  Statistiques
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400" data-testid="stat-message-count">
                      {messageCount}
                    </div>
                    <div className="text-xs text-white/60">Messages</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400" data-testid="stat-user-count">
                      {participants.length}
                    </div>
                    <div className="text-xs text-white/60">Utilisateurs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Users List Section */}
            <div className="mb-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-users"></i>
                  Utilisateurs connectés
                </h3>
                <div className="space-y-2" data-testid="users-list">
                  {participants.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 bg-white/10 rounded-lg border-l-4 border-green-400"
                      data-testid={`user-item-${user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse-slow' : 'bg-gray-400'}`}></div>
                        <span className="font-medium text-white">
                          {user.id === currentUser?.id ? 'Vous' : user.username}
                          {user.isOnline && ' (en ligne)'}
                        </span>
                      </div>
                      <span className="text-xs text-white/60 capitalize">
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {role === 'admin' && (
              <div className="mb-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-cog"></i>
                    Contrôles Admin
                  </h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        handleClearMessages();
                        setShowMenu(false);
                      }}
                      className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 py-2 px-4 rounded-lg text-sm transition-colors"
                      data-testid="button-clear-messages"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Effacer tous les messages
                    </Button>
                    <Button
                      onClick={() => {
                        handleExportConversation();
                        setShowMenu(false);
                      }}
                      className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 py-2 px-4 rounded-lg text-sm transition-colors"
                      data-testid="button-export-conversation"
                    >
                      <i className="fas fa-download mr-2"></i>
                      Exporter la conversation
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <section className="p-3 md:p-6">
          <div className="w-full h-[70vh] md:h-[600px]">
            {/* Messages Area - Full Width */}
            <div className="flex flex-col h-full">
              <MessageList 
                messages={messages} 
                currentUserId={currentUser?.id || ''} 
              />
              
              {/* Typing Indicator */}
              <div className="text-sm text-white/70 italic mb-3 h-5 animate-fade-in-out" data-testid="typing-indicator">
                {typingText}
              </div>
              
              <MessageInput
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={!isConnected}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
