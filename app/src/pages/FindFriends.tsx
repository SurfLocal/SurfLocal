import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, UserMinus, Waves, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchResult {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

const RESULTS_PER_PAGE = 20;

const FindFriends = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [topSurfers, setTopSurfers] = useState<SearchResult[]>([]);
  const [loadingTopSurfers, setLoadingTopSurfers] = useState(true);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const paginatedResults = results.slice(
    (currentPage - 1) * RESULTS_PER_PAGE,
    currentPage * RESULTS_PER_PAGE
  );

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user) return;
      const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      if (data) setFollowing(new Set(data.map(f => f.following_id)));
    };
    fetchFollowing();
  }, [user]);

  // Fetch top 5 most followed surfers on mount
  useEffect(() => {
    const fetchTopSurfers = async () => {
      if (!user) return;
      setLoadingTopSurfers(true);

      // Get follower counts for all users
      const { data: followCounts } = await supabase
        .from('follows')
        .select('following_id');

      if (!followCounts) {
        setLoadingTopSurfers(false);
        return;
      }

      // Count followers per user
      const counts: Record<string, number> = {};
      followCounts.forEach(f => {
        counts[f.following_id] = (counts[f.following_id] || 0) + 1;
      });

      // Sort by count and get top 5 (excluding current user)
      const topUserIds = Object.entries(counts)
        .filter(([userId]) => userId !== user.id)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId]) => userId);

      if (topUserIds.length === 0) {
        setLoadingTopSurfers(false);
        return;
      }

      // Fetch profiles for top users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .in('user_id', topUserIds);

      if (profiles) {
        // Maintain order by follower count
        const orderedProfiles = topUserIds
          .map(userId => profiles.find(p => p.user_id === userId))
          .filter(Boolean)
          .map(p => ({
            ...p!,
            is_following: following.has(p!.user_id),
          }));
        setTopSurfers(orderedProfiles);
      }
      setLoadingTopSurfers(false);
    };

    if (user) fetchTopSurfers();
  }, [user, following]);

  // Live search for suggestions (top 5)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user || !searchQuery.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .neq('user_id', user.id)
        .ilike('display_name', `%${searchQuery}%`)
        .limit(5);

      if (profiles) {
        setSuggestions(profiles.map(p => ({
          ...p,
          is_following: following.has(p.user_id),
        })));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery, user, following]);

  const handleSearch = async () => {
    if (!user || !searchQuery.trim()) return;
    setSearching(true);
    setShowSuggestions(false);
    setHasSearched(true);
    setCurrentPage(1);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio, avatar_url')
      .neq('user_id', user.id)
      .ilike('display_name', `%${searchQuery}%`);

    if (profiles) {
      setResults(profiles.map(p => ({
        ...p,
        is_following: following.has(p.user_id),
      })));
    } else {
      setResults([]);
    }
    setSearching(false);
    setSearchQuery(''); // Clear search bar after searching
  };

  const handleSelectSuggestion = (result: SearchResult) => {
    navigate(`/profile/${result.user_id}`);
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;
    await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
    setFollowing(prev => new Set([...prev, userId]));
    setResults(results.map(r => r.user_id === userId ? { ...r, is_following: true } : r));
    setSuggestions(suggestions.map(s => s.user_id === userId ? { ...s, is_following: true } : s));
    setTopSurfers(topSurfers.map(t => t.user_id === userId ? { ...t, is_following: true } : t));
    toast({ title: 'Now following!' });
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
    setFollowing(prev => { const next = new Set(prev); next.delete(userId); return next; });
    setResults(results.map(r => r.user_id === userId ? { ...r, is_following: false } : r));
    setSuggestions(suggestions.map(s => s.user_id === userId ? { ...s, is_following: false } : s));
    setTopSurfers(topSurfers.map(t => t.user_id === userId ? { ...t, is_following: false } : t));
    toast({ title: 'Unfollowed' });
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || !user) return <Layout allowScroll><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Find Friends</h1>
        <p className="text-muted-foreground mb-8">Search for other surfers to follow</p>

        {/* Search Bar */}
        <div className="relative mb-8" ref={searchContainerRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                onFocus={() => searchQuery && suggestions.length > 0 && setShowSuggestions(true)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Live Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {suggestions.map((result) => (
                <div
                  key={result.user_id}
                  className="px-4 py-3 hover:bg-muted/50 flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <Link
                    to={`/profile/${result.user_id}`}
                    className="flex items-center gap-3 flex-1"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={result.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(result.display_name || 'S')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm text-foreground">{result.display_name || 'Surfer'}</p>
                      {result.bio && <p className="text-xs text-muted-foreground line-clamp-1">{result.bio}</p>}
                    </div>
                  </Link>
                  {result.is_following ? (
                    <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); handleUnfollow(result.user_id); }}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={(e) => { e.preventDefault(); handleFollow(result.user_id); }}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Show top surfers when no search has been performed */}
          {!hasSearched && !loadingTopSurfers && topSurfers.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-foreground">Most Followed Surfers</h2>
              {topSurfers.map((result) => (
                <Card key={result.user_id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <Link to={`/profile/${result.user_id}`} className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(result.display_name || 'S')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{result.display_name || 'Surfer'}</h3>
                        {result.bio && <p className="text-sm text-muted-foreground line-clamp-1">{result.bio}</p>}
                      </div>
                    </Link>
                    {result.is_following ? (
                      <Button variant="outline" size="sm" onClick={() => handleUnfollow(result.user_id)}>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleFollow(result.user_id)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!hasSearched && loadingTopSurfers && (
            <div className="flex justify-center py-8">
              <Waves className="h-6 w-6 animate-pulse text-primary" />
            </div>
          )}

          {hasSearched && results.length === 0 && !searching && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No surfers found</p>
              </CardContent>
            </Card>
          )}
          
          {paginatedResults.map((result) => (
            <Card key={result.user_id}>
              <CardContent className="p-4 flex items-center justify-between">
                <Link to={`/profile/${result.user_id}`} className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={result.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(result.display_name || 'S')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{result.display_name || 'Surfer'}</h3>
                    {result.bio && <p className="text-sm text-muted-foreground line-clamp-1">{result.bio}</p>}
                  </div>
                </Link>
                {result.is_following ? (
                  <Button variant="outline" size="sm" onClick={() => handleUnfollow(result.user_id)}>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Unfollow
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => handleFollow(result.user_id)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FindFriends;