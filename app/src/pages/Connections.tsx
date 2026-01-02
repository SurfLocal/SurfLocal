import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Waves, ChevronLeft, UserPlus, UserMinus } from 'lucide-react';

interface UserConnection {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  home_break: string | null;
  is_following?: boolean;
}

const Connections = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<UserConnection[]>([]);
  const [following, setFollowing] = useState<UserConnection[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!userId || !user) return;

      // Get profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', userId)
        .maybeSingle();
      
      setProfileName(profile?.display_name || 'Surfer');

      // Get who the current user follows
      const { data: myFollowsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      setMyFollowing(new Set(myFollowsData?.map(f => f.following_id) || []));

      // Get followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, home_break')
          .in('user_id', followerIds);
        
        setFollowers(followerProfiles || []);
      }

      // Get following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, home_break')
          .in('user_id', followingIds);
        
        setFollowing(followingProfiles || []);
      }

      setLoadingData(false);
    };

    if (user && userId) fetchConnections();
  }, [user, userId]);

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
    setMyFollowing(prev => new Set([...prev, targetUserId]));
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    setMyFollowing(prev => {
      const next = new Set(prev);
      next.delete(targetUserId);
      return next;
    });
  };

  if (loading || !user || loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  const isOwnProfile = userId === user.id;

  const renderUserCard = (u: UserConnection) => (
    <div key={u.user_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <Link to={u.user_id === user.id ? '/profile' : `/profile/${u.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={u.avatar_url || undefined} alt="Profile" />
          <AvatarFallback className="bg-primary/10 text-primary">
            {(u.display_name || 'S')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{u.display_name || 'Surfer'}</p>
          {u.home_break && (
            <p className="text-xs text-muted-foreground truncate">{u.home_break}</p>
          )}
        </div>
      </Link>
      {u.user_id !== user.id && (
        myFollowing.has(u.user_id) ? (
          <Button variant="outline" size="sm" onClick={() => handleUnfollow(u.user_id)}>
            <UserMinus className="h-4 w-4 mr-1" />
            Unfollow
          </Button>
        ) : (
          <Button size="sm" onClick={() => handleFollow(u.user_id)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Follow
          </Button>
        )
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{isOwnProfile ? 'Your' : `${profileName}'s`} Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'followers' | 'following')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="followers">
                  Followers ({followers.length})
                </TabsTrigger>
                <TabsTrigger value="following">
                  Following ({following.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="followers" className="space-y-2">
                {followers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No followers yet</p>
                ) : (
                  followers.map(renderUserCard)
                )}
              </TabsContent>
              
              <TabsContent value="following" className="space-y-2">
                {following.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
                ) : (
                  following.map(renderUserCard)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Connections;
