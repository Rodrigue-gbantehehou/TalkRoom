import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthForm } from '@/components/auth/AuthForm';
import { Dashboard } from '@/pages/dashboard';
import { authService } from '@/lib/auth';
import '@/styles/mobile.css';
import '@/styles/animations.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

interface User {
  id: string;
  username: string;
  displayName: string;
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        if (user) {
          // Vérifier la validité du token
          const result = await authService.verifyToken();
          if (result.success && result.user) {
            setCurrentUser(result.user);
          } else {
            // Token invalide, nettoyer
            authService.logout();
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <div className="text-white text-center relative z-10">
          <div className="animate-spin w-12 h-12 border-3 border-purple-400 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-xl font-medium">Chargement de TalkRoom...</p>
          <p className="text-gray-400 text-sm mt-2">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-900">
        <Switch>
          <Route path="/">
            {currentUser ? (
              <Dashboard currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <AuthForm onAuthSuccess={handleAuthSuccess} />
            )}
          </Route>
          
          <Route path="/join/:roomId">
            {(params) => {
              if (!currentUser) {
                return <AuthForm onAuthSuccess={handleAuthSuccess} />;
              }
              // TODO: Implement direct room join with params.roomId
              return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
            }}
          </Route>
          
          <Route>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              </div>
              <div className="text-center relative z-10">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-gray-300 mb-4">Page non trouvée</p>
                <a 
                  href="/" 
                  className="text-purple-400 hover:text-purple-300 underline transition-colors duration-200"
                >
                  Retour à l'accueil
                </a>
              </div>
            </div>
          </Route>
        </Switch>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;