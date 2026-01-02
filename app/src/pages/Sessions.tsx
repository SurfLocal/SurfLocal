import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Waves, ChevronRight, ChevronLeft, X, Image as ImageIcon, Flame } from 'lucide-react';
import { format } from 'date-fns';
import WeeklyActivityChart from '@/components/WeeklyActivityChart';
import StreakPanel from '@/components/StreakPanel';
import SessionCard from '@/components/SessionCard';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';

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
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, total_shakas_received, total_kooks_received, longest_streak, longest_streak_start')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
    };
    if (user) fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false });

      if (data) {
        // Calculate stats
        const totalMinutes = data.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const totalHours = Math.ceil(totalMinutes / 60); // Round up
        const totalWaves = data.reduce((sum, s) => sum + (s.wave_count || 0), 0);
        const totalBarrels = data.reduce((sum, s) => sum + (s.barrel_count || 0), 0);
        const totalAirs = data.reduce((sum, s) => sum + (s.air_count || 0), 0);
        const locationCounts: Record<string, number> = {};
        data.forEach(s => {
          locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
        });
        const topSpot = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        setStats({ totalHours, totalWaves, totalBarrels, totalAirs, topSpot });

        // Enrich sessions with media and engagement data
        const enrichedSessions = await Promise.all(data.map(async (session) => {
          const [mediaRes, likesRes, commentsRes, myLikeRes, kooksRes, myKookRes, boardRes] = await Promise.all([
            supabase.from('session_media').select('url, media_type').eq('session_id', session.id),
            supabase.from('session_likes').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_comments').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_likes').select('id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle(),
            supabase.from('session_kooks').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_kooks').select('id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle(),
            session.board_id ? supabase.from('boards').select('id, name, brand, photo_url').eq('id', session.board_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          return {
            ...session,
            media: mediaRes.data || [],
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            is_liked: !!myLikeRes.data,
            kooks_count: kooksRes.count || 0,
            is_kooked: !!myKookRes.data,
            board: boardRes.data,
          };
        }));

        setSessions(enrichedSessions);
      }
      setLoadingData(false);
    };

    if (user) fetchSessions();
  }, [user]);

  // Fetch recent media
  useEffect(() => {
    const fetchRecentMedia = async () => {
      if (!user) return;

      const { data: sessionIds } = await supabase
        .from('sessions')
        .select('id, location, session_date')
        .eq('user_id', user.id);

      if (!sessionIds || sessionIds.length === 0) return;

      const { data: media } = await supabase
        .from('session_media')
        .select('id, url, media_type, session_id, created_at')
        .in('session_id', sessionIds.map(s => s.id))
        .order('created_at', { ascending: false })
        .limit(4);

      if (media) {
        const sessionMap = new Map(sessionIds.map(s => [s.id, s]));
        const enriched = media.map(m => ({
          ...m,
          session_location: sessionMap.get(m.session_id)?.location || '',
          session_date: sessionMap.get(m.session_id)?.session_date || '',
        }));
        setRecentMedia(enriched);
      }
    };

    if (user) fetchRecentMedia();
  }, [user]);

  const fetchAllMedia = useCallback(async (page: number) => {
    if (!user) return;
    setLoadingMedia(true);

    const { data: sessionIds } = await supabase
      .from('sessions')
      .select('id, location, session_date')
      .eq('user_id', user.id);

    if (!sessionIds || sessionIds.length === 0) {
      setLoadingMedia(false);
      return;
    }

    const { data: media, count } = await supabase
      .from('session_media')
      .select('id, url, media_type, session_id, created_at', { count: 'exact' })
      .in('session_id', sessionIds.map(s => s.id))
      .order('created_at', { ascending: false })
      .range(page * MEDIA_PER_PAGE, (page + 1) * MEDIA_PER_PAGE - 1);

    if (media) {
      const sessionMap = new Map(sessionIds.map(s => [s.id, s]));
      const enriched = media.map(m => ({
        ...m,
        session_location: sessionMap.get(m.session_id)?.location || '',
        session_date: sessionMap.get(m.session_id)?.session_date || '',
      }));
      
      if (page === 0) {
        setAllMedia(enriched);
      } else {
        setAllMedia(prev => [...prev, ...enriched]);
      }
      setHasMoreMedia(count ? (page + 1) * MEDIA_PER_PAGE < count : false);
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
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
  };

  const goToNext = () => {
    setLightboxIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));
  };

  const handleLike = async (sessionId: string, isLiked: boolean) => {
    if (!user) return;
    // Own sessions - can't like them, the button is disabled but just in case
    if (isLiked) {
      await supabase.from('session_likes').delete().eq('session_id', sessionId).eq('user_id', user.id);
    } else {
      await supabase.from('session_likes').insert({ session_id: sessionId, user_id: user.id });
    }
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 } : s));
  };

  const handleKook = async (sessionId: string, isKooked: boolean) => {
    if (!user) return;
    // Own sessions - can't kook them, the button is disabled but just in case
    if (isKooked) {
      await supabase.from('session_kooks').delete().eq('session_id', sessionId).eq('user_id', user.id);
    } else {
      await supabase.from('session_kooks').insert({ session_id: sessionId, user_id: user.id });
    }
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_kooked: !isKooked, kooks_count: isKooked ? s.kooks_count - 1 : s.kooks_count + 1 } : s));
  };

  const handleCommentAdded = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, comments_count: s.comments_count + 1 } : s));
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    const { error } = await supabase.from('sessions').delete().eq('id', sessionId).eq('user_id', user.id);
    if (!error) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast({ title: 'Session deleted' });
    } else {
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
              <p className="text-lg font-bold text-foreground">{profile?.total_shakas_received || 0}</p>
              <p className="text-xs text-muted-foreground">Shakas Thrown</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
            <img src={kookIcon} alt="Kook" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-lg font-bold text-foreground">{profile?.total_kooks_received || 0}</p>
              <p className="text-xs text-muted-foreground">Scrub it Kook!</p>
            </div>
          </div>
          {/* Longest Streak */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3 col-span-2 sm:col-span-1">
            <div className={`p-1 rounded-full ${(profile?.longest_streak || 0) >= 2 ? 'bg-orange-500/20' : 'bg-muted'}`}>
              <Flame className={`h-5 w-5 ${(profile?.longest_streak || 0) >= 2 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{profile?.longest_streak || 0}</p>
              <p className="text-xs text-muted-foreground">
                Best Streak
                {profile?.longest_streak_start && (
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
            <p className="text-2xl font-bold text-foreground">{stats.totalWaves}</p>
            <p className="text-xs text-muted-foreground">Waves</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalBarrels}</p>
            <p className="text-xs text-muted-foreground">Barrels</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalAirs}</p>
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