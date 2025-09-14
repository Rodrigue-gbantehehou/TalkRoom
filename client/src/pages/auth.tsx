import { useState } from "react";
import { RoomSelection } from "@/components/auth/RoomSelection";
import { AuthForm } from "@/components/auth/AuthForm";

interface AuthPageProps {
  onAuthComplete: (data: {
    username: string;
    displayName: string;
    roomId: string;
    role: "user" | "admin";
  }) => void;
}

export function AuthPage({ onAuthComplete }: AuthPageProps) {
  const [userProfile, setUserProfile] = useState<any>(null);

  /** Lorsque l'auth réussit */
  const handleAuthSuccess = (user: any) => {
    setUserProfile(user);
  };

  /** Rejoindre ou créer une salle */
  const handleRoomJoin = (roomId: string, role: "user" | "admin") => {
    if (!userProfile) return;
    onAuthComplete({
      username: userProfile.username,
      displayName: userProfile.displayName,
      roomId,
      role,
    });
  };

  return (
    <>
      {!userProfile ? (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      ) : (
        <RoomSelection onJoinRoom={handleRoomJoin} isLoading={false} />
      )}
    </>
  );
}
