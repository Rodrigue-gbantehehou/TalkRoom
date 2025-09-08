class SessionStorage {
  set<T>(key: string, value: T): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    }
  }

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    const item = window.sessionStorage.getItem(key);
    if (!item) return null;
    
    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
  }
}

export const sessionStorage = new SessionStorage();

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