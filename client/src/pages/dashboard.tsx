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
import { Plus, Globe, Lock, Copy, ExternalLink } from 'lucide-react';
import { ChatProvider } from '@/context/ChatContext';

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

        <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors duration-300">
          <div className="text-center text-gray-500 dark:text-gray-400 animate-scale-in">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-200 to-cyan-200 dark:from-emerald-800 dark:to-cyan-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Plus className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Bienvenue sur TalkRoom</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm mx-auto">
              Sélectionnez une conversation ou créez une nouvelle room pour commencer à discuter
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="gradient-emerald-cyan hover-gradient-emerald-cyan text-white transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une room
            </Button>
          </div>
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

        {/* Join Room Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5 text-emerald-500" />
                <span>Rejoindre une room</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-sm font-medium">Code de la room</Label>
                <Input
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  className="mt-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoomByCode()}
                  data-testid="input-join-room-code"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Entrez le code de 6 caractères de la room
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowJoinDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleJoinRoomByCode}
                  className="flex-1 gradient-emerald-cyan hover-gradient-emerald-cyan text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!joinRoomCode.trim()}
                  data-testid="button-join-room-confirm"
                >
                  Rejoindre
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
      <div className={`w-80 border-r border-gray-200 dark:border-gray-700 ${selectedConversationId ? 'hidden md:block' : 'block'} transition-all duration-300`}>
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