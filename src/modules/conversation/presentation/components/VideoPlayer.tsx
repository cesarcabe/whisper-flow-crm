import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  thumbnailUrl?: string | null;
  className?: string;
}

export function VideoPlayer({ src, thumbnailUrl, className }: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('max-w-[280px]', className)}>
      <div className="relative rounded-lg overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <Play className="h-8 w-8 text-white" />
          </div>
        )}
        <video
          src={src}
          controls
          preload="metadata"
          poster={thumbnailUrl || undefined}
          className="w-full h-auto max-h-[240px] object-cover"
          onLoadedMetadata={() => setIsLoaded(true)}
        />
      </div>
    </div>
  );
}
