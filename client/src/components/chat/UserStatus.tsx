import { FaCircle } from 'react-icons/fa';

interface UserStatusProps {
  isOnline: boolean;
  lastSeen?: Date | string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function UserStatus({ isOnline, lastSeen, size = 'md', showText = false }: UserStatusProps) {
  const getStatusColor = () => {
    return isOnline ? 'text-green-500' : 'text-gray-400';
  };

  const getStatusText = () => {
    if (isOnline) return 'En ligne';
    
    if (lastSeen) {
      const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'À l\'instant';
      if (diffInMinutes < 60) return `il y a ${diffInMinutes}m`;
      if (diffInMinutes < 1440) return `il y a ${Math.floor(diffInMinutes / 60)}h`;
      return `il y a ${Math.floor(diffInMinutes / 1440)}j`;
    }
    
    return 'Hors ligne';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-lg';
      default: return 'text-sm';
    }
  };

  return (
    <div className="flex items-center gap-1">
      <FaCircle 
        className={`${getStatusColor()} ${getSizeClass()}`} 
        data-testid={`status-indicator-${isOnline ? 'online' : 'offline'}`}
      />
      {showText && (
        <span className={`${getSizeClass()} text-gray-600 dark:text-gray-300`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
}