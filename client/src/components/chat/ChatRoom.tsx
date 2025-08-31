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
      sendWebSocketMessage({
        type: 'join_room',
        username,
        roomId: roomCode,
        role
      });
    },
    onClose: () => {
      setIsConnected(false);
    },
    onError: () => {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au serveur",
        variant: "destructive"
      });
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
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
      // Compress and encrypt message before sending via WebRTC
      const compressed = await CompressionService.compress(content);
      const { encrypted, iv } = await encryptMessage(content);
      
      // Send via WebRTC to all peers
      sendWebRTCMessage(message);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700 p-4">
      <div className="w-full max-w-6xl mx-auto bg-card/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="gradient-bg text-primary-foreground p-6 relative">
          <div className="flex items-center justify-between">
            {/* Connection Status */}
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse-slow' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium" data-testid="connection-status">
                {isConnected ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            
            {/* App Title */}
            <h1 className="text-3xl font-bold text-center">
              <i className="fas fa-comments mr-2"></i>
              Mini Messagerie
            </h1>
            
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-sm opacity-90" data-testid="current-user-info">
                {username} ({role === 'admin' ? 'Admin' : 'User'})
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
        <section className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
            
            {/* Messages Area */}
            <div className="lg:col-span-3 flex flex-col">
              <MessageList 
                messages={messages} 
                currentUserId={currentUser?.id || ''} 
              />
              
              {/* Typing Indicator */}
              <div className="text-sm text-muted-foreground italic mb-4 h-5 animate-fade-in-out" data-testid="typing-indicator">
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
            <div className="space-y-6">
              <RoomInfo
                roomCode={roomCode}
                messageCount={messageCount}
                userCount={participants.length}
                isAdmin={role === 'admin'}
                onClearMessages={handleClearMessages}
                onExportConversation={handleExportConversation}
              />
              
              <UsersList 
                participants={participants} 
                currentUserId={currentUser?.id || ''} 
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
