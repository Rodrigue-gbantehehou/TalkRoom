import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload } from './ImageUpload';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FaPaperPlane, FaSmile } from "react-icons/fa";

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image', imageData?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onTypingStart, onTypingStop, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.length > 0) {
      onTypingStart();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 1000);
    } else {
      onTypingStop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      onTypingStop();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleImageSelect = (imageData: string) => {
    onSendMessage('Image partagée', 'image', imageData);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <ImageUpload
          onImageSelect={handleImageSelect}
          disabled={disabled}
        />
        <Button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 p-2 rounded-lg transition-colors"
          title="Ajouter un emoji"
        >
          <FaSmile />
        </Button>
        <Input
          type="text"
          placeholder="Tapez votre message..."
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          className="flex-1 px-4 py-3 rounded-2xl focus:ring-4 focus:ring-primary/20"
          data-testid="input-message"
        />
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-2xl transition-all duration-200 hover:scale-105"
          data-testid="button-send-message"
        >
          <FaPaperPlane />
        </Button>
      </form>
      
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </div>
  );
}
