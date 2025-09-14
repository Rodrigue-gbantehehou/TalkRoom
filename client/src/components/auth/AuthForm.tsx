import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { User, Lock, Eye, EyeOff, MessageCircle, Sparkles } from "lucide-react";
import logoUrl from '@assets/tallk_room copieFF_1757358775756.png';

interface AuthFormProps {
  onAuthSuccess: (user: { id: string; username: string; displayName: string }) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; displayName?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (mode === 'signup' && password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (mode === 'signup' && !displayName.trim()) {
      newErrors.displayName = 'Le nom d\'affichage est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = mode === "signup" 
        ? await authService.signup({ email: email.trim(), password, displayName: displayName.trim() })
        : await authService.login({ email: email.trim(), password });

      if (!result.success) {
        throw new Error(result.message || "Erreur inconnue");
      }

      if (result.user) {
        onAuthSuccess(result.user);
        toast({
          title: "Succès",
          description: mode === "signup" ? "Compte créé avec succès !" : "Connexion réussie !",
        });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      toast({ 
        title: "Erreur", 
        description: err.message || "Impossible de se connecter", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden relative z-10">
        <CardHeader className="text-center pb-6 pt-8 px-8">
          <div className="flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-75 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            TalkRoom
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
          </CardTitle>
          <p className="text-gray-300 text-lg font-medium">
            {mode === "login" ? "Bon retour parmi nous !" : "Rejoignez la communauté"}
          </p>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold mb-3 text-white">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  className={`pl-12 h-14 text-lg rounded-xl border-2 transition-all duration-300 ${
                    errors.email 
                      ? 'border-red-400 focus:border-red-500 bg-red-500/10' 
                      : 'border-white/20 focus:border-purple-400 hover:border-white/30'
                  } bg-white/10 backdrop-blur-sm text-white placeholder:text-gray-400 focus:bg-white/20`}
                  placeholder="votre@email.com"
                  disabled={isLoading}
                  data-testid="input-email"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm mt-2 font-medium animate-fade-in" data-testid="error-email">{errors.email}</p>
              )}
            </div>

            {mode === "signup" && (
              <div className="space-y-2 animate-fade-in">
                <label htmlFor="displayName" className="block text-sm font-semibold mb-3 text-white">
                  Nom d'affichage
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName) setErrors(prev => ({ ...prev, displayName: undefined }));
                    }}
                    className={`pl-12 h-14 text-lg rounded-xl border-2 transition-all duration-300 ${
                      errors.displayName 
                        ? 'border-red-400 focus:border-red-500 bg-red-500/10' 
                        : 'border-white/20 focus:border-purple-400 hover:border-white/30'
                    } bg-white/10 backdrop-blur-sm text-white placeholder:text-gray-400 focus:bg-white/20`}
                    placeholder="Votre nom"
                    disabled={isLoading}
                    data-testid="input-displayName"
                  />
                </div>
                {errors.displayName && (
                  <p className="text-red-400 text-sm mt-2 font-medium animate-fade-in" data-testid="error-displayName">{errors.displayName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold mb-3 text-white">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-12 pr-12 h-14 text-lg rounded-xl border-2 transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-400 focus:border-red-500 bg-red-500/10' 
                      : 'border-white/20 focus:border-purple-400 hover:border-white/30'
                  } bg-white/10 backdrop-blur-sm text-white placeholder:text-gray-400 focus:bg-white/20`}
                  placeholder="••••••••"
                  disabled={isLoading}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-2 font-medium animate-fade-in" data-testid="error-password">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-purple-500/25 relative overflow-hidden group"
              disabled={isLoading}
              data-testid="button-submit"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              {isLoading ? (
                <div className="flex items-center space-x-2 relative z-10">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>{mode === "login" ? "Connexion..." : "Inscription..."}</span>
                </div>
              ) : (
                <span className="relative z-10">{mode === "login" ? "Se connecter" : "Créer mon compte"}</span>
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <div className="text-gray-300 text-sm">
              {mode === "login" ? (
                <span>
                  Pas encore de compte ?{" "}
                  <button 
                    className="text-purple-400 hover:text-purple-300 underline font-medium transition-colors duration-200" 
                    onClick={() => {
                      setMode("signup");
                      setErrors({});
                      setEmail("");
                      setDisplayName("");
                      setPassword("");
                    }}
                  >
                    S'inscrire
                  </button>
                </span>
              ) : (
                <span>
                  Déjà un compte ?{" "}
                  <button 
                    className="text-purple-400 hover:text-purple-300 underline font-medium transition-colors duration-200" 
                    onClick={() => {
                      setMode("login");
                      setErrors({});
                      setEmail("");
                      setDisplayName("");
                      setPassword("");
                    }}
                  >
                    Se connecter
                  </button>
                </span>
              )}
            </div>
          </div>
          
          {mode === "signup" && (
            <div className="mt-6 flex justify-center space-x-6 text-xs text-gray-400">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Sécurisé</span>
              </span>
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>Privé</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
