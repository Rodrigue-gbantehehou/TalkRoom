import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatProvider } from '@/context/ChatContext';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isConnecting, setIsConnecting] = useState(false);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState('');
  const { toast } = useToast();

  // Extraire le code de salle depuis l'URL au chargement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setPrefilledRoomCode(roomFromUrl);
      toast({
        title: "Salle détectée",
        description: `Vous rejoignez la salle ${roomFromUrl}. Entrez votre nom pour continuer.`,
      });
    }
  }, [toast]);

  const handleJoin = async (enteredUsername: string, enteredRoomId: string, enteredRole: 'user' | 'admin') => {
    setIsConnecting(true);
    
    try {
      let finalRoomCode = enteredRoomId;
      
      // If no room ID provided, create a new room
      if (!enteredRoomId.trim()) {
        const response = await apiRequest('POST', '/api/rooms', { 
          name: `Salle de ${enteredUsername}` 
        });
        const roomData = await response.json();
        finalRoomCode = roomData.id;
        
        toast({
          title: "Nouvelle salle créée",
          description: `Code de salle: ${finalRoomCode}`,
        });
      } else {
        // Check if room exists
        try {
          await apiRequest('GET', `/api/rooms/${enteredRoomId}`);
        } catch (error) {
          toast({
            title: "Erreur",
            description: "Salle introuvable. Vérifiez le code de salle.",
            variant: "destructive"
          });
          setIsConnecting(false);
          return;
        }
      }

      setRoomCode(finalRoomCode);
      setUsername(enteredUsername);
      setRole(enteredRole);
      setIsInRoom(true);
    } catch (error) {
      console.error('Failed to join/create room:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre ou créer la salle",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeave = () => {
    setIsInRoom(false);
    setRoomCode('');
    setUsername('');
    setRole('user');
  };

  if (!isInRoom) {
    return (
      <LoginForm 
        onJoin={handleJoin} 
        isConnecting={isConnecting}
        prefilledRoomCode={prefilledRoomCode}
      />
    );
  }

  return (
    <ChatProvider>
      <ChatRoom 
        roomCode={roomCode}
        username={username}
        role={role}
        onLeave={handleLeave}
      />
    </ChatProvider>
  );
}
