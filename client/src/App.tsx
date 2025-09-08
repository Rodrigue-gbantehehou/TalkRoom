import { useState, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { UserSetup } from '@/components/auth/UserSetup';
import { Dashboard } from '@/pages/dashboard';
import { sessionStorage } from '@/lib/sessionStorage';

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
    // Check if user data exists in session storage
    const savedUser = sessionStorage.get<User>('talkroom_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const handleUserSetup = (userData: { username: string; displayName: string }) => {
    const user: User = {
      id: Date.now().toString(), // Simple ID generation for demo
      username: userData.username,
      displayName: userData.displayName
    };
    
    setCurrentUser(user);
    sessionStorage.set('talkroom_user', user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.remove('talkroom_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Chargement de TalkRoom...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100">
        <Switch>
          <Route path="/">
            {currentUser ? (
              <Dashboard currentUser={currentUser} onLogout={handleLogout} />
            ) : (
              <UserSetup onComplete={handleUserSetup} />
            )}
          </Route>
          
          <Route path="/join/:roomId">
            {(params) => {
              if (!currentUser) {
                return <UserSetup onComplete={handleUserSetup} />;
              }
              // TODO: Implement direct room join with params.roomId
              return <Dashboard currentUser={currentUser} onLogout={handleLogout} />;
            }}
          </Route>
          
          <Route>
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page non trouvée</p>
                <a 
                  href="/" 
                  className="text-emerald-500 hover:text-emerald-600 underline"
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