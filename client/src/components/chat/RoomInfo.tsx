import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface RoomInfoProps {
  roomCode: string;
  messageCount: number;
  userCount: number;
  isAdmin: boolean;
  onClearMessages: () => void;
  onExportConversation: () => void;
}

export function RoomInfo({ 
  roomCode, 
  messageCount, 
  userCount, 
  isAdmin, 
  onClearMessages, 
  onExportConversation 
}: RoomInfoProps) {
  const { toast } = useToast();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast({
        title: "Succès",
        description: "Code de salle copié dans le presse-papiers !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le code de salle",
        variant: "destructive"
      });
    }
  };

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}?room=${roomCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez ma salle de chat',
          text: `Rejoignez-moi dans la salle ${roomCode}`,
          url: shareUrl
        });
      } catch (error) {
        // Fallback to copy
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Lien copié",
          description: "Le lien de partage a été copié dans le presse-papiers",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié",
        description: "Le lien de partage a été copié dans le presse-papiers",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Sharing */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-4 text-center">
        <h3 className="font-semibold mb-3">
          <i className="fas fa-share-alt mr-2"></i>
          Partager la salle
        </h3>
        <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-sm font-mono mb-3" data-testid="room-code-display">
          {roomCode}
        </div>
        
        {/* Desktop buttons */}
        <div className="hidden md:flex gap-2 justify-center">
          <Button
            onClick={copyRoomCode}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
            data-testid="button-copy-room-code"
          >
            <i className="fas fa-copy mr-1"></i>
            Copier le code
          </Button>
          <Button
            onClick={shareRoom}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
            data-testid="button-share-room"
          >
            <i className="fas fa-external-link-alt mr-1"></i>
            Partager le lien
          </Button>
        </div>
        
        {/* Mobile dropdown menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors">
                <i className="fas fa-ellipsis-h mr-1"></i>
                Options de partage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={copyRoomCode}>
                <i className="fas fa-copy mr-2"></i>
                Copier le code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareRoom}>
                <i className="fas fa-external-link-alt mr-2"></i>
                Partager le lien
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Room Stats */}
      <div className="bg-muted/50 rounded-2xl p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar"></i>
          Statistiques
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-message-count">
              {messageCount}
            </div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="bg-card rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500" data-testid="stat-user-count">
              {userCount}
            </div>
            <div className="text-xs text-muted-foreground">Utilisateurs</div>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="bg-muted/50 rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <i className="fas fa-cog"></i>
            Contrôles Admin
          </h3>
          
          <div className="space-y-2">
            <Button
              onClick={onClearMessages}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground py-2 px-4 rounded-lg text-sm transition-colors"
              data-testid="button-clear-messages"
            >
              <i className="fas fa-trash mr-2"></i>
              Effacer tous les messages
            </Button>
            
            <Button
              onClick={onExportConversation}
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 px-4 rounded-lg text-sm transition-colors"
              data-testid="button-export-conversation"
            >
              <i className="fas fa-download mr-2"></i>
              Exporter la conversation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
