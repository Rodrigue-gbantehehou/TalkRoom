import React from 'react';
import { Button } from './button';
import { FaTimes, FaTrash, FaDownload } from 'react-icons/fa';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export function ImageModal({ isOpen, imageUrl, onClose, onDelete, canDelete }: ImageModalProps) {
  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* Header avec boutons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            onClick={handleDownload}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 p-2 rounded-lg transition-colors"
            title="Télécharger"
          >
            <FaDownload />
          </Button>
          {canDelete && (
            <Button
              onClick={onDelete}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 p-2 rounded-lg transition-colors"
              title="Supprimer"
            >
              <FaTrash />
            </Button>
          )}
          <Button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-colors"
            title="Fermer"
          >
            <FaTimes />
          </Button>
        </div>

        {/* Image */}
        <img
          src={imageUrl}
          alt="Image agrandie"
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        />
      </div>
    </div>
  );
}