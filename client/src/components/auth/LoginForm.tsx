import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onJoin: (username: string, roomId: string, role: 'user' | 'admin') => void;
  isConnecting?: boolean;
}

export function LoginForm({ onJoin, isConnecting }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nom d'utilisateur",
        variant: "destructive"
      });
      return;
    }

    if (username.length > 20) {
      toast({
        title: "Erreur", 
        description: "Le nom d'utilisateur ne peut pas dépasser 20 caractères",
        variant: "destructive"
      });
      return;
    }

    onJoin(username.trim(), roomId.trim(), 'user');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-lg bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 rounded-3xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <i className="fas fa-comments text-3xl text-white"></i>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Mini Messagerie
            </h1>
            <p className="text-purple-200 text-lg">
              Chat sécurisé et éphémère
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-purple-200 mb-3">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Votre nom"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4"
                data-testid="input-username"
              />
            </div>

            <div>
              <Label htmlFor="roomId" className="block text-sm font-medium text-purple-200 mb-3">
                Code de la salle (optionnel)
              </Label>
              <Input
                id="roomId"
                type="text"
                placeholder="Laissez vide pour créer une nouvelle salle"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4"
                data-testid="input-room-code"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02]"
              disabled={isConnecting}
              data-testid="button-join-chat"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Connexion...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <i className="fas fa-sign-in-alt"></i>
                  Rejoindre le Chat
                </div>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/20 text-center">
            <div className="bg-white/5 rounded-2xl p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <i className="fas fa-info-circle text-purple-300"></i>
                <span className="text-purple-200 font-medium">Comment ça marche ?</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Créez une salle ou rejoignez-en une avec le code.
                <br />Partagez le code avec vos amis pour discuter en sécurité !
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
