import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { Waves, ChevronLeft, ChevronRight, X, Play, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  session_id: string;
  created_at: string;
  session?: {
    location: string;
    session_date: string;
  };
}

interface UserMediaGalleryProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

const UserMediaGallery = ({ userId, open, onClose }: UserMediaGalleryProps) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const PAGE_SIZE = 20;

  const fetchMedia = useCallback(async (pageNum: number) => {
    if (!userId) return;
    setLoading(true);

    try {
      // TODO: Add media endpoint to backend
      // For now, media gallery will be empty
      setMedia([]);
      setHasMore(false);
    } catch (error) {
      console.error('Error fetching media:', error);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open) {
      setPage(0);
      setMedia([]);
      fetchMedia(0);
    }
  }, [open, fetchMedia]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMedia(nextPage);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goToPrevious = () => {
    setLightboxIndex(prev => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setLightboxIndex(prev => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  const currentMedia = media[lightboxIndex];

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              All Media
            </DialogTitle>
          </DialogHeader>

          {media.length === 0 && !loading ? (
            <div className="py-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No media yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {media.map((item, index) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div 
                      className="relative cursor-pointer"
                      onClick={() => openLightbox(index)}
                    >
                      {item.media_type?.startsWith('video') ? (
                        <div className="relative">
                          <video 
                            src={item.url} 
                            className="w-full h-64 object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="h-12 w-12 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt="Session media" 
                          className="w-full h-64 object-cover"
                        />
                      )}
                    </div>
                    {item.session && (
                      <div className="p-3 bg-muted/30">
                        <p className="text-sm text-foreground font-medium">
                          {item.session.location} • {format(new Date(item.session.session_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={loadMore} disabled={loading}>
                    {loading ? <Waves className="h-4 w-4 animate-pulse" /> : 'Load More'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={() => setLightboxOpen(false)}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none" 
          onKeyDown={handleKeyDown}
        >
          <div className="relative flex flex-col w-full h-[90vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous button */}
            {media.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image/Video */}
            <div className="flex-1 flex items-center justify-center p-8">
              {currentMedia?.media_type?.startsWith('video') ? (
                <video 
                  src={currentMedia.url} 
                  controls 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <img 
                  src={currentMedia?.url} 
                  alt="Session media" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Next button */}
            {media.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Session info + counter */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
              {currentMedia?.session && (
                <div className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                  {currentMedia.session.location} • {format(new Date(currentMedia.session.session_date), 'MMM d, yyyy')}
                </div>
              )}
              {media.length > 1 && (
                <div className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                  {lightboxIndex + 1} / {media.length}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserMediaGallery;
