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
  MessageCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import logoUrl from '@assets/tallk_room copieFF_1757358775756.png';

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
  currentUser: { username: string };
}

export function ConversationsList({ 
  conversations, 
  onSelectConversation, 
  onCreateRoom, 
  onJoinRoom,
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="TalkRoom Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold">TalkRoom</h1>
              <p className="text-sm text-emerald-100">@{currentUser.username}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onCreateRoom}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              data-testid="button-create-room"
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer
            </Button>
            {onJoinRoom && (
              <Button
                onClick={onJoinRoom}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                data-testid="button-join-room"
              >
                Rejoindre
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-200 w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg placeholder-emerald-200 text-white focus:outline-none focus:bg-white/30"
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
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-semibold">
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
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-emerald-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Badge>
                      )}
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