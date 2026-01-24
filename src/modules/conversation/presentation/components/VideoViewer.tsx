import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

interface VideoViewerProps {
  src: string;
  caption?: string;
  isOutgoing?: boolean;
}

export function VideoViewer({ src, caption, isOutgoing }: VideoViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail/Preview */}
      <div 
        className="relative cursor-pointer group"
        onClick={() => setIsOpen(true)}
      >
        <video
          src={src}
          className="max-w-[280px] max-h-[200px] rounded-lg object-cover"
          preload="metadata"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-800 ml-0.5" />
          </div>
        </div>
        {caption && (
          <p className={cn(
            "text-sm mt-1",
            isOutgoing ? "text-[hsl(var(--message-sent-text))]" : "text-[hsl(var(--message-received-text))]"
          )}>
            {caption}
          </p>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <VisuallyHidden>
            <DialogTitle>Visualizar vídeo</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center min-h-[60vh]">
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
