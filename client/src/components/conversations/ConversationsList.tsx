import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Clock, 
  Users, 
  Lock, 
  Globe,
  MessageCircle,
  Share,
  Copy,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoUrl from '@assets/tallk_room copieFF_1757358775756.png';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface Conversation {
  id: string;
  name: string;
  type: 'public' | 'private';
  participantCount: number;
  onlineCount: number;
  lastMessage: {
    content: string;
    timestamp: Date;
    senderName: string;
    expiresIn?: string;
  } | null;
  unreadCount: number;
}

interface ConversationsListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onCreateRoom: () => void;
  onJoinRoom?: () => void;
  onShareRoom?: (roomId: string) => void;
  currentUser: { username: string };
}

export function ConversationsList({ 
  conversations, 
  onSelectConversation, 
  onCreateRoom, 
  onJoinRoom,
  onShareRoom,
  currentUser 
}: ConversationsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimeRemaining = (expiresIn?: string) => {
    if (!expiresIn) return '';
    switch (expiresIn) {
      case '15s': return '⏱️ 15s';
      case '1min': return '⏱️ 1min';
      case '5min': return '⏱️ 5min';
      case '1h': return '⏱️ 1h';
      case '24h': return '⏱️ 24h';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="gradient-emerald-cyan p-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/25 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm">
              <img 
                src={logoUrl} 
                alt="TalkRoom Logo" 
                className="w-9 h-9 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">TalkRoom</h1>
              <p className="text-sm text-white/80 font-medium">@{currentUser.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Button
            onClick={onCreateRoom}
            className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 transform hover:scale-105 h-10 sm:h-12 rounded-lg sm:rounded-xl shadow-lg text-sm sm:text-base"
            data-testid="button-create-room"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            <span className="font-semibold">Créer</span>
          </Button>
          {onJoinRoom && (
            <Button
              onClick={onJoinRoom}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 transform hover:scale-105 h-10 sm:h-12 rounded-lg sm:rounded-xl shadow-lg text-sm sm:text-base"
              data-testid="button-join-room"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="font-semibold">Rejoindre</span>
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-200 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white/20 border border-white/30 rounded-lg placeholder-emerald-200 text-white focus:outline-none focus:bg-white/30 text-sm sm:text-base"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Aucune conversation</h3>
            <p className="text-center mb-4">
              {searchTerm 
                ? "Aucune conversation ne correspond à votre recherche"
                : "Créez votre première room pour commencer à discuter"
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={onCreateRoom}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une room
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                    <AvatarFallback className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-semibold text-sm sm:text-base">
                      {conversation.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Room name and type */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {conversation.type === 'private' ? (
                            <Lock className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Globe className="w-3 h-3 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {conversation.onlineCount}/{conversation.participantCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Share button */}
                        {onShareRoom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareRoom(conversation.id);
                            }}
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity"
                            data-testid={`button-share-${conversation.id}`}
                          >
                            <Share className="w-3 h-3" />
                          </Button>
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-emerald-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message */}
                    {conversation.lastMessage ? (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">
                            <span className="font-medium text-gray-800">
                              {conversation.lastMessage.senderName}:
                            </span>{' '}
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {conversation.lastMessage.expiresIn && (
                            <span className="text-xs text-orange-500 font-medium">
                              {formatTimeRemaining(conversation.lastMessage.expiresIn)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(conversation.lastMessage.timestamp, {
                              addSuffix: true,
                              locale: fr
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Aucun message
                      </p>
                    )}
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