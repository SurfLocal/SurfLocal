import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: { url: string; media_type: string }[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox = ({ images, initialIndex, open, onClose }: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  const currentImage = images[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none [&>button.rounded-sm]:hidden" 
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <DialogDescription className="sr-only">
          View full size image
        </DialogDescription>
        <div className="relative flex items-center justify-center w-full h-[90vh]">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Previous button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Image/Video */}
          <div className="flex items-center justify-center w-full h-full p-8">
            {currentImage?.media_type?.startsWith('video') ? (
              <video 
                src={currentImage.url} 
                controls 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img 
                src={currentImage?.url} 
                alt="Session media" 
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
