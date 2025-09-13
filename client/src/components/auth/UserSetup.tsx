import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4 transition-all duration-500">
      <Card className="w-full max-w-md floating-card animate-scale-in border-0">
        <CardHeader className="text-center pb-8 pt-8">
          <div className="mx-auto mb-6 w-24 h-24 gradient-primary rounded-3xl flex items-center justify-center shadow-xl">
            <img 
              src={logoUrl} 
              alt="TalkRoom Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            TalkRoom
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Messages éphémères • Conversations sécurisées</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Choisissez votre pseudo
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`pl-12 h-14 text-lg rounded-xl border-2 transition-all duration-200 ${
                    errors.username 
                      ? 'border-red-400 focus:border-red-500' 
                      : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400'
                  } bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-750`}
                  placeholder="MonPseudo"
                  data-testid="input-username"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-2 font-medium" data-testid="error-username">{errors.username}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 text-lg gradient-primary hover:opacity-90 shadow-lg font-semibold text-white transition-all duration-200 transform hover:scale-[1.02] rounded-xl"
              data-testid="button-continue"
            >
              Commencer à discuter
            </Button>
          </form>
          
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Chiffré</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Anonyme</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Éphémère</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Aucune inscription requise • Démarrage instantané
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}