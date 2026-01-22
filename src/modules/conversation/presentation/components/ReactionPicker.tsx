import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function ReactionPicker({ onSelect, children, side = 'top' }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        className="w-auto p-1.5 bg-popover/95 backdrop-blur-sm border shadow-lg"
        sideOffset={5}
      >
        <div className="flex gap-1">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className={cn(
                "w-9 h-9 text-xl rounded-full",
                "hover:bg-accent hover:scale-110 transition-all duration-150",
                "flex items-center justify-center"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
