import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Settings, 
  LogOut, 
  Users, 
  Globe, 
  Lock, 
  Sparkles,
  Bell,
  Hash,
  Zap
} from 'lucide-react';

interface ModernDashboardProps {
  currentUser: {
    id: string;
    username: string;
    displayName: string;
  };
  onLogout: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function ModernDashboard({ currentUser, onLogout, onCreateRoom, onJoinRoom }: ModernDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data pour la démo
  const recentRooms = [
    { id: '1', name: 'Équipe Dev', type: 'private', participants: 8, lastActivity: '2 min', unread: 3 },
    { id: '2', name: 'Design System', type: 'public', participants: 15, lastActivity: '5 min', unread: 0 },
    { id: '3', name: 'Random', type: 'public', participants: 42, lastActivity: '1h', unread: 1 },
  ];

  const trendingRooms = [
    { id: '4', name: 'Tech News', participants: 128, topic: 'IA & Innovation' },
    { id: '5', name: 'Startup Hub', participants: 89, topic: 'Entrepreneuriat' },
    { id: '6', name: 'Code Review', participants: 67, topic: 'Développement' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-75 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  TalkRoom
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                </h1>
                <p className="text-gray-400 text-sm">Connectez-vous, échangez, créez</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher une room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400 transition-smooth"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/10 border border-white/20">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-white font-medium">{currentUser.displayName}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLogout}
                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-smooth"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Quick Actions */}
          <div className="space-y-6">
            {/* Welcome Card */}
            <Card className="glass border-white/20 hover-lift">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Bienvenue, {currentUser.displayName}!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 text-sm">
                  Prêt à rejoindre la conversation? Créez une nouvelle room ou explorez les discussions populaires.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={onCreateRoom}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transition-smooth hover-lift"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10 transition-smooth"
                  >
                    <Hash className="w-4 h-4 mr-2" />
                    Explorer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Votre activité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">12</div>
                    <div className="text-gray-400 text-sm">Rooms rejointes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">248</div>
                    <div className="text-gray-400 text-sm">Messages envoyés</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Recent Rooms */}
          <div className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Rooms récentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRooms.map((room) => (
                  <div 
                    key={room.id}
                    onClick={() => onJoinRoom(room.id)}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-smooth hover-lift group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          {room.type === 'private' ? (
                            <Lock className="w-5 h-5 text-white" />
                          ) : (
                            <Globe className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-medium group-hover:text-purple-300 transition-colors">
                            {room.name}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Users className="w-3 h-3" />
                            <span>{room.participants}</span>
                            <span>•</span>
                            <span>{room.lastActivity}</span>
                          </div>
                        </div>
                      </div>
                      {room.unread > 0 && (
                        <Badge className="bg-purple-500 text-white">
                          {room.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trending */}
          <div className="space-y-6">
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Tendances
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingRooms.map((room, index) => (
                  <div 
                    key={room.id}
                    onClick={() => onJoinRoom(room.id)}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-smooth hover-lift"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium text-sm">{room.name}</h4>
                        <p className="text-gray-400 text-xs">{room.topic}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-400 font-medium text-sm">{room.participants}</div>
                        <div className="text-gray-500 text-xs">membres</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Join Card */}
            <Card className="glass border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Rejoindre rapidement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input 
                  placeholder="Code de la room..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-400"
                />
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                  Rejoindre
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
