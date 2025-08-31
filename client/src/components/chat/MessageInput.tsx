import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onTypingStart, onTypingStop, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
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
      onSendMessage(message.trim());
      setMessage('');
      onTypingStop();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
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
        <i className="fas fa-paper-plane"></i>
      </Button>
    </form>
  );
}
