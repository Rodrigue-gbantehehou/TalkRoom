import { useState } from 'react';
import { AuthPage } from '@/pages/auth';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatProvider } from '@/context/ChatContext';

export default function Home() {
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');

  const handleAuthComplete = (data: {
    username: string;
    displayName: string;
    roomId: string;
    role: 'user' | 'admin';
  }) => {
    setUsername(data.username);
    setDisplayName(data.displayName);
    setRoomCode(data.roomId);
    setRole(data.role);
    setIsInRoom(true);
  };

  const handleLeave = () => {
    setIsInRoom(false);
    setRoomCode('');
    setUsername('');
    setDisplayName('');
    setRole('user');
  };

  if (!isInRoom) {
    return (
      <AuthPage onAuthComplete={handleAuthComplete} />
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
