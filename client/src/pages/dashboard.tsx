import { useState, useEffect } from 'react';
import { SimpleChatRoom } from '@/components/chat/SimpleChatRoom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Users, Settings, LogOut, Copy, Share, UserPlus, Crown, Shield, Trash2, X, Search, Menu, Lock, ExternalLink } from 'lucide-react';
import { authService } from '@/lib/auth';
import { ConversationsList } from '@/components/conversations/ConversationsList';
import { ChatProvider } from '@/context/ChatContext';
import { API_URL } from '@/config';

interface Conversation {
  id: string;
  name: string;
  type: 'public' | 'private';
  participantCount: number;
  onlineCount: number;
  lastMessage: {
    content: string;
    timestamp: string;
    senderName: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

interface DashboardProps {
  currentUser: {
    id: string;
    username: string;
    displayName: string;
  };
  onLogout: () => void;
}

export function Dashboard({ currentUser, onLogout }: DashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'public' as 'public' | 'private'
  });
  const { toast } = useToast();

  // Charger les rooms existantes au démarrage
  useEffect(() => {
    loadExistingRooms();
  }, []);

  const loadExistingRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        headers: authService.getAuthHeaders()
      });
      if (response.ok) {
        const rooms = await response.json();
        const roomConversations: Conversation[] = rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          type: room.type as 'public' | 'private',
          participantCount: room.participantCount || 1,
          onlineCount: 1,
          lastMessage: room.lastMessage ? {
            content: room.lastMessage.content,
            timestamp: room.lastMessage.timestamp,
            senderName: room.lastMessage.senderName,
            senderId: room.lastMessage.senderId
          } : null,
          unreadCount: 0
        }));
        setConversations(roomConversations);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rooms:', error);
    }
  };

  const handleJoinRoom = async (roomId: string, code?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la jointure');
      }

      const result = await response.json();
      toast({
        title: "Rejoint avec succès!",
        description: `Vous avez rejoint "${result.room?.name || roomId}"`
      });
      
      // Recharger les rooms pour mettre à jour la liste
      await loadExistingRooms();
      
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const handleJoinRoomWithCode = async () => {
    if (!joinRoomCode.trim()) {
      toast({
        title: "Erreur",
        description: "Le code de la room est requis",
        variant: "destructive"
      });
      return;
    }

    const success = await handleJoinRoom(joinRoomCode.trim(), joinRoomCode.trim());
    if (success) {
      setShowJoinDialog(false);
      setJoinRoomCode('');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de la room est requis",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({
          name: newRoom.name.trim()
          // Plus besoin de type - toutes les rooms sont privées
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la création');

      const room = await response.json();
      
      // Rejoindre automatiquement la room créée (toutes les rooms sont privées)
      await handleJoinRoom(room.id, room.id);
      
      // Recharger la liste des rooms au lieu d'ajouter manuellement
      await loadExistingRooms();
      
      setShowCreateDialog(false);
      setNewRoom({ name: '', type: 'private' });
      setSelectedConversationId(room.id);

      toast({
        title: "Room créée!",
        description: `"${room.name}" a été créée avec succès`,
      });

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la room",
        variant: "destructive"
      });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Interface style WhatsApp
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Desktop / Mobile Full Screen */}
      <div className={`
        ${showMobileSidebar || !selectedConversationId ? 'fixed inset-0 z-50 bg-white' : 'hidden'} 
        md:relative md:flex md:w-1/3 md:bg-white md:border-r md:border-gray-200 
        flex-col
      `}>
        {/* Header Sidebar */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-20 h-20   flex items-center justify-center">
              <img src="/public/logo.png" alt="TalkRoom" className="" />
            </div>
            <span className="text-white font-medium">{currentUser.displayName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <Plus className="w-5 h-5" />
            </Button>
            {selectedConversationId && (
              <Button 
                onClick={() => setShowMobileSidebar(false)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 md:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
            <Button 
              onClick={onLogout}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-gray-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300"
            />
          </div>
        </div>

        {/* Actions rapides */}
        <div className="p-3 bg-gray-50 border-b">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => setShowCreateDialog(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Créer
            </Button>
            <Button 
              onClick={() => setShowJoinDialog(true)}
              size="sm"
              variant="outline"
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Rejoindre
            </Button>
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune conversation</p>
              <p className="text-xs mt-1">Créez ou rejoignez une room pour commencer</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  setSelectedConversationId(conv.id);
                  setShowMobileSidebar(false);
                }}
                className={`
                  p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors
                  ${selectedConversationId === conv.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {conv.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    {conv.onlineCount > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{conv.name}</h3>
                      <div className="flex items-center space-x-1">
                        {conv.type === 'private' && <Lock className="w-3 h-3 text-gray-400" />}
                        {conv.unreadCount > 0 && (
                          <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {conv.lastMessage ? (
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-700">
                              {conv.lastMessage.senderId === currentUser.id ? 'Vous' : conv.lastMessage.senderName}:
                            </span>
                            <span className="ml-1 truncate">
                              {conv.lastMessage.content}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Aucun message</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-400 ml-2 flex-shrink-0">
                        {conv.lastMessage && (
                          <span>
                            {new Date(conv.lastMessage.timestamp).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{conv.onlineCount}/{conv.participantCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Zone de chat principale - cachée sur mobile quand aucune conversation */}
      <div className={`flex-1 flex flex-col ${!selectedConversationId ? 'hidden md:flex' : ''}`}>
        {selectedConversationId ? (
          <ChatProvider>
            <SimpleChatRoom 
              roomCode={selectedConversationId}
              roomName={conversations.find(c => c.id === selectedConversationId)?.name || 'Room'}
              currentUser={currentUser}
              onBack={() => setSelectedConversationId(null)}
              onCopyLink={() => {
                navigator.clipboard.writeText(`${window.location.origin}/room/${selectedConversationId}`);
                toast({ title: 'Lien copié !', description: 'Le lien de la room a été copié dans le presse-papier.' });
              }}
            />
          </ChatProvider>
        ) : (
          /* État vide - visible seulement sur desktop */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center px-6">
              <div className="w-64 h-64 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
                <MessageCircle className="w-32 h-32 text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-gray-600 mb-2">TalkRoom Web</h2>
              <p className="text-gray-500 max-w-md leading-relaxed">
                Envoyez et recevez des messages instantanément. 
                Créez ou rejoignez une room pour commencer à discuter.
              </p>
              <div className="mt-6 space-y-2">
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une room
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle room</DialogTitle>
            <DialogDescription>
              Créez un espace de discussion pour vous et vos amis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-name">Nom de la room</Label>
              <Input
                id="room-name"
                value={newRoom.name}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ma super room"
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center text-blue-700">
                <Lock className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Room privée</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Toutes les rooms sont privées. Partagez le code avec vos contacts pour les inviter.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateRoom}
                disabled={!newRoom.name.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="glass border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Rejoindre une room</DialogTitle>
            <DialogDescription className="text-gray-300">
              Entrez le code de la room pour la rejoindre (pour les rooms privées)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roomCode" className="text-white">Code de la room</Label>
              <Input
                id="roomCode"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                placeholder="Ex: ABC123"
                className="glass border-white/20 text-white placeholder:text-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoomWithCode()}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowJoinDialog(false);
                setJoinRoomCode('');
              }}
              className="text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleJoinRoomWithCode}
              disabled={!joinRoomCode.trim()}
              className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
            >
              Rejoindre
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
