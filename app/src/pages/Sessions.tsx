import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Plus, Waves, ChevronRight, ChevronLeft, X, Image as ImageIcon, Flame } from 'lucide-react';
import { format } from 'date-fns';
import WeeklyActivityChart from '@/components/WeeklyActivityChart';
import StreakPanel from '@/components/StreakPanel';
import SessionCard from '@/components/SessionCard';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';
import { formatStatNumber } from '@/lib/formatNumber';

interface SessionData {
  id: string;
  location: string;
  session_date: string;
  wave_height: string | null;
  wave_count: number | null;
  shape: string | null;
  power: string | null;
  crowd: string | null;
  rating: string | null;
  gear: string | null;
  air_count: number | null;
  barrel_count: number | null;
  notes: string | null;
  user_id: string;
  board_id: string | null;
  is_public: boolean;
  duration_minutes: number | null;
  media: { url: string; media_type: string }[];
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  kooks_count: number;
  is_kooked: boolean;
  board?: { id: string; name: string; brand: string | null; photo_url: string | null } | null;
  swell_signature?: {
    swell_height: string | null;
    swell_period: number | null;
    swell_direction: string | null;
    wind_speed: number | null;
    wind_direction: string | null;
    tide_height: string | null;
  } | null;
}

interface MediaItem {
  id: string;
  url: string;
  media_type: string;
  session_id: string;
  session_location: string;
  session_date: string;
  created_at: string;
}

interface UserStats {
  totalHours: number;
  totalWaves: number;
  totalBarrels: number;
  totalAirs: number;
  topSpot: string | null;
}

interface ProfileStats {
  display_name: string | null;
  avatar_url: string | null;
  total_shakas_received: number;
  total_kooks_received: number;
  longest_streak: number | null;
  longest_streak_start: string | null;
}

