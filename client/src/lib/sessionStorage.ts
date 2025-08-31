// Service de stockage local temporaire pour l'historique de session
export class SessionStorageService {
  private static readonly SESSION_KEY = 'talkroom_session';
  private static readonly IMAGES_KEY = 'talkroom_images';
  
  static saveSession(roomCode: string, data: any) {
    try {
      const sessionData = {
        roomCode,
        timestamp: Date.now(),
        ...data
      };
      localStorage.setItem(`${this.SESSION_KEY}_${roomCode}`, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Impossible de sauvegarder la session:', error);
    }
  }
  
  static loadSession(roomCode: string) {
    try {
      const saved = localStorage.getItem(`${this.SESSION_KEY}_${roomCode}`);
      if (saved) {
        const data = JSON.parse(saved);
        // Vérifier que la session n'est pas trop ancienne (24h max)
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data;
        } else {
          this.clearSession(roomCode);
        }
      }
    } catch (error) {
      console.warn('Impossible de charger la session:', error);
    }
    return null;
  }
  
  static clearSession(roomCode: string) {
    localStorage.removeItem(`${this.SESSION_KEY}_${roomCode}`);
    localStorage.removeItem(`${this.IMAGES_KEY}_${roomCode}`);
  }
  
  static saveImage(roomCode: string, imageId: string, imageData: string) {
    try {
      const key = `${this.IMAGES_KEY}_${roomCode}_${imageId}`;
      localStorage.setItem(key, imageData);
    } catch (error) {
      console.warn('Impossible de sauvegarder l\'image:', error);
    }
  }
  
  static loadImage(roomCode: string, imageId: string): string | null {
    try {
      const key = `${this.IMAGES_KEY}_${roomCode}_${imageId}`;
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Impossible de charger l\'image:', error);
      return null;
    }
  }
  
  static saveMessages(roomCode: string, messages: any[]) {
    this.saveSession(roomCode, { messages });
  }
  
  static loadMessages(roomCode: string): any[] {
    const session = this.loadSession(roomCode);
    return session?.messages || [];
  }
}

// Utilitaire pour compresser les images
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculer les nouvelles dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir en base64
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.src = URL.createObjectURL(file);
  });
};