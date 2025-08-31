import React, { useState } from 'react';
import { Button } from './button';

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '👍', '👎', '👌', '✌️', '🤝', '🙏', '❤️', '💙', '💚', '💛',
  '🎉', '🎊', '🔥', '⭐', '✨', '💯', '💪', '🚀', '🎯', '✅'
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function EmojiPicker({ onEmojiSelect, isOpen, onClose }: EmojiPickerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 left-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-lg z-50 max-w-xs">
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_LIST.map((emoji, index) => (
          <Button
            key={index}
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
            className="p-1 text-xl hover:bg-white/20 rounded-lg transition-colors"
            variant="ghost"
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="flex justify-end mt-2">
        <Button
          onClick={onClose}
          className="text-xs text-white/70 hover:text-white"
          variant="ghost"
          size="sm"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
}