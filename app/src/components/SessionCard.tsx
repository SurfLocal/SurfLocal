import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { MapPin, MessageCircle, Send, ChevronDown, ChevronUp, Waves, Calendar, Wind, Navigation, Clock, Trash2, Droplets } from 'lucide-react';
import SurfboardIcon from './icons/SurfboardIcon';
import { formatDistanceToNow, format } from 'date-fns';
import ImageLightbox from './ImageLightbox';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';

interface SessionMedia {
  url: string;
  media_type: string;
}

interface SessionComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null };
}

interface BoardDetails {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  length_feet: number | null;
  length_inches: number | null;
  volume_liters: number | null;
  board_type: string | null;
  photo_url: string | null;
}

interface SwellSignature {
  swell_height: string | null;
  swell_period: number | null;
  swell_direction: string | null;
  wind_speed: number | null;
  wind_direction: string | null;
  tide_height: string | null;
}

interface SessionCardProps {
  session: {
    id: string;
    location: string;
    session_date: string;
    wave_height: string | null;
    wave_count: number | null;
    duration_minutes: number | null;
    shape: string | null;
    power: string | null;
    crowd: string | null;
    rating: string | null;
    gear: string | null;
    air_count: number | null;
    barrel_count: number | null;
    notes: string | null;
    user_id: string;
    board_id?: string | null;
    board?: { id?: string; name: string; brand: string | null; photo_url?: string | null } | null;
    profile: { display_name: string | null; user_id: string; avatar_url?: string | null } | null;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    kooks_count: number;
    is_kooked: boolean;
    media: SessionMedia[];
    swell_signature?: SwellSignature | null;
  };
  currentUserId: string;
  onLike: (sessionId: string, isLiked: boolean) => void;
  onKook: (sessionId: string, isKooked: boolean) => void;
  onCommentAdded: (sessionId: string) => void;
  onCommentDeleted?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

// Capitalize first letter of each word
const capitalizeWords = (str: string) => {
  return str.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

const getRatingColor = (rating: string | null) => {
  switch (rating?.toLowerCase()) {
    case 'dog shit': return 'bg-red-500/20 text-red-500 border-red-500/30';
    case 'poor': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'decent': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'fun': return 'bg-green-500/20 text-green-500 border-green-500/30';
    case 'epic': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const SessionCard = ({ session, currentUserId, onLike, onKook, onCommentAdded, onCommentDeleted, onDelete }: SessionCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<SessionComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [boardDetails, setBoardDetails] = useState<BoardDetails | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status for current user
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const result = await api.auth.checkAdmin();
        setIsAdmin(result?.is_admin || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [currentUserId]);

  const fetchComments = async (force = false) => {
    if (comments.length > 0 && !force) return;
    setLoadingComments(true);
    
    try {
      const data = await api.social.getComments(session.id);
      if (data) {
        // Backend should return comments with profile info
        const enriched = data.map((c: any) => ({
          ...c,
          profile: { display_name: c.display_name || 'Surfer' }
        }));
        setComments(enriched);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
    setLoadingComments(false);
  };

  const fetchBoardDetails = async () => {
    const boardId = session.board?.id || session.board_id;
    if (!boardId || boardDetails) return;
    
    setLoadingBoard(true);
    try {
      const data = await api.boards.getById(boardId);
      if (data) {
        setBoardDetails(data);
      }
    } catch (error) {
      console.error('Error fetching board details:', error);
    }
    setLoadingBoard(false);
  };

  const handleBoardClick = () => {
    const boardId = session.board?.id || session.board_id;
    if (boardId) {
      // Navigate to the quiver page with the board highlighted
      navigate(`/quiver/${session.user_id}#${boardId}`);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!commentInput.trim()) return;
    
    try {
      await api.social.addComment(session.id, currentUserId, commentInput);
      setCommentInput('');
      onCommentAdded(session.id);
      // Refetch comments to get the actual comment with proper data
      await fetchComments(true);
      toast({ title: 'Comment added!' });
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({ title: error?.message || 'Failed to add comment', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    // Allow deletion if user owns the comment OR is admin
    if (currentUserId !== commentUserId && !isAdmin) return;
    
    try {
      await api.social.deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      if (onCommentDeleted) {
        onCommentDeleted(session.id);
      }
      toast({ title: 'Comment deleted' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${session.profile?.user_id}`}>
              <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary transition-all">
                <AvatarImage src={session.profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(session.profile?.display_name || 'S')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${session.profile?.user_id}`} className="hover:underline">
                <p className="font-semibold text-foreground">{session.profile?.display_name || 'Surfer'}</p>
              </Link>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(session.session_date), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Rating Badge */}
              {session.rating && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRatingColor(session.rating)}`}>
                  {capitalizeWords(session.rating)}
                </span>
              )}
              {/* Delete Button - only for session owner */}
              {session.user_id === currentUserId && onDelete && (
                <button
                  onClick={() => onDelete(session.id)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">
          {/* Location */}
          <div className="flex items-center gap-1 text-lg font-semibold text-foreground">
            <MapPin className="h-5 w-5 text-primary" /> {session.location}
          </div>

          {/* Spot Conditions */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {session.wave_height && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="font-semibold text-foreground text-sm">{session.wave_height} ft</p>
              </div>
            )}
            {session.shape && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Shape</p>
                <p className="font-semibold text-foreground text-sm capitalize">{session.shape}</p>
              </div>
            )}
            {session.power && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Power</p>
                <p className="font-semibold text-foreground text-sm capitalize">{session.power}</p>
              </div>
            )}
            {session.crowd && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Crowd</p>
                <p className="font-semibold text-foreground text-sm capitalize">{session.crowd}</p>
              </div>
            )}
            {session.gear && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Gear</p>
                <p className="font-semibold text-foreground text-sm">{session.gear}</p>
              </div>
            )}
          </div>

          {/* Swell Signature */}
          {session.swell_signature && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Swell Signature</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Waves className="h-4 w-4 text-primary" />
                  <span className="text-foreground">
                    {session.swell_signature.swell_height || '—'}
                    {session.swell_signature.swell_period ? ` ${session.swell_signature.swell_period}s` : ''}
                    {session.swell_signature.swell_direction ? ` ${session.swell_signature.swell_direction}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {session.swell_signature.wind_speed ? `${session.swell_signature.wind_speed} kts` : '—'}
                    {session.swell_signature.wind_direction ? ` ${session.swell_signature.wind_direction}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {session.swell_signature.tide_height || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Board Used - clickable link to quiver */}
          {session.board && (
            <button
              onClick={handleBoardClick}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left w-full"
            >
              <SurfboardIcon className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Board</p>
                <p className="font-semibold text-sm text-foreground truncate">
                  {session.board.brand ? `${session.board.brand} ` : ''}{session.board.name}
                </p>
              </div>
            </button>
          )}

          {/* User Session Stats - as tags */}
          <div className="flex flex-wrap gap-2">
            {session.duration_minutes !== null && session.duration_minutes > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-primary/20 text-primary border-primary/30 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {session.duration_minutes >= 60 
                  ? `${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60 > 0 ? `${session.duration_minutes % 60}m` : ''}`
                  : `${session.duration_minutes}m`
                }
              </span>
            )}
            {session.wave_count !== null && session.wave_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-primary/20 text-primary border-primary/30 flex items-center gap-1.5">
                <Waves className="h-3.5 w-3.5" />
                {session.wave_count} {session.wave_count === 1 ? 'wave' : 'waves'}
              </span>
            )}
            {session.barrel_count !== null && session.barrel_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-primary/20 text-primary border-primary/30 flex items-center gap-1.5">
                {session.barrel_count} {session.barrel_count === 1 ? 'barrel' : 'barrels'}
              </span>
            )}
            {session.air_count !== null && session.air_count > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-primary/20 text-primary border-primary/30 flex items-center gap-1.5">
                {session.air_count} {session.air_count === 1 ? 'air' : 'airs'}
              </span>
            )}
          </div>

          {/* Session Notes */}
          {session.notes && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
            </div>
          )}

          {/* Session Media */}
          {session.media && session.media.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {session.media.slice(0, 4).map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => openLightbox(idx)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                >
                  {media.media_type.startsWith('video') ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt="Session media" className="w-full h-full object-cover" />
                  )}
                  {idx === 3 && session.media.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">+{session.media.length - 4}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-3 border-t border-border">
            <button 
              onClick={() => session.user_id !== currentUserId && onLike(session.id, session.is_liked)} 
              className={`flex items-center gap-1.5 transition-colors ${session.user_id === currentUserId ? 'opacity-30 cursor-not-allowed' : session.is_liked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              disabled={session.user_id === currentUserId}
            >
              <img 
                src={shakaIcon} 
                alt="Shaka" 
                className={`h-6 w-6 object-contain ${session.is_liked ? 'scale-110' : ''} transition-transform`}
              />
              <span className="text-sm font-medium">{session.likes_count}</span>
            </button>

            <button 
              onClick={() => session.user_id !== currentUserId && onKook(session.id, session.is_kooked)} 
              className={`flex items-center gap-1.5 transition-colors ${session.user_id === currentUserId ? 'opacity-30 cursor-not-allowed' : session.is_kooked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              disabled={session.user_id === currentUserId}
            >
              <img 
                src={kookIcon} 
                alt="Kook" 
                className={`h-9 w-9 object-contain ${session.is_kooked ? 'scale-110' : ''} transition-transform`}
              />
              <span className="text-sm font-medium">{session.kooks_count}</span>
            </button>
            
            <button 
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{session.comments_count}</span>
              {showComments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="space-y-3 pt-2 border-t border-border">
              {loadingComments ? (
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(c.profile?.display_name || 'S')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-foreground">{c.profile?.display_name || 'Surfer'}</p>
                          {(currentUserId === c.user_id || isAdmin) && (
                            <button 
                              onClick={() => handleDeleteComment(c.id, c.user_id)}
                              className="text-xs text-destructive/60 hover:text-destructive p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground">{c.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(c.created_at))} ago
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  className="text-sm"
                />
                <Button size="icon" variant="ghost" onClick={handleSubmitComment}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <ImageLightbox
        images={session.media || []}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Board Details Modal */}
      <Dialog open={boardModalOpen} onOpenChange={setBoardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SurfboardIcon className="h-5 w-5 text-primary" />
              Board Details
            </DialogTitle>
          </DialogHeader>
          
          {loadingBoard ? (
            <div className="flex items-center justify-center py-8">
              <Waves className="h-8 w-8 animate-pulse text-primary" />
            </div>
          ) : boardDetails ? (
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                {boardDetails.photo_url ? (
                  <img
                    src={boardDetails.photo_url}
                    alt={boardDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Waves className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">{boardDetails.name}</h3>
                {boardDetails.brand && (
                  <p className="text-muted-foreground">
                    {boardDetails.brand}{boardDetails.model ? ` ${boardDetails.model}` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {boardDetails.length_feet && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Length</p>
                    <p className="font-semibold text-foreground">
                      {boardDetails.length_feet}'{boardDetails.length_inches || 0}"
                    </p>
                  </div>
                )}
                {boardDetails.volume_liters && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="font-semibold text-foreground">{boardDetails.volume_liters}L</p>
                  </div>
                )}
                {boardDetails.board_type && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-semibold text-foreground">{boardDetails.board_type}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Board not found</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SessionCard;
