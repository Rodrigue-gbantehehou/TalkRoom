import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { FaUser, FaCamera, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

interface UserSetupProps {
  onComplete: (userData: {
    username: string;
    displayName: string;
    bio?: string;
    avatarUrl?: string;
  }) => void;
  isLoading?: boolean;
}

export function UserSetup({ onComplete, isLoading }: UserSetupProps) {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: ''
  });
  const { toast } = useToast();

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!userData.username.trim() || !userData.displayName.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom d'utilisateur et le nom d'affichage sont requis",
          variant: "destructive"
        });
        return false;
      }
      
      if (userData.username.length < 3 || userData.username.length > 20) {
        toast({
          title: "Erreur",
          description: "Le nom d'utilisateur doit faire entre 3 et 20 caractères",
          variant: "destructive"
        });
        return false;
      }

      // Check for valid username format (letters, numbers, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
        toast({
          title: "Erreur",
          description: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -",
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const handleComplete = () => {
    if (validateStep(step)) {
      onComplete(userData);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Erreur",
          description: "L'image ne peut pas dépasser 5MB",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUserData({ ...userData, avatarUrl: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = () => {
    if (userData.displayName) {
      return userData.displayName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
    }
    return userData.username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Card className="w-full max-w-lg bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 rounded-3xl">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <FaUser className="text-3xl text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 1 ? "Créer votre profil" : "Personnaliser"}
            </h1>
            <p className="text-purple-200">
              {step === 1 ? "Choisissez votre identité" : "Ajoutez photo et bio (optionnel)"}
            </p>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="username" className="block text-sm font-medium text-purple-200 mb-3">
                  Nom d'utilisateur *
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="votrenomdutilisateur"
                  value={userData.username}
                  onChange={(e) => setUserData({ ...userData, username: e.target.value.toLowerCase() })}
                  maxLength={20}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4"
                  data-testid="input-username"
                />
                <p className="text-xs text-purple-300 mt-1">
                  3-20 caractères, lettres, chiffres, _ et - uniquement
                </p>
              </div>

              <div>
                <Label htmlFor="displayName" className="block text-sm font-medium text-purple-200 mb-3">
                  Nom d'affichage *
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Votre nom complet"
                  value={userData.displayName}
                  onChange={(e) => setUserData({ ...userData, displayName: e.target.value })}
                  maxLength={50}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4"
                  data-testid="input-display-name"
                />
              </div>

              <Button 
                onClick={nextStep}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                data-testid="button-next-step"
              >
                Continuer
                <FaArrowRight className="ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Avatar & Bio */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="text-center">
                <div className="relative inline-block">
                  <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                    <AvatarImage src={userData.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute bottom-0 right-0 bg-purple-500 hover:bg-purple-600 text-white rounded-full p-2 cursor-pointer transition-all duration-200 shadow-lg">
                    <FaCamera />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      data-testid="input-avatar-upload"
                    />
                  </label>
                </div>
                <p className="text-purple-300 text-sm mt-2">
                  Cliquez sur l'appareil photo pour ajouter une photo
                </p>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio" className="block text-sm font-medium text-purple-200 mb-3">
                  Bio (optionnel)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Parlez de vous..."
                  value={userData.bio}
                  onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                  maxLength={150}
                  rows={3}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl p-4 resize-none"
                  data-testid="textarea-bio"
                />
                <p className="text-xs text-purple-300 mt-1">
                  {userData.bio.length}/150 caractères
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={prevStep}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl py-4"
                  data-testid="button-prev-step"
                >
                  <FaArrowLeft className="mr-2" />
                  Retour
                </Button>
                
                <Button 
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl py-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                  data-testid="button-complete-setup"
                >
                  {isLoading ? "Création..." : "Commencer à chatter !"}
                </Button>
              </div>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-purple-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-purple-400' : 'bg-white/20'}`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}