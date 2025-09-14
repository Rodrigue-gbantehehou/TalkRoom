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
  ExternalLink,
  Menu,
  LogOut,
  Settings,
  User
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
  onLogout?: () => void;
  currentUser: { username: string };
}

export function ConversationsList({ 
  conversations, 
  onSelectConversation, 
  onCreateRoom, 
  onJoinRoom,
  onShareRoom,
  onLogout,
  currentUser 
}: ConversationsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 glass border-b border-white/10 backdrop-blur-xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/25 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl backdrop-blur-sm">
              <img 
                src={logoUrl} 
                alt="TalkRoom Logo" 
                className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white animate-fade-in">TalkRoom</h1>
              <p className="text-xs sm:text-sm text-white/80 font-medium truncate">@{currentUser.username}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Desktop controls */}
            <div className="hidden sm:flex items-center space-x-2">
              <div className="bg-white/10 rounded-xl p-1.5 border border-white/20 backdrop-blur-sm">
                <ThemeToggle />
              </div>
              {onLogout && (
                <Button
                  onClick={onLogout}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-2 rounded-xl text-sm transition-all duration-300 backdrop-blur-sm"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </Button>
              )}
            </div>
            
            {/* Mobile hamburger menu */}
            <div className="sm:hidden">
              <Button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-all duration-300 backdrop-blur-sm touch-target"
                title="Menu"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="sm:hidden mb-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="space-y-3">
              {/* User Profile */}
              <div className="flex items-center space-x-3 pb-3 border-b border-white/20">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{currentUser.username}</p>
                  <p className="text-xs text-white/70">Utilisateur connecté</p>
                </div>
              </div>
              
              {/* Menu Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/90">Thème</span>
                  <div className="bg-white/20 rounded-lg p-1">
                    <ThemeToggle />
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    // TODO: Implement settings
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 h-10 rounded-xl text-sm justify-start"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Paramètres
                </Button>
                
                {onLogout && (
                  <Button
                    onClick={() => {
                      onLogout();
                      setShowMobileMenu(false);
                    }}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 h-10 rounded-xl text-sm justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Se déconnecter
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Hidden when mobile menu is open */}
        <div className={`space-y-3 mb-6 transition-all duration-300 ${showMobileMenu ? 'sm:block hidden' : 'block'}`}>
          <Button
            onClick={onCreateRoom}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 transform hover:scale-[1.02] h-12 rounded-2xl shadow-xl font-semibold"
            data-testid="button-create-room"
          >
            <Plus className="w-5 h-5 mr-3" />
            Créer une room
          </Button>
          {onJoinRoom && (
            <Button
              onClick={onJoinRoom}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 transform hover:scale-[1.02] h-12 rounded-2xl shadow-xl font-semibold"
              data-testid="button-join-room"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              Rejoindre une room
            </Button>
          )}
        </div>

        {/* Search - Hidden when mobile menu is open */}
        <div className={`relative transition-all duration-300 ${showMobileMenu ? 'sm:block hidden' : 'block'}`}>
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/10 border border-white/20 rounded-xl sm:rounded-2xl placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4">
            {searchTerm && (
              <div className="text-center text-gray-300 py-8 animate-fade-in">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-50"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-white">Aucune conversation trouvée pour "{searchTerm}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className="group glass border border-white/10 backdrop-blur-sm p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 rounded-2xl animate-slide-up"
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {conversation.name.substring(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Room name and type */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {conversation.type === 'private' ? (
                            <Lock className="w-3 h-3 text-purple-400" />
                          ) : (
                            <Globe className="w-3 h-3 text-emerald-400" />
                          )}
                          <span className="text-xs text-gray-300 flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {conversation.onlineCount}/{conversation.participantCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {/* Quick Actions */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Copy Link Button */}
                          {onShareRoom && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShareRoom(conversation.id);
                              }}
                              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              title="Copier le lien"
                              data-testid={`button-share-${conversation.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                          {/* Info Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement room info modal
                            }}
                            className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Informations de la room"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-emerald-500 text-white text-xs min-w-[18px] h-5 flex items-center justify-center rounded-full">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message */}
                    {conversation.lastMessage ? (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">
                            <span className="font-medium text-white">
                              {conversation.lastMessage.senderName}:
                            </span>{' '}
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {conversation.lastMessage.expiresIn && (
                            <span className="text-xs text-orange-400 font-medium">
                              {formatTimeRemaining(conversation.lastMessage.expiresIn)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(conversation.lastMessage.timestamp, {
                              addSuffix: true,
                              locale: fr
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
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