import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FaImage, FaTimes } from 'react-icons/fa';
import { compressImage } from '@/lib/sessionStorage';

interface ImageUploadProps {
  onImageSelect: (imageData: string) => void;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, disabled }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide.');
      return;
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne peut pas dépasser 5MB.');
      return;
    }

    try {
      // Compresser l'image
      const compressedImage = await compressImage(file, 800, 0.7);
      onImageSelect(compressedImage);
    } catch (error) {
      console.error('Erreur lors de la compression de l\'image:', error);
      alert('Erreur lors du traitement de l\'image.');
    }

    // Reset l'input
    event.target.value = '';
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 p-2 rounded-lg transition-colors"
        title="Envoyer une image"
      >
        <FaImage />
      </Button>
    </div>
  );
}