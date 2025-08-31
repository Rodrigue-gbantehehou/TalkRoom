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

  const typingText = typingUsers.length > 0 
    ? `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'est en train' : 'sont en train'} d'écrire...`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-2 md:p-4">
      <div className="w-full max-w-7xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 md:p-6 relative">
          <div className="flex items-center justify-between">
            {/* App Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-comments text-xl"></i>
              </div>
            </div>
            
            {/* App Title */}
            <h1 className="text-3xl font-bold text-center">
              Mini Messagerie
            </h1>
            
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm opacity-90" data-testid="current-user-info">
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
              <Button
                onClick={onLeave}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm transition-colors"
                data-testid="button-leave-room"
              >
                <i className="fas fa-sign-out-alt mr-1"></i>
                Quitter
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

        {/* Chat Section */}
        <section className="p-3 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-6 h-[70vh] md:h-[600px]">
            
            {/* Messages Area */}
            <div className="lg:col-span-3 flex flex-col order-2 lg:order-1">
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
            
            {/* Sidebar */}
            <div className="space-y-3 md:space-y-6 order-1 lg:order-2">
              <RoomInfo
                roomCode={roomCode}
                messageCount={messageCount}
                userCount={participants.length}
                isAdmin={role === 'admin'}
                onClearMessages={handleClearMessages}
                onExportConversation={handleExportConversation}
              />
              
              <div className="lg:block">
                <UsersList 
                  participants={participants} 
                  currentUserId={currentUser?.id || ''} 
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
