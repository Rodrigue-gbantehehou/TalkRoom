import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MessageCircle } from 'lucide-react';
import logoUrl from '@assets/tallk_room copieFF_1757358775756.png';

interface UserSetupProps {
  onComplete: (userData: { username: string; displayName: string }) => void;
}

export function UserSetup({ onComplete }: UserSetupProps) {
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<{ username?: string }>({});

  const validateForm = () => {
    const newErrors: { username?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Le pseudo est requis';
    } else if (username.length < 2) {
      newErrors.username = 'Le pseudo doit contenir au moins 2 caractères';
    } else if (username.length > 20) {
      newErrors.username = 'Le pseudo ne peut pas dépasser 20 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const cleanUsername = username.trim();
      onComplete({ 
        username: cleanUsername, 
        displayName: cleanUsername 
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 transition-all duration-500">
      <Card className="w-full max-w-md shadow-2xl border-0 glass-card animate-scale-in">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
            <img 
              src={logoUrl} 
              alt="TalkRoom Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            TalkRoom
          </CardTitle>
          <p className="text-gray-600 text-lg">Messages éphémères • Conversations privées</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-700">
                Choisissez votre pseudo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`pl-12 h-12 text-lg ${errors.username ? 'border-red-500' : 'border-gray-300'} focus:border-emerald-500 focus:ring-emerald-500`}
                  placeholder="MonPseudo"
                  data-testid="input-username"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-2" data-testid="error-username">{errors.username}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg gradient-emerald-cyan hover-gradient-emerald-cyan shadow-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
              data-testid="button-continue"
            >
              Commencer à discuter
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Aucun email requis • 🚀 Anonyme • ⏱️ Messages éphémères
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}