const Sessions = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState<UserStats>({ totalHours: 0, totalWaves: 0, totalBarrels: 0, totalAirs: 0, topSpot: null });
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [calculatedLongestStreak, setCalculatedLongestStreak] = useState<number | null>(null);
  
  // Media gallery state
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mediaPage, setMediaPage] = useState(0);
  const [hasMoreMedia, setHasMoreMedia] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const MEDIA_PER_PAGE = 20;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await api.profiles.getByUserId(user.id);
        if (data) setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      try {
        const data = await api.sessions.getByUser(user.id, 50, 0, user.id);

        if (data && data.length > 0) {
          // Calculate stats
          const totalMinutes = data.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
          const totalHours = Math.ceil(totalMinutes / 60); // Round up
          const totalWaves = data.reduce((sum: number, s: any) => sum + (s.wave_count || 0), 0);
          const totalBarrels = data.reduce((sum: number, s: any) => sum + (s.barrel_count || 0), 0);
          const totalAirs = data.reduce((sum: number, s: any) => sum + (s.air_count || 0), 0);
          const locationCounts: Record<string, number> = {};
          data.forEach((s: any) => {
            locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
          });
          const topSpot = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          setStats({ totalHours, totalWaves, totalBarrels, totalAirs, topSpot });

          // Map sessions to expected format (backend includes like_count, comment_count, media, swell_signature)
          const enrichedSessions = data.map((session: any) => ({
            ...session,
            media: session.media || [],
            likes_count: session.like_count || 0,
            comments_count: session.comment_count || 0,
            is_liked: session.is_liked || false,
            kooks_count: session.kooks_count || 0,
            is_kooked: session.is_kooked || false,
            board: session.board || null,
            swell_signature: session.swell_signature || null,
          }));

          setSessions(enrichedSessions);
        } else {
          setSessions([]);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({ title: 'Failed to load sessions', variant: 'destructive' });
      }
      setLoadingData(false);
    };

    if (user) fetchSessions();
  }, [user, toast]);

  // Fetch recent media from user's sessions
  useEffect(() => {
    const fetchRecentMedia = async () => {
      if (!user) return;
      try {
        const media = await api.sessions.getUserMedia(user.id, 20, 0);
        if (media) {
          setRecentMedia(media);
        }
      } catch (error) {
        console.error('Error fetching media:', error);
        setRecentMedia([]);
      }
    };

    if (user) fetchRecentMedia();
  }, [user]);

  const fetchAllMedia = useCallback(async (page: number) => {
    if (!user) return;
    setLoadingMedia(true);
    try {
      const media = await api.sessions.getUserMedia(user.id, MEDIA_PER_PAGE, page * MEDIA_PER_PAGE);
      if (media) {
        if (page === 0) {
          setAllMedia(media);
        } else {
          setAllMedia(prev => [...prev, ...media]);
        }
        setHasMoreMedia(media.length === MEDIA_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching all media:', error);
    }
    setLoadingMedia(false);
  }, [user]);

  const handleOpenGallery = () => {
    setGalleryOpen(true);
    setMediaPage(0);
    fetchAllMedia(0);
  };

  const handleLoadMore = () => {
    const nextPage = mediaPage + 1;
    setMediaPage(nextPage);
    fetchAllMedia(nextPage);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const goToPrevious = () => {
    const mediaSource = allMedia.length > 0 ? allMedia : recentMedia;
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : mediaSource.length - 1));
  };

  const goToNext = () => {
    const mediaSource = allMedia.length > 0 ? allMedia : recentMedia;
    setLightboxIndex(prev => (prev < mediaSource.length - 1 ? prev + 1 : 0));
  };

  const handleLike = async (sessionId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      if (isLiked) {
        await api.social.unlikeSession(sessionId, user.id);
      } else {
        await api.social.likeSession(sessionId, user.id);
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 } : s));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({ title: 'Failed to update like', variant: 'destructive' });
    }
  };

  const handleKook = async (sessionId: string, isKooked: boolean) => {
    if (!user) return;
    try {
      if (isKooked) {
        await api.social.unkookSession(sessionId, user.id);
      } else {
        await api.social.kookSession(sessionId, user.id);
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_kooked: !isKooked, kooks_count: isKooked ? s.kooks_count - 1 : s.kooks_count + 1 } : s));
    } catch (error) {
      console.error('Error toggling kook:', error);
      toast({ title: 'Failed to update kook', variant: 'destructive' });
    }
  };

  const handleCommentAdded = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, comments_count: s.comments_count + 1 } : s));
  };

  const handleCommentDeleted = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, comments_count: Math.max(0, s.comments_count - 1) } : s));
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await api.sessions.delete(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast({ title: 'Session deleted' });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({ title: 'Failed to delete session', variant: 'destructive' });
    }
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Sessions</h1>
            <p className="text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} logged
            </p>
          </div>
          <Link to="/log-session">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Log Session
            </Button>
          </Link>
        </div>

        {/* Engagement Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
            <img src={shakaIcon} alt="Shaka" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-lg font-bold text-foreground">{formatStatNumber(profile?.total_shakas_received || 0)}</p>
              <p className="text-xs text-muted-foreground">Shakas Thrown</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
            <img src={kookIcon} alt="Kook" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-lg font-bold text-foreground">{formatStatNumber(profile?.total_kooks_received || 0)}</p>
              <p className="text-xs text-muted-foreground">Scrub it Kook!</p>
            </div>
          </div>
          {/* Longest Streak */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3 col-span-2 sm:col-span-1">
            <div className={`p-1 rounded-full ${(calculatedLongestStreak ?? profile?.longest_streak ?? 0) >= 2 ? 'bg-orange-500/20' : 'bg-muted'}`}>
              <Flame className={`h-5 w-5 ${(calculatedLongestStreak ?? profile?.longest_streak ?? 0) >= 2 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{calculatedLongestStreak ?? profile?.longest_streak ?? 0}</p>
              <p className="text-xs text-muted-foreground">
                Best Streak
                {profile?.longest_streak_start && (calculatedLongestStreak ?? profile?.longest_streak ?? 0) === profile.longest_streak && (
                  <span className="block text-[10px] text-muted-foreground/70">
                    {format(new Date(profile.longest_streak_start), 'MMM d, yyyy')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Session Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalHours}</p>
            <p className="text-xs text-muted-foreground">Hours Surfed</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formatStatNumber(stats.totalWaves)}</p>
            <p className="text-xs text-muted-foreground">Waves</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formatStatNumber(stats.totalBarrels)}</p>
            <p className="text-xs text-muted-foreground">Barrels</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formatStatNumber(stats.totalAirs)}</p>
            <p className="text-xs text-muted-foreground">Airs</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center col-span-2 sm:col-span-1 min-w-0">
            <p className="text-sm font-bold text-foreground break-words leading-tight">{stats.topSpot || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Top Spot</p>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <div className="mb-6">
          <WeeklyActivityChart userId={user.id} />
        </div>

        {/* Streak Panel */}
        <div className="mb-6">
          <StreakPanel 
            userId={user.id} 
            onStreakUpdated={(longestStreak, longestStreakStart) => {
              setProfile(prev => prev ? { 
                ...prev, 
                longest_streak: longestStreak, 
                longest_streak_start: longestStreakStart 
              } : prev);
            }}
            onStreakCalculated={(currentStreak, longestStreak) => {
              setCalculatedLongestStreak(longestStreak);
            }}
          />
        </div>

        {/* Recent Media */}
        {recentMedia.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Recent Media
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {recentMedia.slice(0, 4).map((media, idx) => (
                <button
                  key={media.id}
                  onClick={() => idx === 3 && recentMedia.length >= 4 ? handleOpenGallery() : openLightbox(idx)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                >
                  {media.media_type.startsWith('video') ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt="Session media" className="w-full h-full object-cover" />
                  )}
                  {idx === 3 && recentMedia.length >= 4 && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">All Media</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="flex justify-center py-16">
            <Waves className="h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Waves className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No sessions yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Start tracking your surf sessions to build your history and see your progression.
              </p>
              <Link to="/log-session">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Log Your First Session
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={{
                  ...session,
                  profile: { display_name: profile?.display_name || null, user_id: user.id, avatar_url: profile?.avatar_url || undefined },
                }}
                currentUserId={user.id}
                onLike={handleLike}
                onKook={handleKook}
                onCommentAdded={handleCommentAdded}
                onCommentDeleted={handleCommentDeleted}
                onDelete={handleDeleteSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full Media Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              All Media
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allMedia.map((media, idx) => (
              <button
                key={media.id}
                onClick={() => openLightbox(idx)}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:ring-2 hover:ring-primary transition-all cursor-pointer"
              >
                {media.media_type.startsWith('video') ? (
                  <video src={media.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={media.url} alt="Session media" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
          
          {hasMoreMedia && (
            <div className="flex justify-center pt-4">
              <Button onClick={handleLoadMore} disabled={loadingMedia} variant="outline">
                {loadingMedia ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none [&>button.rounded-sm]:hidden">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Use allMedia if gallery was opened, otherwise use recentMedia */}
          {(() => {
            const mediaSource = allMedia.length > 0 ? allMedia : recentMedia;
            const currentMedia = mediaSource[lightboxIndex];
            
            return (
              <>
                {mediaSource.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
                  {currentMedia && (
                    <>
                      {currentMedia.media_type.startsWith('video') ? (
                        <video
                          src={currentMedia.url}
                          controls
                          className="max-h-[60vh] max-w-full rounded-lg"
                        />
                      ) : (
                        <img
                          src={currentMedia.url}
                          alt="Session media"
                          className="max-h-[60vh] max-w-full object-contain rounded-lg"
                        />
                      )}
                      
                      <div className="mt-4 text-center">
                        <div className="text-white">
                          <p className="font-medium">{currentMedia.session_location}</p>
                          <p className="text-sm text-white/70">
                            {format(new Date(currentMedia.session_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <p className="text-xs text-white/50 mt-2">
                          {lightboxIndex + 1} / {mediaSource.length}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Sessions;