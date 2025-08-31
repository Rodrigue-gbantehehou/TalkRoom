import { ChatUser } from '@/types/chat';

interface UsersListProps {
  participants: ChatUser[];
  currentUserId: string;
}

export function UsersList({ participants, currentUserId }: UsersListProps) {
  return (
    <div className="bg-muted/50 rounded-2xl p-4">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <i className="fas fa-users"></i>
        Utilisateurs connectés
      </h3>
      
      <div className="space-y-2" data-testid="users-list">
        {participants.map((user) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between p-3 bg-card rounded-lg border-l-4 border-green-500"
            data-testid={`user-item-${user.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500 animate-pulse-slow' : 'bg-gray-400'}`}></div>
              <span className="font-medium">
                {user.id === currentUserId ? 'Vous' : user.username}
              </span>
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {user.role === 'admin' ? 'Admin' : 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
