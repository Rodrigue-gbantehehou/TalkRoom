import { useState } from 'react';
import { RoomsList } from '@/components/rooms/RoomsList';
import { AuthPage } from '@/pages/auth';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { ChatProvider } from '@/context/ChatContext';
import { Room } from '@shared/schema';

interface DashboardProps {
  currentUser?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleCreateRoom = () => {
    setShowCreateRoom(true);
  };

  const handleBackToRooms = () => {
    setSelectedRoom(null);
    setShowCreateRoom(false);
  };

  if (showCreateRoom) {
    return (
      <AuthPage 
        onAuthComplete={(data) => {
          // Handle room creation completion
          setShowCreateRoom(false);
        }} 
      />
    );
  }

  if (selectedRoom && currentUser) {
    return (
      <ChatProvider>
        <ChatRoom
          roomCode={selectedRoom.id}
          username={currentUser.username}
          role="user" // Will be determined by room participation
          onLeave={handleBackToRooms}
        />
      </ChatProvider>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <RoomsList
        currentUserId={currentUser?.id}
        onRoomSelect={handleRoomSelect}
        onCreateRoom={handleCreateRoom}
      />
    </div>
  );
}