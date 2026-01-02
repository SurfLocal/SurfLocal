import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Waves, UserPlus } from 'lucide-react';
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

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!user) return;

      const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const followingIds = following?.map(f => f.following_id) || [];

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, location, session_date, wave_height, wave_count, duration_minutes, shape, power, crowd, rating, gear, air_count, barrel_count, notes, user_id, is_public, board_id, created_at')
        .order('session_date', { ascending: false })
        .limit(50);

      if (sessionsData && sessionsData.length > 0) {
        const filteredSessions = sessionsData.filter(session => 
          session.user_id === user.id || 
          (session.is_public && followingIds.includes(session.user_id))
        );

        const enrichedSessions = await Promise.all(filteredSessions.map(async (session) => {
          const [profileRes, likesRes, commentsRes, mediaRes, myLikeRes, boardRes, kooksRes, myKookRes] = await Promise.all([
            supabase.from('profiles').select('display_name, user_id, avatar_url').eq('user_id', session.user_id).maybeSingle(),
            supabase.from('session_likes').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_comments').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_media').select('url, media_type').eq('session_id', session.id),
            supabase.from('session_likes').select('id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle(),
            session.board_id ? supabase.from('boards').select('id, name, brand, photo_url').eq('id', session.board_id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from('session_kooks').select('id', { count: 'exact' }).eq('session_id', session.id),
            supabase.from('session_kooks').select('id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle(),
          ]);
          return {
            ...session,
            profile: profileRes.data,
            board: boardRes.data,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            is_liked: !!myLikeRes.data,
            kooks_count: kooksRes.count || 0,
            is_kooked: !!myKookRes.data,
            media: mediaRes.data || [],
          };
        }));
        setSessions(enrichedSessions.slice(0, 20));
      } else {
        setSessions([]);
      }

      const { data: allProfiles } = await supabase.from('profiles').select('user_id, display_name').neq('user_id', user.id).limit(10);
      if (allProfiles) {
        const suggested = allProfiles.map(p => ({
          ...p,
          is_following: followingIds.includes(p.user_id),
        }));
        setSuggestedUsers(suggested.filter(u => !u.is_following).slice(0, 5));
      }

      setLoadingData(false);
    };

    if (user) fetchFeed();
  }, [user]);

  const handleLike = async (sessionId: string, isLiked: boolean) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    // Can't like own session
    if (session.user_id === user.id) return;
    
    if (isLiked) {
      await supabase.from('session_likes').delete().eq('session_id', sessionId).eq('user_id', user.id);
      // Decrement total_shakas_received for session owner
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_shakas_received')
        .eq('user_id', session.user_id)
        .maybeSingle();
      if (profileData) {
        await supabase
          .from('profiles')
          .update({ total_shakas_received: Math.max(0, (profileData.total_shakas_received || 0) - 1) })
          .eq('user_id', session.user_id);
      }
    } else {
      await supabase.from('session_likes').insert({ session_id: sessionId, user_id: user.id });
      // Increment total_shakas_received for session owner
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_shakas_received')
        .eq('user_id', session.user_id)
        .maybeSingle();
      if (profileData) {
        await supabase
          .from('profiles')
          .update({ total_shakas_received: (profileData.total_shakas_received || 0) + 1 })
          .eq('user_id', session.user_id);
      }
    }
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 } : s));
  };

  const handleKook = async (sessionId: string, isKooked: boolean) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    // Can't kook own session
    if (session.user_id === user.id) return;
    
    if (isKooked) {
      await supabase.from('session_kooks').delete().eq('session_id', sessionId).eq('user_id', user.id);
      // Decrement total_kooks_received for session owner
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_kooks_received')
        .eq('user_id', session.user_id)
        .maybeSingle();
      if (profileData) {
        await supabase
          .from('profiles')
          .update({ total_kooks_received: Math.max(0, (profileData.total_kooks_received || 0) - 1) })
          .eq('user_id', session.user_id);
      }
    } else {
      await supabase.from('session_kooks').insert({ session_id: sessionId, user_id: user.id });
      // Increment total_kooks_received for session owner
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_kooks_received')
        .eq('user_id', session.user_id)
        .maybeSingle();
      if (profileData) {
        await supabase
          .from('profiles')
          .update({ total_kooks_received: (profileData.total_kooks_received || 0) + 1 })
          .eq('user_id', session.user_id);
      }
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

  const handleFollow = async (userId: string) => {
    if (!user) return;
    await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
    setSuggestedUsers(suggestedUsers.filter(u => u.user_id !== userId));
    toast({ title: 'Following!' });
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground mt-1">See what your friends have been surfing</p>
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