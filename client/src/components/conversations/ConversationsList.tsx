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
      <div className="gradient-primary p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/25 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl backdrop-blur-sm">
              <img 
                src={logoUrl} 
                alt="TalkRoom Logo" 
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">TalkRoom</h1>
              <p className="text-xs sm:text-sm text-white/90 font-medium">@{currentUser.username}</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-xl sm:rounded-2xl p-1.5 sm:p-2">
            <ThemeToggle />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={onCreateRoom}
            className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 transform hover:scale-[1.02] h-12 rounded-2xl shadow-lg font-semibold"
            data-testid="button-create-room"
          >
            <Plus className="w-5 h-5 mr-3" />
            Créer une room
          </Button>
          {onJoinRoom && (
            <Button
              onClick={onJoinRoom}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 transform hover:scale-[1.02] h-12 rounded-2xl shadow-lg font-semibold"
              data-testid="button-join-room"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              Rejoindre une room
            </Button>
          )}
        </div>

        {/* Search - Simplifié sur mobile */}
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder={window.innerWidth < 640 ? "Rechercher..." : "Rechercher une conversation..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/20 border border-white/30 rounded-xl sm:rounded-2xl placeholder-white/70 text-white focus:outline-none focus:bg-white/30 focus:border-white/50 transition-all duration-200 text-sm sm:text-base"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center mb-6">
              <MessageCircle className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Aucune conversation</h3>
            <p className="text-center mb-6 text-gray-600 dark:text-gray-400 max-w-sm">
              {searchTerm 
                ? "Aucune conversation ne correspond à votre recherche"
                : "Créez votre première room pour commencer à discuter avec vos amis"
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={onCreateRoom}
                className="gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer ma première room
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className="modern-card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="gradient-primary text-white font-bold text-lg">
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