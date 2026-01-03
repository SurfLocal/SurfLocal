import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Waves, User, MapPin, Calendar, UserPlus, UserMinus, Users, Play, Image as ImageIcon, ChevronRight, Shield, Flame } from 'lucide-react';
import SurfboardIcon from '@/components/icons/SurfboardIcon';
import ShakaIcon from '@/components/icons/ShakaIcon';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';
import SessionCard from '@/components/SessionCard';
import { formatStatNumber } from '@/lib/formatNumber';
import WeeklyActivityChart from '@/components/WeeklyActivityChart';
import StreakPanel from '@/components/StreakPanel';
import ImageLightbox from '@/components/ImageLightbox';

interface ProfileData {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  home_break: string | null;
  years_surfing: number | null;
  avatar_url: string | null;
  total_shakas_received: number;
  total_kooks_received: number;
  longest_streak: number | null;
  longest_streak_start: string | null;
}

interface SessionData {
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
  board_id: string | null;
  is_public: boolean;
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
}

interface BoardData {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  board_type: string | null;
  length_feet: number | null;
  length_inches: number | null;
  photo_url: string | null;
}

interface Stats {
  totalSessions: number;
  totalWaves: number;
  totalBarrels: number;
  totalAirs: number;
  topSpot: string | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalWaves: 0, totalBarrels: 0, totalAirs: 0, topSpot: null });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [recentMedia, setRecentMedia] = useState<MediaItem[]>([]);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [userBoards, setUserBoards] = useState<BoardData[]>([]);
  const [showAllBoards, setShowAllBoards] = useState(false);
  const [isProfileAdmin, setIsProfileAdmin] = useState(false);
  const [calculatedLongestStreak, setCalculatedLongestStreak] = useState<number | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    if (user && userId === user.id) {
      navigate('/profile');
    }
  }, [user, userId, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || !user) return;

      try {
        // Fetch profile and follow data - fetch independently to avoid one failure breaking everything
        const [profileData, followData, boardsData] = await Promise.all([
          api.profiles.getByUserId(userId),
          api.social.getFollowStats(userId, user.id),
          api.boards.getByUser(userId),
        ]);

        if (profileData) {
          setProfile(profileData);
        }
        if (followData) {
          setFollowersCount(followData.followers_count || 0);
          setFollowingCount(followData.following_count || 0);
          setIsFollowing(followData.is_following || false);
        }
        
        // Check admin status separately to not break profile loading if it fails
        try {
          const adminCheck = await api.auth.checkAdmin(userId);
          setIsProfileAdmin(adminCheck?.isAdmin || false);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsProfileAdmin(false);
        }

        // Fetch sessions for stats
        const allSessions = await api.sessions.getByUser(userId, 1000, 0, user.id);
        const publicSessions = allSessions?.filter((s: any) => s.is_public) || [];

        if (publicSessions.length > 0) {
          const totalWaves = publicSessions.reduce((sum: number, s: any) => sum + (s.wave_count || 0), 0);
          const totalBarrels = publicSessions.reduce((sum: number, s: any) => sum + (s.barrel_count || 0), 0);
          const totalAirs = publicSessions.reduce((sum: number, s: any) => sum + (s.air_count || 0), 0);
          const locationCounts: Record<string, number> = {};
          publicSessions.forEach((s: any) => {
            locationCounts[s.location] = (locationCounts[s.location] || 0) + 1;
          });
          const topSpot = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          setStats({ totalSessions: publicSessions.length, totalWaves, totalBarrels, totalAirs, topSpot });

          // TODO: Add media endpoint
          setAllMedia([]);
          setRecentMedia([]);
        }

        if (boardsData) {
          setUserBoards(boardsData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }

      setLoadingProfile(false);
    };

    if (user && userId) fetchProfile();
  }, [user, userId]);

  const fetchSessions = useCallback(async (pageNum: number) => {
    if (!userId || !user) return;
    setLoadingSessions(true);

    try {
      // Fetch all sessions with current user context for like/kook status
      const data = await api.sessions.getByUser(userId, 1000, 0, user.id);
      const publicData = data?.filter((s: any) => s.is_public) || [];
      const paginatedData = publicData.slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

      // Map sessions to expected format (backend includes board and swell_signature)
      const enrichedSessions = paginatedData.map((session: any) => ({
        ...session,
        likes_count: session.like_count || 0,
        comments_count: session.comment_count || 0,
        is_liked: session.is_liked || false,
        kooks_count: session.kooks_count || 0,
        is_kooked: session.is_kooked || false,
        board: session.board || null,
        swell_signature: session.swell_signature || null,
      }));

      if (pageNum === 0) {
        setSessions(enrichedSessions);
      } else {
        setSessions(prev => [...prev, ...enrichedSessions]);
      }
      setHasMore(paginatedData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
    setLoadingSessions(false);
  }, [userId, user]);

  useEffect(() => {
    if (userId) {
      setPage(0);
      setSessions([]);
      fetchSessions(0);
    }
  }, [userId, fetchSessions]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSessions(nextPage);
  };

  const handleLike = async (sessionId: string, isLiked: boolean) => {
    if (!user || !userId) return;
    // Can't like own session
    if (user.id === userId) return;
    
    try {
      if (isLiked) {
        await api.social.unlikeSession(sessionId, user.id);
      } else {
        await api.social.likeSession(sessionId, user.id);
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 } : s));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleKook = async (sessionId: string, isKooked: boolean) => {
    if (!user || !userId) return;
    // Can't kook own session
    if (user.id === userId) return;
    
    try {
      if (isKooked) {
        await api.social.unkookSession(sessionId, user.id);
      } else {
        await api.social.kookSession(sessionId, user.id);
      }
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_kooked: !isKooked, kooks_count: isKooked ? s.kooks_count - 1 : s.kooks_count + 1 } : s));
    } catch (error) {
      console.error('Error toggling kook:', error);
    }
  };

  const handleCommentAdded = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, comments_count: s.comments_count + 1 } : s));
  };

  const handleCommentDeleted = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, comments_count: Math.max(0, s.comments_count - 1) } : s));
  };

  const handleFollow = async () => {
    if (!user || !userId) return;
    try {
      await api.social.follow(user.id, userId);
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast({ title: 'Now following!' });
    } catch (error) {
      console.error('Error following:', error);
      toast({ title: 'Failed to follow', variant: 'destructive' });
    }
  };

  const handleUnfollow = async () => {
    if (!user || !userId) return;
    try {
      await api.social.unfollow(user.id, userId);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
      toast({ title: 'Unfollowed' });
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast({ title: 'Failed to unfollow', variant: 'destructive' });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (loading || !user || loadingProfile) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="py-16 text-center">
              <User className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold mb-2">User not found</h3>
              <p className="text-muted-foreground">This profile doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Card className="relative">
          <CardHeader>
            {/* Follow/Unfollow button - Mobile: top right, Desktop: top right */}
            {userId && user && userId !== user.id && (
              <div className="absolute top-4 right-4 z-10">
                {isFollowing ? (
                  <Button variant="outline" onClick={handleUnfollow} size="sm" className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                    <UserMinus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Unfollow</span>
                  </Button>
                ) : (
                  <Button onClick={handleFollow} size="sm" className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                    <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Follow</span>
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {(profile.display_name || 'S')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-2xl break-words">{profile.display_name || 'Surfer'}</CardTitle>
                    {profile.home_break && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{profile.home_break}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Admin badge - below avatar level */}
            {isProfileAdmin && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            
            {/* Connections */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/connections/${userId}`}>
                  <Users className="h-4 w-4 mr-2" />
                  {followersCount} Followers
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/connections/${userId}`}>
                  {followingCount} Following
                </Link>
              </Button>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">About</h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {/* Discussion Engagement Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
                <img src={shakaIcon} alt="Shaka" className="h-6 w-6 object-contain" />
                <div>
                  <p className="text-lg font-bold text-foreground">{formatStatNumber(profile.total_shakas_received || 0)}</p>
                  <p className="text-xs text-muted-foreground">Shakas Thrown</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3">
                <img src={kookIcon} alt="Kook" className="h-6 w-6 object-contain" />
                <div>
                  <p className="text-lg font-bold text-foreground">{formatStatNumber(profile.total_kooks_received || 0)}</p>
                  <p className="text-xs text-muted-foreground">Scrub it Kook!</p>
                </div>
              </div>
              {/* Longest Streak */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-3 col-span-2 sm:col-span-1">
                <div className={`p-1 rounded-full ${(calculatedLongestStreak ?? profile.longest_streak ?? 0) >= 2 ? 'bg-orange-500/20' : 'bg-muted'}`}>
                  <Flame className={`h-5 w-5 ${(calculatedLongestStreak ?? profile.longest_streak ?? 0) >= 2 ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{calculatedLongestStreak ?? profile.longest_streak ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Best Streak
                    {profile.longest_streak_start && (calculatedLongestStreak ?? profile.longest_streak ?? 0) === profile.longest_streak && (
                      <span className="block text-[10px] text-muted-foreground/70">
                        {format(new Date(profile.longest_streak_start), 'MMM d, yyyy')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{formatStatNumber(stats.totalSessions)}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
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


            {/* Quiver */}
            {userBoards.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <SurfboardIcon className="h-4 w-4" />
                    Quiver ({userBoards.length})
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/quiver/${userId}`)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    View Quiver
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Weekly Activity Chart */}
            <WeeklyActivityChart userId={userId!} />

            {/* Streak Panel */}
            <StreakPanel 
              userId={userId!} 
              onStreakCalculated={(current, longest) => setCalculatedLongestStreak(longest)}
            />

            {/* Recent Media */}
            {recentMedia.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">Recent Media</h3>
                <div className="grid grid-cols-4 gap-2">
                  {recentMedia.slice(0, 4).map((item, index) => (
                    <div 
                      key={item.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => {
                        if (index === 3 && allMedia.length > 4) {
                          setGalleryOpen(true);
                        } else {
                          openLightbox(index);
                        }
                      }}
                    >
                      {item.media_type?.startsWith('video') ? (
                        <>
                          <video src={item.url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <img src={item.url} alt="Session media" className="w-full h-full object-cover" />
                      )}
                      
                      {index === 3 && allMedia.length > 4 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <div className="text-center text-white">
                            <ImageIcon className="h-5 w-5 mx-auto mb-1" />
                            <span className="text-xs font-medium">All Media</span>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <div>
          <h3 className="font-semibold text-foreground mb-4">Public Sessions</h3>
          {sessions.length === 0 && !loadingSessions ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No public sessions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={{
                    ...session,
                    profile: { display_name: profile.display_name, user_id: userId!, avatar_url: profile.avatar_url || undefined },
                  }}
                  currentUserId={user.id}
                  onLike={handleLike}
                  onKook={handleKook}
                  onCommentAdded={handleCommentAdded}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))}
            </div>
          )}

          {hasMore && sessions.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button onClick={loadMore} variant="outline" disabled={loadingSessions}>
                {loadingSessions ? 'Loading...' : 'Load More Sessions'}
              </Button>
            </div>
          )}
        </div>

        {/* Lightbox */}
        <ImageLightbox
          images={allMedia.map(m => ({ url: m.url, media_type: m.media_type }))}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default UserProfile;