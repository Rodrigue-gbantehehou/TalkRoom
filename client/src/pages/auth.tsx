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

  const handleProfileComplete = async (userData: {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}) => {
  setIsLoading(true);
  try {
    // Créer l'utilisateur côté backend / Supabase
    const userResponse = await apiRequest('POST', '/api/users', userData);

    if (!userResponse.ok) {
      throw new Error('Impossible de créer l’utilisateur');
    }

    const createdUser = await userResponse.json();

    // On sauvegarde le profil créé côté frontend
    setUserProfile({ ...userData, id: createdUser.id });
    setStep('room');
  } catch (err) {
    console.error('Erreur création utilisateur:', err);
    toast({
      title: 'Erreur',
      description: 'Impossible de créer le profil utilisateur',
      variant: 'destructive',
    });
  } finally {
    setIsLoading(false);
  }
};

const handleRoomJoin = async (roomId: string, roomType: 'new' | 'existing') => {
  if (!userProfile?.id) return; // Vérifie qu'on a bien l'user créé

  setIsLoading(true);

  try {
    let finalRoomId = roomId;

    // Si création d'une nouvelle salle
    if (roomType === 'new') {
      const roomResponse = await apiRequest('POST', '/api/rooms', {
        name: `Salle de ${userProfile.displayName}`,
        type: 'public',
        createdBy: userProfile.id // ID réel de l'utilisateur
      });

      if (!roomResponse.ok) {
        throw new Error('Impossible de créer la salle');
      }

      const roomData = await roomResponse.json();
      finalRoomId = roomData.id;

      // Ajouter l'utilisateur en tant que participant (admin)
      await apiRequest('POST', '/api/room-participants', {
        roomId: finalRoomId,
        userId: userProfile.id,
        role: 'admin'
      });

      toast({
        title: 'Salle créée',
        description: `Code de salle: ${finalRoomId}`,
      });
    } else {
      // Vérifier si la salle existe
      const roomCheckResponse = await apiRequest('GET', `/api/rooms/${roomId}`);
      if (!roomCheckResponse.ok) {
        toast({
          title: 'Erreur',
          description: 'Salle introuvable. Vérifiez le code.',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Ajouter l'utilisateur comme participant si non présent
      await apiRequest('POST', '/api/room-participants', {
        roomId,
        userId: userProfile.id,
        role: 'user'
      });
    }

    // Authentification complète
    onAuthComplete({
      username: userProfile.username,
      displayName: userProfile.displayName,
      roomId: finalRoomId,
      role: roomType === 'new' ? 'admin' : 'user'
    });

  } catch (error) {
    console.error('Erreur authentification:', error);
    toast({
      title: 'Erreur',
      description: 'Impossible de rejoindre ou créer la salle',
      variant: 'destructive'
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