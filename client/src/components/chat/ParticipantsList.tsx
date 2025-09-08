import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserStatus } from './UserStatus';
import { ChatUser } from '@shared/schema';
import { FaCrown, FaUser } from 'react-icons/fa';

interface ParticipantsListProps {
  participants: ChatUser[];
  currentUserId?: string;
}

export function ParticipantsList({ participants, currentUserId }: ParticipantsListProps) {
  const getInitials = (user: ChatUser) => {
    if (user.displayName) {
      return user.displayName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    // Current user first
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    
    // Online users first
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    
    // Admins first within same online status
    if (a.role === 'admin' && b.role === 'user') return -1;
    if (a.role === 'user' && b.role === 'admin') return 1;
    
    // Alphabetical order
    return (a.displayName || a.username).localeCompare(b.displayName || b.username);
  });

  return (
    <div className="space-y-2" data-testid="participants-list">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Participants ({participants.length})
      </h3>
      
      <div className="space-y-2">
        {sortedParticipants.map((user) => (
          <div
            key={user.id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              user.id === currentUserId 
                ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            data-testid={`participant-${user.id}`}
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              
              {/* Online status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5">
                <UserStatus isOnline={user.isOnline} lastSeen={user.lastSeen} size="sm" />
              </div>
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.displayName || user.username}
                  {user.id === currentUserId && ' (Vous)'}
                </span>
                
                {user.role === 'admin' && (
                  <FaCrown className="text-yellow-500 text-xs" title="Administrateur" />
                )}
              </div>
              
              {user.displayName && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{user.username}
                </p>
              )}
              
              {user.bio && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Status badge */}
            <div className="flex flex-col items-end gap-1">
              <Badge 
                variant={user.isOnline ? 'default' : 'secondary'} 
                className="text-xs py-0 px-2"
              >
                {user.isOnline ? 'En ligne' : 'Hors ligne'}
              </Badge>
              
              {!user.isOnline && user.lastSeen && (
                <span className="text-xs text-gray-400">
                  <UserStatus isOnline={false} lastSeen={user.lastSeen} showText />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {participants.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FaUser className="mx-auto mb-2 text-2xl opacity-50" />
          <p className="text-sm">Aucun participant</p>
        </div>
      )}
    </div>
  );
}