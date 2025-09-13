import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Clock, Zap, Shield } from 'lucide-react';

export type ExpiryDuration = '15s' | '1min' | '5min' | '1h' | '24h' | 'never';

interface MessageExpirySelectorProps {
  selectedDuration: ExpiryDuration;
  onDurationChange: (duration: ExpiryDuration) => void;
  deleteAfterRead: boolean;
  onDeleteAfterReadChange: (deleteAfterRead: boolean) => void;
}

const EXPIRY_OPTIONS: { 
  value: ExpiryDuration; 
  label: string; 
  icon: string; 
  color: string;
}[] = [
  { value: '15s', label: '15 secondes', icon: '⚡', color: 'text-red-500' },
  { value: '1min', label: '1 minute', icon: '🔥', color: 'text-orange-500' },
  { value: '5min', label: '5 minutes', icon: '⏰', color: 'text-yellow-500' },
  { value: '1h', label: '1 heure', icon: '⌚', color: 'text-blue-500' },
  { value: '24h', label: '24 heures', icon: '📅', color: 'text-green-500' },
  { value: 'never', label: 'Permanent', icon: '♾️', color: 'text-gray-500' },
];

export function MessageExpirySelector({ 
  selectedDuration, 
  onDurationChange,
  deleteAfterRead,
  onDeleteAfterReadChange
}: MessageExpirySelectorProps) {
  const selectedOption = EXPIRY_OPTIONS.find(opt => opt.value === selectedDuration);

  return (
    <div className="flex items-center space-x-2">
      {/* Duration Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs border-gray-300 hover:bg-gray-50"
            data-testid="button-expiry-selector"
          >
            <Clock className="w-3 h-3 mr-1" />
            {selectedOption?.icon} {selectedOption?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {EXPIRY_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onDurationChange(option.value)}
              className="flex items-center space-x-2 cursor-pointer"
              data-testid={`option-${option.value}`}
            >
              <span className="text-sm">{option.icon}</span>
              <span className={option.color}>{option.label}</span>
              {selectedDuration === option.value && (
                <span className="ml-auto text-emerald-500">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete after read option */}
      {selectedDuration !== 'never' && (
        <Button
          variant={deleteAfterRead ? "default" : "outline"}
          size="sm"
          onClick={() => onDeleteAfterReadChange(!deleteAfterRead)}
          className={`h-8 px-3 text-xs ${
            deleteAfterRead 
              ? 'bg-purple-500 hover:bg-purple-600 text-white' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
          data-testid="button-delete-after-read"
        >
          <Shield className="w-3 h-3 mr-1" />
          {deleteAfterRead ? 'Suppr. lecture' : 'Lecture'}
        </Button>
      )}
    </div>
  );
}