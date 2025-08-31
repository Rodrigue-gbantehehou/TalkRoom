import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  onJoin: (username: string, roomId: string, role: 'user' | 'admin') => void;
  isConnecting?: boolean;
}

export function LoginForm({ onJoin, isConnecting }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
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

    onJoin(username.trim(), roomId.trim(), role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-700">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-lg shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              <i className="fas fa-comments mr-2"></i>
              Mini Messagerie
            </h1>
            <h2 className="text-xl font-semibold text-foreground">
              <i className="fas fa-rocket mr-2"></i>
              Rejoindre le Chat
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-muted-foreground mb-2">
                Nom d'utilisateur:
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Entrez votre nom"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="w-full"
                data-testid="input-username"
              />
            </div>

            <div>
              <Label htmlFor="roomId" className="block text-sm font-medium text-muted-foreground mb-2">
                Code de la salle:
              </Label>
              <Input
                id="roomId"
                type="text"
                placeholder="Laissez vide pour créer une nouvelle salle"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full"
                data-testid="input-room-code"
              />
            </div>

            <div>
              <Label htmlFor="role" className="block text-sm font-medium text-muted-foreground mb-2">
                Type d'utilisateur:
              </Label>
              <Select value={role} onValueChange={(value: 'user' | 'admin') => setRole(value)}>
                <SelectTrigger className="w-full" data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utilisateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 transition-all duration-200 hover:shadow-lg hover:scale-105"
              disabled={isConnecting}
              data-testid="button-join-chat"
            >
              {isConnecting ? 'Connexion...' : 'Rejoindre le Chat'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              <i className="fas fa-clipboard mr-2"></i>
              Comment partager ?
            </h3>
            <p className="text-muted-foreground text-sm">
              Une fois connecté, vous obtiendrez un code de salle à partager avec vos amis !
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
