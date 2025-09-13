import { ChatUser } from '@/types/chat';

interface UsersListProps {
  participants: ChatUser[];
  currentUserId: string;
}

export function UsersList({ participants, currentUserId }: UsersListProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <i className="fas fa-users"></i>
        Utilisateurs connectés
      </h3>
      
      <div className="space-y-2" data-testid="users-list">
        {participants.map((user) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between p-3 bg-white/10 rounded-lg border-l-4 border-green-400"
            data-testid={`user-item-${user.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse-slow' : 'bg-gray-400'}`}></div>
              <span className="font-medium text-white">
                {user.id === currentUserId ? 'Vous' : user.username}
                {user.isOnline && ' (en ligne)'}
              </span>
            </div>
            <span className="text-xs text-white/60 capitalize">
              {user.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
