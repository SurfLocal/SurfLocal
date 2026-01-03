import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, UserMinus, Waves, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchResult {
  user_id: string;
  display_name: string | null;
  home_break: string | null;
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
      try {
        const data = await api.social.getFollowing(user.id);
        if (data) setFollowing(new Set(data.map((f: any) => f.user_id)));
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };
    fetchFollowing();
  }, [user]);

  // Fetch top 5 most followed surfers on mount
  useEffect(() => {
    const fetchTopSurfers = async () => {
      if (!user) return;
      setLoadingTopSurfers(true);

      try {
        // TODO: Add top surfers endpoint to backend
        const data = await api.social.getTopSurfers(user.id);
        if (data) {
          const orderedProfiles = data.map((p: any) => ({
            ...p,
            is_following: following.has(p.user_id),
          }));
          setTopSurfers(orderedProfiles);
        }
      } catch (error) {
        console.error('Error fetching top surfers:', error);
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

      try {
        const profiles = await api.profiles.search(searchQuery, 5);
        if (profiles) {
          setSuggestions(profiles
            .filter((p: any) => p.user_id !== user.id)
            .map((p: any) => ({
              ...p,
              is_following: following.has(p.user_id),
            })));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
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
    
    try {
      const profiles = await api.profiles.search(searchQuery);
      if (profiles) {
        setResults(profiles
          .filter((p: any) => p.user_id !== user.id)
          .map((p: any) => ({
            ...p,
            is_following: following.has(p.user_id),
          })));
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    }
    setSearching(false);
    setSearchQuery(''); // Clear search bar after searching
  };

  const handleSelectSuggestion = (result: SearchResult) => {
    navigate(`/profile/${result.user_id}`);
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      await api.social.follow(user.id, targetUserId);
      setFollowing(prev => new Set([...prev, targetUserId]));
      setResults(results.map(r => r.user_id === targetUserId ? { ...r, is_following: true } : r));
      setSuggestions(suggestions.map(s => s.user_id === targetUserId ? { ...s, is_following: true } : s));
      setTopSurfers(topSurfers.map(t => t.user_id === targetUserId ? { ...t, is_following: true } : t));
      toast({ title: 'Now following!' });
    } catch (error) {
      console.error('Error following:', error);
      toast({ title: 'Failed to follow', variant: 'destructive' });
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    try {
      await api.social.unfollow(user.id, targetUserId);
      setFollowing(prev => { const next = new Set(prev); next.delete(targetUserId); return next; });
      setResults(results.map(r => r.user_id === targetUserId ? { ...r, is_following: false } : r));
      setSuggestions(suggestions.map(s => s.user_id === targetUserId ? { ...s, is_following: false } : s));
      setTopSurfers(topSurfers.map(t => t.user_id === targetUserId ? { ...t, is_following: false } : t));
      toast({ title: 'Unfollowed' });
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast({ title: 'Failed to unfollow', variant: 'destructive' });
    }
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
                      {result.home_break && <p className="text-xs text-muted-foreground line-clamp-1">{result.home_break}</p>}
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
                        {result.home_break && <p className="text-sm text-muted-foreground line-clamp-1">{result.home_break}</p>}
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
                    {result.home_break && <p className="text-sm text-muted-foreground line-clamp-1">{result.home_break}</p>}
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
