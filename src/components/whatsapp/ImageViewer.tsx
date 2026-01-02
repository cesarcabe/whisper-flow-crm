import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  isOutgoing?: boolean;
}

export function ImageViewer({ src, alt = 'Imagem', caption, isOutgoing }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.5, 0.5));

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `imagem-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  if (imageError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <span>📷</span>
        <span>Imagem indisponível</span>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-[280px] cursor-pointer" onClick={() => setIsOpen(true)}>
        <img
          src={src}
          alt={alt}
          className="rounded-lg max-w-full h-auto object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        {caption && caption !== '📷 Imagem' && (
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{caption}</p>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none">
          <div className="relative flex flex-col h-full">
            {/* Header with controls */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[300px]">
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>

            {/* Caption */}
            {caption && caption !== '📷 Imagem' && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-sm text-center">{caption}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
