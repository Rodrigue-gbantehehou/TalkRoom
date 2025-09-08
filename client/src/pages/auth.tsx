import { useState } from 'react';
import { UserSetup } from '@/components/auth/UserSetup';
import { RoomSelection } from '@/components/auth/RoomSelection';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AuthPageProps {
  onAuthComplete: (data: {
    username: string;
    displayName: string;
    roomId: string;
    role: 'user' | 'admin';
  }) => void;
}

export function AuthPage({ onAuthComplete }: AuthPageProps) {
  const [step, setStep] = useState<'profile' | 'room'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleProfileComplete = (userData: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
  }) => {
    setUserProfile(userData);
    setStep('room');
  };

  const handleRoomJoin = async (roomId: string, roomType: 'new' | 'existing') => {
    if (!userProfile) return;

    setIsLoading(true);

    try {
      let finalRoomId = roomId;

      // If creating a new room
      if (roomType === 'new') {
        const roomResponse = await apiRequest('POST', '/api/rooms', {
          name: `Salle de ${userProfile.displayName}`,
          type: 'public',
          createdBy: 'temp' // Will be updated with actual user ID
        });

        if (!roomResponse.ok) {
          throw new Error('Failed to create room');
        }

        const roomData = await roomResponse.json();
        finalRoomId = roomData.id;

        toast({
          title: "Salle créée",
          description: `Code de salle: ${finalRoomId}`,
        });
      } else {
        // Check if room exists
        const roomCheckResponse = await apiRequest('GET', `/api/rooms/${roomId}`);
        
        if (!roomCheckResponse.ok) {
          toast({
            title: "Erreur",
            description: "Salle introuvable. Vérifiez le code.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      // Complete authentication
      onAuthComplete({
        username: userProfile.username,
        displayName: userProfile.displayName,
        roomId: finalRoomId,
        role: 'user'
      });

    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre ou créer la salle",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'profile') {
    return (
      <UserSetup 
        onComplete={handleProfileComplete}
        isLoading={isLoading}
      />
    );
  }

  return (
    <RoomSelection
      onJoinRoom={handleRoomJoin}
      isLoading={isLoading}
    />
  );
}