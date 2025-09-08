import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatus } from '@/components/chat/UserStatus';
import { apiRequest } from '@/lib/queryClient';
import { Room, ChatUser } from '@shared/schema';
import { FaSearch, FaPlus, FaUsers, FaLock, FaGlobe, FaComments } from 'react-icons/fa';

interface RoomsListProps {
  currentUserId?: string;
  onRoomSelect: (room: Room) => void;
  onCreateRoom: () => void;
}

interface RoomWithDetails extends Room {
  lastMessage?: {
    content: string;
    timestamp: Date;
    senderName: string;
  };
  participantCount: number;
  unreadCount: number;
  onlineCount: number;
}

export function RoomsList({ currentUserId, onRoomSelect, onCreateRoom }: RoomsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch user's rooms
  const { data: userRooms = [], isLoading } = useQuery({
    queryKey: ['/api/users/rooms', currentUserId],
    enabled: !!currentUserId,
  });

  // Fetch public rooms
  const { data: publicRooms = [] } = useQuery({
    queryKey: ['/api/rooms/public'],
    enabled: false, // Will implement later
  });

  const filteredRooms = userRooms.filter((room: RoomWithDetails) =>
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastActivity = (timestamp?: Date | string) => {
    if (!timestamp) return '';
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 7 * 1440) return `${Math.floor(diffInMinutes / 1440)}j`;
    
    return date.toLocaleDateString();
  };

  const getRoomInitials = (room: Room) => {
    if (room.name) {
      return room.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }
    return room.id.slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement des salles...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaComments className="text-purple-500" />
            TalkRoom
          </h1>
          <Button
            onClick={onCreateRoom}
            size="sm"
            className="bg-purple-500 hover:bg-purple-600"
            data-testid="button-create-new-room"
          >
            <FaPlus className="mr-1" />
            Nouvelle
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher une salle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            data-testid="input-search-rooms"
          />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FaUsers className="text-6xl mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Aucune salle</h3>
            <p className="text-center text-sm">
              {searchQuery ? 'Aucune salle trouvée pour cette recherche' : 'Créez votre première salle pour commencer à chatter'}
            </p>
            {!searchQuery && (
              <Button
                onClick={onCreateRoom}
                className="mt-4 bg-purple-500 hover:bg-purple-600"
                data-testid="button-create-first-room"
              >
                <FaPlus className="mr-2" />
                Créer une salle
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                data-testid={`room-item-${room.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Room Avatar */}
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={room.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                        {getRoomInitials(room)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Room type indicator */}
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-1">
                      {room.type === 'private' ? (
                        <FaLock className="text-gray-500 text-xs" title="Salle privée" />
                      ) : (
                        <FaGlobe className="text-green-500 text-xs" title="Salle publique" />
                      )}
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {room.name || `Salle ${room.id}`}
                      </h3>
                      <div className="flex items-center gap-2">
                        {room.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatLastActivity(room.lastMessage.timestamp)}
                          </span>
                        )}
                        {room.unreadCount > 0 && (
                          <Badge className="bg-purple-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center">
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message or description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate mb-2">
                      {room.lastMessage ? (
                        <>
                          <span className="font-medium">{room.lastMessage.senderName}: </span>
                          {room.lastMessage.content}
                        </>
                      ) : (
                        room.description || 'Aucun message'
                      )}
                    </p>

                    {/* Room stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <FaUsers />
                        <span>{room.participantCount} participant{room.participantCount > 1 ? 's' : ''}</span>
                      </div>
                      
                      {room.onlineCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{room.onlineCount} en ligne</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {room.type === 'private' ? (
                          <>
                            <FaLock />
                            <span>Privée</span>
                          </>
                        ) : (
                          <>
                            <FaGlobe />
                            <span>Publique</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}