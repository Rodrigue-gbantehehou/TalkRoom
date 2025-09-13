import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageExpirySelector, type ExpiryDuration } from './MessageExpirySelector';
import { ImageUpload } from './ImageUpload';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Send, Smile } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (
    content: string, 
    type?: 'text' | 'image', 
    imageData?: string, 
    expiryDuration?: ExpiryDuration,
    deleteAfterRead?: boolean
  ) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onTypingStart, onTypingStop, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expiryDuration, setExpiryDuration] = useState<ExpiryDuration>('1h');
  const [deleteAfterRead, setDeleteAfterRead] = useState(false);
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
      onSendMessage(message.trim(), 'text', undefined, expiryDuration, deleteAfterRead);
      setMessage('');
      onTypingStop();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleImageSelect = (imageData: string) => {
    onSendMessage('Image partagée', 'image', imageData, expiryDuration, deleteAfterRead);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t bg-white">
      {/* Expiry Settings Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b">
        <MessageExpirySelector
          selectedDuration={expiryDuration}
          onDurationChange={setExpiryDuration}
          deleteAfterRead={deleteAfterRead}
          onDeleteAfterReadChange={setDeleteAfterRead}
        />
      </div>

      {/* Message Input */}
      <div className="relative p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
              {/* Emoji Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-8 w-8 p-0 hover:bg-gray-200"
                data-testid="button-emoji"
              >
                <Smile className="w-5 h-5 text-gray-500" />
              </Button>

              {/* Message Input */}
              <Input
                type="text"
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                disabled={disabled}
                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-sm"
                data-testid="input-message"
              />

              {/* Image Upload */}
              <ImageUpload onImageSelect={handleImageSelect} />
            </div>
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="sm"
            disabled={disabled || !message.trim()}
            className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 mb-2 z-50">
            <EmojiPicker 
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect} 
            />
          </div>
        )}
      </div>
    </div>
  );
}