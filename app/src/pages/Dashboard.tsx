import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Waves, Calendar, MapPin, Users, BookOpen, Compass } from 'lucide-react';
import { format } from 'date-fns';
import SurfboardIcon from '@/components/icons/SurfboardIcon';

interface Session {
  id: string;
  location: string;
  session_date: string;
  wave_count: number | null;
  rating: string | null;
}

interface Profile {
  display_name: string | null;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [sessionsRes, profileRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, location, session_date, wave_count, rating')
          .eq('user_id', user.id)
          .order('session_date', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      setLoadingData(false);
    };

    if (user) fetchData();
  }, [user]);

  if (loading || !user || loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  const displayName = profile?.display_name || 'Surfer';

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <span className="block md:inline">Welcome back,</span>
            <span className="block md:inline"> {displayName}</span>
          </h1>
          <p className="text-muted-foreground">
            Ready to log your next session?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link to="/feed" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                  <Calendar className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Feed</h3>
                  <p className="text-sm text-muted-foreground">See community posts</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/sessions" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
                  <BookOpen className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Sessions</h3>
                  <p className="text-sm text-muted-foreground">View history</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/reports" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                  <MapPin className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Reports</h3>
                  <p className="text-sm text-muted-foreground">Surf conditions</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/quiver" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <SurfboardIcon className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Quiver</h3>
                  <p className="text-sm text-muted-foreground">Manage boards</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/maps" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Compass className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Explore</h3>
                  <p className="text-sm text-muted-foreground">Find new spots</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/find-friends" className="block">
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                  <Users className="h-6 w-6 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Find Friends</h3>
                  <p className="text-sm text-muted-foreground">Connect with surfers</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest surf sessions</CardDescription>
            </div>
            <Link to="/sessions">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex justify-center py-8">
                <Waves className="h-6 w-6 animate-pulse text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Waves className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-4">No sessions logged yet</p>
                <Link to="/log-session">
                  <Button>Log Your First Session</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Waves className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{session.location}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.session_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {session.rating && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          session.rating.toLowerCase() === 'epic' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                          session.rating.toLowerCase() === 'fun' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                          session.rating.toLowerCase() === 'decent' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                          session.rating.toLowerCase() === 'poor' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                          'bg-red-500/20 text-red-500 border-red-500/30'
                        }`}>
                          {session.rating.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                        </span>
                      )}
                      {session.wave_count && (
                        <p className="text-sm text-muted-foreground">{session.wave_count} waves</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;