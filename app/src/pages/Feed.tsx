import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Waves, UserPlus, Users } from 'lucide-react';
import SessionCard from '@/components/SessionCard';

interface FeedSession {
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
  board?: { id: string; name: string; brand: string | null; photo_url: string | null } | null;
  profile: { display_name: string | null; user_id: string; avatar_url?: string | null } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  kooks_count: number;
  is_kooked: boolean;
  media: { url: string; media_type: string }[];
  swell_signature?: {
    swell_height: string | null;
    swell_period: number | null;
    swell_direction: string | null;
    wind_speed: number | null;
    wind_direction: string | null;
    tide_height: string | null;
  } | null;
}

interface SuggestedUser {
  user_id: string;
  display_name: string | null;
  is_following: boolean;
}

const Feed = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<FeedSession[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!user) return;

      try {
        // Fetch feed sessions - only from users we follow
        const sessionsData = await api.sessions.getFeed(50, 0, user.id);
        
        // Backend already includes all joined data and counts
        // Map to match expected format
        const mappedSessions = sessionsData.map((session: any) => ({
          ...session,
          profile: {
            display_name: session.display_name,
            user_id: session.user_id,
            avatar_url: session.avatar_url,
          },
          likes_count: session.like_count || 0,
          comments_count: session.comment_count || 0,
          is_liked: session.is_liked || false,
          kooks_count: session.kooks_count || 0,
          is_kooked: session.is_kooked || false,
          media: session.media || [],
          board: session.board || null,
          swell_signature: session.swell_signature || null,
        }));
        
        setSessions(mappedSessions.slice(0, 20));

        // Get following list for suggested users
        const following = await api.social.getFollowing(user.id);
        const followingIds = following.map((f: any) => f.user_id);

        // Get follow stats
        const followStats = await api.social.getFollowStats(user.id, user.id);
        setFollowersCount(followStats.followers_count || 0);
        setFollowingCount(followStats.following_count || 0);

        // TODO: Add endpoint to get suggested users
        // For now, set empty array
        setSuggestedUsers([]);
      } catch (error) {
        console.error('Error fetching feed:', error);
        toast({ title: 'Failed to load feed', variant: 'destructive' });
      }

      setLoadingData(false);
    };

    if (user) fetchFeed();
  }, [user, toast]);

  const handleLike = async (sessionId: string, isLiked: boolean) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    // Can't like own session
    if (session.user_id === user.id) return;
    
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
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    // Can't kook own session
    if (session.user_id === user.id) return;
    
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

  const handleFollow = async (userId: string) => {
    if (!user) return;
    try {
      await api.social.follow(user.id, userId);
      setSuggestedUsers(suggestedUsers.filter(u => u.user_id !== userId));
      toast({ title: 'Following!' });
    } catch (error) {
      console.error('Error following user:', error);
      toast({ title: 'Failed to follow user', variant: 'destructive' });
    }
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">See what your friends have been surfing</p>
          
          {/* Followers/Following Buttons */}
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/connections/${user?.id}`}>
                <Users className="h-4 w-4 mr-2" />
                {followersCount} Followers
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/connections/${user?.id}`}>
                {followingCount} Following
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
              <Link to="/log-session"><Button size="sm">Log Session</Button></Link>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-16"><Waves className="h-8 w-8 animate-pulse text-primary" /></div>
            ) : sessions.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <Waves className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No sessions in your feed</h3>
                <p className="text-muted-foreground mb-4">Follow other surfers or log your first session!</p>
                <Link to="/log-session"><Button>Log Session</Button></Link>
              </CardContent></Card>
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  currentUserId={user.id}
                  onLike={handleLike}
                  onKook={handleKook}
                  onCommentAdded={handleCommentAdded}
                  onCommentDeleted={handleCommentDeleted}
                  onDelete={handleDeleteSession}
                />
              ))
            )}
          </div>

          <div className="space-y-6">
            {suggestedUsers.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><h3 className="font-semibold text-foreground">Suggested Surfers</h3></CardHeader>
                <CardContent className="space-y-3">
                  {suggestedUsers.map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between">
                      <Link to={`/profile/${u.user_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{(u.display_name || 'S')[0].toUpperCase()}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium text-foreground">{u.display_name || 'Surfer'}</span>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => handleFollow(u.user_id)} className="h-8">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3"><h3 className="font-semibold text-foreground">Quick Links</h3></CardHeader>
              <CardContent className="space-y-2">
                <Link to="/log-session" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">Log Session</Link>
                <Link to="/maps" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">Explore Maps</Link>
                <Link to="/sessions" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">View History</Link>
                <Link to="/quiver" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">Quiver</Link>
                <Link to="/find-friends" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">Find Friends</Link>
                <Link to="/forecast" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">View Forecast</Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Feed;
