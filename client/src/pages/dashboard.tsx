import { useState, useEffect } from 'react';
import { ConversationsList } from '@/components/conversations/ConversationsList';
import { SimpleChatRoom } from '@/components/chat/SimpleChatRoom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Globe, Lock, Copy, ExternalLink, Shield, Clock, Users } from 'lucide-react';
import { ChatProvider } from '@/context/ChatContext';
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
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'public' as 'public' | 'private'
  });
  const { toast } = useToast();

  const handleJoinRoomByCode = async () => {
    if (!joinRoomCode.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez entrer le code de la room",
        variant: "destructive",
      });
      return;
    }

    try {
      // D'abord vérifier si la room existe
      const checkResponse = await fetch(`/api/rooms/${joinRoomCode.trim()}`);
      if (!checkResponse.ok) {
        throw new Error('Room introuvable');
      }
      
      const room = await checkResponse.json();
      
      // Puis rejoindre la room
      const joinResponse = await fetch(`/api/rooms/${joinRoomCode.trim()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id
        })
      });
      
      if (!joinResponse.ok) {
        throw new Error('Erreur lors de la jointure');
      }
      
      // Ajouter à la liste des conversations si pas déjà présente
      const exists = conversations.find(c => c.id === room.id);
      if (!exists) {
        const newConversation = {
          id: room.id,
          name: room.name,
          type: room.type || 'public',
          participantCount: room.participantCount || 1,
          onlineCount: 1,
          lastMessage: null,
          unreadCount: 0
        };
        setConversations(prev => [newConversation, ...prev]);
      }

      // Rejoindre automatiquement la room
      setSelectedConversationId(room.id);
      setJoinRoomCode('');
      setShowJoinDialog(false);
      
      toast({
        title: "Room rejoint !",
        description: `Vous avez rejoint "${room.name}"`,
      });
    } catch (error) {
      console.error('Erreur jointure:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre cette room. Vérifiez le code.",
        variant: "destructive",
      });
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
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoom.name.trim(),
          type: newRoom.type,
          createdBy: currentUser.id
        })
      });

      if (!response.ok) throw new Error('Erreur lors de la création');

      const room = await response.json();
      
      // Add to conversations list
      const newConversation = {
        id: room.id,
        name: room.name,
        type: room.type as 'public' | 'private',
        participantCount: 1,
        onlineCount: 1,
        lastMessage: null as any,
        unreadCount: 0
      };

      setConversations(prev => [newConversation, ...prev]);
      setShowCreateDialog(false);
      setNewRoom({ name: '', type: 'public' });
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

  const handleJoinRoom = (roomId: string) => {
    setSelectedConversationId(roomId);
  };

  const copyRoomLink = (roomId: string) => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Lien copié!",
      description: "Le lien de la room a été copié dans le presse-papiers",
    });
  };

  // If no conversation is selected, show conversations list
  if (!selectedConversationId) {
    return (
      <div className="h-screen flex">
        <div className="w-full max-w-md">
          <ConversationsList
            conversations={conversations}
            onSelectConversation={handleJoinRoom}
            onCreateRoom={() => setShowCreateDialog(true)}
            currentUser={currentUser}
          />
        </div>

        <div className="flex-1 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center transition-all duration-500 p-6">
          <div className="text-center max-w-lg mx-auto w-full animate-scale-in">
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-105 transition-all duration-300">
                <img 
                  src={logoUrl} 
                  alt="TalkRoom Logo" 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-gray-900 dark:text-white">
                Bienvenue, {currentUser.displayName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-6">
                Commencez une nouvelle conversation ou rejoignez-en une existante
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid gap-4 mb-8">
              <div 
                onClick={() => setShowCreateDialog(true)}
                className="group modern-card p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0"
              >
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg mb-1">Créer une room</h3>
                    <p className="text-white/80 text-sm">Démarrez une nouvelle conversation sécurisée</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setShowJoinDialog(true)}
                className="group modern-card p-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ExternalLink className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">Rejoindre une room</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Accédez avec un code d'invitation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Chiffré E2E</p>
              </div>
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Éphémère</p>
              </div>
              <div className="modern-card p-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Anonyme</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Room Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md mx-4 floating-card border-0">
            <DialogHeader className="text-center pb-6">
              <div className="w-16 h-16 gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Créer une room</DialogTitle>
              <p className="text-gray-600 dark:text-gray-400">Configurez votre espace de discussion privé</p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="roomName" className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 block">
                  Nom de la room
                </Label>
                <Input
                  id="roomName"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ma Super Room"
                  className="h-12 text-lg border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-750"
                  data-testid="input-room-name"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 block">Type de room</Label>
                <RadioGroup
                  value={newRoom.type}
                  onValueChange={(value: 'public' | 'private') => 
                    setNewRoom(prev => ({ ...prev, type: value }))
                  }
                  className="space-y-3"
                >
                  <Card className="modern-card p-5 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200" onClick={() => setNewRoom(prev => ({ ...prev, type: 'public' }))}>
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="public" id="public" className="text-green-500" />
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md">
                          <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <Label htmlFor="public" className="font-bold cursor-pointer text-gray-900 dark:text-white text-base">
                            Room publique
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tout le monde peut rejoindre avec le lien
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="modern-card p-5 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200" onClick={() => setNewRoom(prev => ({ ...prev, type: 'private' }))}>
                    <div className="flex items-center space-x-4">
                      <RadioGroupItem value="private" id="private" className="text-blue-500" />
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <Label htmlFor="private" className="font-bold cursor-pointer text-gray-900 dark:text-white text-base">
                            Room privée
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Accès restreint aux invités uniquement
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </RadioGroup>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  className="flex-1 h-12 gradient-primary hover:opacity-90 text-white transition-all duration-200 transform hover:scale-[1.02] rounded-xl shadow-lg font-semibold"
                  data-testid="button-create-room-confirm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Room Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="max-w-md mx-4 floating-card border-0">
            <DialogHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                <ExternalLink className="w-8 h-8 text-white" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Rejoindre une room
              </DialogTitle>
              <p className="text-gray-600 dark:text-gray-400">Entrez le code d'invitation pour accéder à la conversation</p>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 block">Code de la room</Label>
                <Input
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="h-14 text-xl text-center font-mono border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl tracking-[0.2em] bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-750"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoomByCode()}
                  data-testid="input-join-room-code"
                  maxLength={8}
                />
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                      Le code est généralement composé de 6-8 caractères
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowJoinDialog(false)}
                  className="flex-1 h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleJoinRoomByCode}
                  className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] rounded-xl shadow-lg font-semibold"
                  disabled={!joinRoomCode.trim()}
                  data-testid="button-join-room-confirm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Accéder à la room
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show the chat room
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  
  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar with conversations (hidden on mobile when in chat) */}
      <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 ${selectedConversationId ? 'hidden md:block' : 'block'} transition-all duration-300`}>
        <ConversationsList
          conversations={conversations}
          onSelectConversation={handleJoinRoom}
          onCreateRoom={() => setShowCreateDialog(true)}
          onJoinRoom={() => setShowJoinDialog(true)}
          onShareRoom={copyRoomLink}
          currentUser={currentUser}
        />
      </div>

      {/* Chat Room */}
      <div className="flex-1">
        {selectedConversation && (
          <SimpleChatRoom
            roomCode={selectedConversation.id}
            roomName={selectedConversation.name}
            currentUser={currentUser}
            onBack={() => setSelectedConversationId(null)}
            onCopyLink={() => copyRoomLink(selectedConversation.id)}
          />
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Créer une nouvelle room</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <Label htmlFor="roomName" className="text-sm font-medium">
                Nom de la room
              </Label>
              <Input
                id="roomName"
                value={newRoom.name}
                onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ma Super Room"
                className="mt-1"
                data-testid="input-room-name"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Type de room</Label>
              <RadioGroup
                value={newRoom.type}
                onValueChange={(value: 'public' | 'private') => 
                  setNewRoom(prev => ({ ...prev, type: value }))
                }
                className="mt-2"
              >
                <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => setNewRoom(prev => ({ ...prev, type: 'public' }))}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="public" id="public" />
                    <div className="flex items-center space-x-2 flex-1">
                      <Globe className="w-5 h-5 text-green-500" />
                      <div>
                        <Label htmlFor="public" className="font-medium cursor-pointer">
                          Room publique
                        </Label>
                        <p className="text-xs text-gray-500">
                          Tout le monde peut rejoindre
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 cursor-pointer hover:bg-gray-50" onClick={() => setNewRoom(prev => ({ ...prev, type: 'private' }))}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="private" id="private" />
                    <div className="flex items-center space-x-2 flex-1">
                      <Lock className="w-5 h-5 text-blue-500" />
                      <div>
                        <Label htmlFor="private" className="font-medium cursor-pointer">
                          Room privée
                        </Label>
                        <p className="text-xs text-gray-500">
                          Accès via lien uniquement
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </RadioGroup>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateRoom}
                className="flex-1 gradient-emerald-cyan hover-gradient-emerald-cyan text-white transition-all duration-200"
                data-testid="button-create-room-confirm"
              >
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}