import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { FaPlus, FaUsers, FaLock, FaGlobe, FaArrowRight, FaComments } from 'react-icons/fa';
import { Room } from '@shared/schema';

interface RoomSelectionProps {
  onJoinRoom: (roomId: string, roomType: 'new' | 'existing') => void;
  isLoading?: boolean;
}

export function RoomSelection({ onJoinRoom, isLoading }: RoomSelectionProps) {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [roomCode, setRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'public' | 'private'>('public');
  const { toast } = useToast();

  // Check for room code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
      setRoomCode(roomFromUrl);
      setMode('join');
      toast({
        title: "Salle détectée",
        description: `Vous rejoignez la salle ${roomFromUrl}`,
      });
    }
  }, [toast]);

  // Fetch recent/public rooms (for future use)
  const { data: publicRooms } = useQuery({
    queryKey: ['/api/rooms/public'],
    enabled: false // Disable for now, will implement later
  });

  const handleJoinExisting = () => {
    if (!roomCode.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code de salle",
        variant: "destructive"
      });
      return;
    }

    onJoinRoom(roomCode.trim().toUpperCase(), 'existing');
  };

  const handleCreateNew = () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom pour la salle",
        variant: "destructive"
      });
      return;
    }

    // For now, we'll create with a generated ID
    onJoinRoom('', 'new');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-lg bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 rounded-3xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <FaComments className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              TalkRoom
            </h1>
            <p className="text-purple-200">
              Rejoignez ou créez une salle de chat
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-3 px-4 rounded-xl transition-all duration-300 font-medium ${
                mode === 'join' 
                  ? 'bg-purple-500 text-white shadow-lg' 
                  : 'text-purple-200 hover:text-white'
              }`}
              data-testid="button-join-mode"
            >
              <FaUsers className="inline mr-2" />
              Rejoindre
            </button>
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-3 px-4 rounded-xl transition-all duration-300 font-medium ${
                mode === 'create' 
                  ? 'bg-purple-500 text-white shadow-lg' 
                  : 'text-purple-200 hover:text-white'
              }`}
              data-testid="button-create-mode"
            >
              <FaPlus className="inline mr-2" />
              Créer
            </button>
          </div>

          {/* Join Mode */}
          {mode === 'join' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="roomCode" className="block text-sm font-medium text-purple-200 mb-3">
                  Code de la salle
                </Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Entrez le code (ex: ABC123)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4 text-center font-mono text-lg"
                  data-testid="input-room-code"
                />
              </div>

              <Button 
                onClick={handleJoinExisting}
                disabled={isLoading || !roomCode.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                data-testid="button-join-room"
              >
                {isLoading ? "Connexion..." : "Rejoindre la salle"}
                <FaArrowRight className="ml-2" />
              </Button>
            </div>
          )}

          {/* Create Mode */}
          {mode === 'create' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="roomName" className="block text-sm font-medium text-purple-200 mb-3">
                  Nom de la salle
                </Label>
                <Input
                  id="roomName"
                  type="text"
                  placeholder="Ma super salle de chat"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4"
                  data-testid="input-room-name"
                />
              </div>

              {/* Room Type Selector */}
              <div>
                <Label className="block text-sm font-medium text-purple-200 mb-3">
                  Type de salle
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewRoomType('public')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      newRoomType === 'public'
                        ? 'border-purple-400 bg-purple-400/10 text-white'
                        : 'border-white/20 bg-white/5 text-purple-200 hover:border-purple-400/50 hover:text-white'
                    }`}
                    data-testid="button-room-type-public"
                  >
                    <FaGlobe className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Publique</div>
                    <div className="text-xs opacity-80 mt-1">Visible par tous</div>
                  </button>

                  <button
                    onClick={() => setNewRoomType('private')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      newRoomType === 'private'
                        ? 'border-purple-400 bg-purple-400/10 text-white'
                        : 'border-white/20 bg-white/5 text-purple-200 hover:border-purple-400/50 hover:text-white'
                    }`}
                    data-testid="button-room-type-private"
                  >
                    <FaLock className="mx-auto mb-2" />
                    <div className="text-sm font-medium">Privée</div>
                    <div className="text-xs opacity-80 mt-1">Code requis</div>
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleCreateNew}
                disabled={isLoading || !newRoomName.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                data-testid="button-create-room"
              >
                {isLoading ? "Création..." : "Créer la salle"}
                <FaPlus className="ml-2" />
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              {mode === 'join' 
                ? "Demandez le code à l'administrateur de la salle"
                : "Un code unique sera généré pour votre salle"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}