import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Waves, Cloud, Wind, Send, MessageCircle, Reply, X, AlertCircle, Sunrise, Sun, Sunset, Search, MapPin, Camera, BookOpen, ChevronLeft, ChevronRight, Trash2, Star, ArrowLeft, GripVertical, Droplets, Ruler } from 'lucide-react';
import { format, startOfDay, parseISO, getHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';

const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9icm9uYXluZSIsImEiOiJjbWpwYWI0dWYyODJmM2RweTN1MjBjN3pqIn0.72-EvJIHzZaucikkpia5rg';

// Time of day options
type TimeOfDay = 'morning' | 'midday' | 'afternoon';

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string; icon: typeof Sunrise }[] = [
  { value: 'morning', label: 'Morning', icon: Sunrise },
  { value: 'midday', label: 'Midday', icon: Sun },
  { value: 'afternoon', label: 'Afternoon', icon: Sunset },
];

// Content tab options
type ContentTab = 'local-reports' | 'spot-guide' | 'photos';

const CONTENT_TABS: { value: ContentTab; label: string; icon: typeof MessageCircle }[] = [
  { value: 'local-reports', label: 'Local Reports', icon: MessageCircle },
  { value: 'spot-guide', label: 'Spot Guide', icon: BookOpen },
  { value: 'photos', label: 'Photos', icon: Camera },
];

// NEW Rating system based on session data
type SpotRating = 'unknown' | 'dog shit' | 'poor' | 'decent' | 'fun' | 'epic';

const RATING_CONFIG: Record<SpotRating, { color: string; points: number }> = {
  'unknown': { color: '#9CA3AF', points: -1 },  // grey
  'dog shit': { color: '#EF4444', points: 0 },  // red
  'poor': { color: '#F97316', points: 1 },      // orange
  'decent': { color: '#EAB308', points: 2 },    // yellow
  'fun': { color: '#22C55E', points: 3 },       // green
  'epic': { color: '#3B82F6', points: 4 },      // blue
};

// Map points to rating
const pointsToRating = (avgPoints: number): SpotRating => {
  if (avgPoints < 0) return 'unknown';
  if (avgPoints < 0.5) return 'dog shit';
  if (avgPoints < 1.5) return 'poor';
  if (avgPoints < 2.5) return 'decent';
  if (avgPoints < 3.5) return 'fun';
  return 'epic';
};

// Get current time window based on local time
const getCurrentTimeWindow = (): TimeOfDay => {
  const hour = new Date().getHours();
  // Morning: 12am-9am, Midday: 10am-2pm, Afternoon: 2pm-11:59pm
  if (hour >= 0 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  return 'afternoon';
};

// Determine time window for a session based on session_date (hour) in local time
const getSessionTimeWindow = (sessionDate: string): TimeOfDay | null => {
  const date = parseISO(sessionDate);
  const hour = date.getHours(); // Uses local timezone
  // Morning: 12am-9am, Midday: 10am-2pm, Afternoon: 2pm-11:59pm
  if (hour >= 0 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  return 'afternoon';
};

// Normalize rating string for matching
const normalizeRating = (rating: string): SpotRating => {
  const normalized = rating.toLowerCase().replace(/_/g, ' ');
  if (normalized === 'dog shit' || normalized === 'dogshit') return 'dog shit';
  if (normalized === 'poor') return 'poor';
  if (normalized === 'decent') return 'decent';
  if (normalized === 'fun') return 'fun';
  if (normalized === 'epic') return 'epic';
  return 'unknown';
};

// Break type badge colors
const BREAK_TYPE_COLORS: Record<string, string> = {
  'Beach Break': 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  'Reef Break': 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'Point Break': 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
};

interface Spot {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string | null;
  difficulty: string | null;
  break_type: string | null;
}

interface ReportComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  profile: { display_name: string | null; total_shakas_received?: number } | null;
  likes_count: number;
  kooks_count: number;
  is_liked: boolean;
  is_kooked: boolean;
  replies?: ReportComment[];
}

interface SpotPhoto {
  id: string;
  url: string;
  media_type: string;
  session_id: string;
  session_date: string;
  user_id: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SpotConditions {
  // Consensus-based from session data
  rating: { morning: SpotRating; midday: SpotRating; afternoon: SpotRating };
  size: { morning: string; midday: string; afternoon: string };
  shape: { morning: string; midday: string; afternoon: string };
  // Actual metrics (from swell/wind/tide database - empty for now)
  swell: { morning: string; midday: string; afternoon: string }; // format: "3ft 12s WNW"
  wind: { morning: string; midday: string; afternoon: string };   // format: "12 kts E"
  tide: { morning: string; midday: string; afternoon: string };   // format: "4.2 ft"
}

const SpotReports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const mapContainerDesktop = useRef<HTMLDivElement>(null);
  const mapContainerMobile = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapMobile = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markersMobileRef = useRef<mapboxgl.Marker[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>(getCurrentTimeWindow());
  const [selectedContentTab, setSelectedContentTab] = useState<ContentTab>('local-reports');
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Spot[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [initialSpotHandled, setInitialSpotHandled] = useState(false);
  const [spotConditions, setSpotConditions] = useState<SpotConditions | null>(null);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Favorites state
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteSpots, setFavoriteSpots] = useState<{ id: string; spot_id: string; display_order: number; spot: Spot }[]>([]);
  const [favoriteConditions, setFavoriteConditions] = useState<Record<string, SpotConditions>>({});
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [accessedFromFavorites, setAccessedFromFavorites] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const currentDate = format(new Date(), 'EEEE, MMMM d');
  const timezone = 'America/Los_Angeles';

  // Photos state
  const [spotPhotos, setSpotPhotos] = useState<SpotPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Fetch favorite spots
  const fetchFavorites = async () => {
    if (!user) return;
    setLoadingFavorites(true);
    
    const { data: favoritesData } = await supabase
      .from('favorite_spots')
      .select('id, spot_id, display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });
    
    if (favoritesData && favoritesData.length > 0 && spots.length > 0) {
      const enriched = favoritesData.map(fav => ({
        ...fav,
        spot: spots.find(s => s.id === fav.spot_id)!
      })).filter(f => f.spot);
      
      setFavoriteSpots(enriched);
      
      // Fetch conditions for each favorite spot
      const conditionsMap: Record<string, SpotConditions> = {};
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = new Date().toISOString();
      
      for (const fav of enriched) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('session_date, rating, wave_height, shape')
          .eq('is_public', true)
          .ilike('location', `%${fav.spot.name}%`)
          .gte('session_date', todayStart)
          .lte('session_date', todayEnd)
          .order('session_date', { ascending: false });
        
        const windowSessions: Record<TimeOfDay, { ratings: number[]; heights: string[]; shapes: string[] }> = {
          morning: { ratings: [], heights: [], shapes: [] },
          midday: { ratings: [], heights: [], shapes: [] },
          afternoon: { ratings: [], heights: [], shapes: [] },
        };
        
        sessions?.forEach(session => {
          const window = getSessionTimeWindow(session.session_date);
          if (window) {
            if (session.rating) {
              const normalizedRating = normalizeRating(session.rating);
              const config = RATING_CONFIG[normalizedRating];
              if (config && config.points >= 0) {
                windowSessions[window].ratings.push(config.points);
              }
            }
            if (session.wave_height) {
              windowSessions[window].heights.push(session.wave_height);
            }
            if (session.shape) {
              windowSessions[window].shapes.push(session.shape);
            }
          }
        });
        
        const calculateAvgRating = (ratings: number[]): SpotRating => {
          if (ratings.length === 0) return 'unknown';
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          return pointsToRating(avg);
        };
        
        const getMostCommon = (items: string[]): string => {
          if (items.length === 0) return '—';
          const counts: Record<string, number> = {};
          items.forEach(h => { counts[h] = (counts[h] || 0) + 1; });
          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        };
        
        conditionsMap[fav.spot_id] = {
          rating: {
            morning: calculateAvgRating(windowSessions.morning.ratings),
            midday: calculateAvgRating(windowSessions.midday.ratings),
            afternoon: calculateAvgRating(windowSessions.afternoon.ratings),
          },
          size: {
            morning: getMostCommon(windowSessions.morning.heights),
            midday: getMostCommon(windowSessions.midday.heights),
            afternoon: getMostCommon(windowSessions.afternoon.heights),
          },
          shape: {
            morning: getMostCommon(windowSessions.morning.shapes),
            midday: getMostCommon(windowSessions.midday.shapes),
            afternoon: getMostCommon(windowSessions.afternoon.shapes),
          },
          // Mock live data - 3ft 15s NW swell, 8 kts E wind
          swell: { morning: '3ft 15s NW', midday: '3ft 15s NW', afternoon: '3ft 15s NW' },
          wind: { morning: '8 kts E', midday: '8 kts E', afternoon: '8 kts E' },
          tide: { morning: '— ft', midday: '— ft', afternoon: '— ft' },
        };
      }
      
      setFavoriteConditions(conditionsMap);
    } else {
      setFavoriteSpots([]);
    }
    setLoadingFavorites(false);
  };

  useEffect(() => {
    if (user && spots.length > 0) {
      fetchFavorites();
    }
  }, [user, spots]);

  // Toggle favorite for current spot
  const toggleFavorite = async () => {
    if (!user || !selectedSpot || selectedSpot.id.startsWith('temp-')) return;
    
    const existing = favoriteSpots.find(f => f.spot_id === selectedSpot.id);
    
    if (existing) {
      await supabase.from('favorite_spots').delete().eq('id', existing.id);
      setFavoriteSpots(prev => prev.filter(f => f.id !== existing.id));
      toast({ title: 'Removed from favorites' });
    } else {
      const maxOrder = favoriteSpots.length > 0 ? Math.max(...favoriteSpots.map(f => f.display_order)) : -1;
      const { data, error } = await supabase
        .from('favorite_spots')
        .insert({ user_id: user.id, spot_id: selectedSpot.id, display_order: maxOrder + 1 })
        .select()
        .single();
      
      if (data && !error) {
        setFavoriteSpots(prev => [...prev, { ...data, spot: selectedSpot }]);
        toast({ title: 'Added to favorites' });
      }
    }
  };

  // Remove favorite by ID
  const removeFavorite = async (e: React.MouseEvent, favoriteId: string) => {
    e.stopPropagation();
    if (!user) return;
    
    await supabase.from('favorite_spots').delete().eq('id', favoriteId);
    setFavoriteSpots(prev => prev.filter(f => f.id !== favoriteId));
    toast({ title: 'Removed from favorites' });
  };

  // Handle drag and drop reordering
  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;
    
    const draggedIndex = favoriteSpots.findIndex(f => f.id === draggedItem);
    const targetIndex = favoriteSpots.findIndex(f => f.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newFavorites = [...favoriteSpots];
    const [removed] = newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(targetIndex, 0, removed);
    
    setFavoriteSpots(newFavorites);
  };

  const handleDragEnd = async () => {
    if (!draggedItem) return;
    setDraggedItem(null);
    
    // Update display_order in database
    const updates = favoriteSpots.map((fav, index) => 
      supabase.from('favorite_spots').update({ display_order: index }).eq('id', fav.id)
    );
    await Promise.all(updates);
  };

// Padding for desktop flyTo to offset for the report panel on the right
  // This uses Mapbox's built-in padding feature to properly center the spot in the visible area
  const DESKTOP_MAP_PADDING = { top: 0, bottom: 0, left: 0, right: 420 };

// Handle clicking on a favorite spot
  const handleFavoriteClick = (spot: Spot) => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    setAccessedFromFavorites(isMobile); // Only track for mobile back navigation
    if (isMobile) {
      setShowFavorites(false); // Only close favorites on mobile
    }
    setSelectedSpot(spot);
    setSelectedContentTab('local-reports');
    
// Zoom desktop map with padding to account for panel and show crosshairs after animation
    pendingCrosshairsRef.current = true;
    if (map.current) {
      map.current.stop();
      map.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
        padding: DESKTOP_MAP_PADDING,
      });
      map.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && map.current && map.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
    
    // Zoom mobile map and show crosshairs after animation (no offset needed)
    if (mapMobile.current) {
      mapMobile.current.stop();
      mapMobile.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
      });
      mapMobile.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && mapMobile.current && mapMobile.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
  };

// Handle back to favorites
  const handleBackToFavorites = () => {
    setShowCrosshairs(false);
    setSelectedSpot(null);
    setAccessedFromFavorites(false);
    setShowFavorites(true);
  };

  // Check if current spot is favorited
  const isSpotFavorited = selectedSpot ? favoriteSpots.some(f => f.spot_id === selectedSpot.id) : false;

  // Fetch spots from database
  useEffect(() => {
    const fetchSpots = async () => {
      const { data: dbSpots } = await supabase
        .from('spots')
        .select('id, name, location, latitude, longitude, description, difficulty, break_type');
      
      if (dbSpots && dbSpots.length > 0) {
        setSpots(dbSpots as Spot[]);
      }
    };
    fetchSpots();
  }, []);


  // Fetch spot conditions from session data
  useEffect(() => {
    const fetchSpotConditions = async () => {
      if (!selectedSpot) {
        setSpotConditions(null);
        setLoadingConditions(false);
        return;
      }

      setLoadingConditions(true);
      
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = new Date().toISOString();

      // Fetch today's sessions at this spot
      const { data: sessions } = await supabase
        .from('sessions')
        .select('session_date, rating, wave_height, shape')
        .eq('is_public', true)
        .ilike('location', `%${selectedSpot.name}%`)
        .gte('session_date', todayStart)
        .lte('session_date', todayEnd)
        .order('session_date', { ascending: false });

      // Calculate average rating per time window
      const windowSessions: Record<TimeOfDay, { ratings: number[]; heights: string[]; shapes: string[] }> = {
        morning: { ratings: [], heights: [], shapes: [] },
        midday: { ratings: [], heights: [], shapes: [] },
        afternoon: { ratings: [], heights: [], shapes: [] },
      };

      // Track which time windows have sessions to determine the most recent one
      let mostRecentTimeWindow: TimeOfDay | null = null;

      sessions?.forEach((session, index) => {
        const window = getSessionTimeWindow(session.session_date);
        if (window) {
          // The first session (most recent) determines the default tab
          if (index === 0 && session.rating) {
            mostRecentTimeWindow = window;
          }
          
          if (session.rating) {
            const normalizedRating = normalizeRating(session.rating);
            const config = RATING_CONFIG[normalizedRating];
            if (config && config.points >= 0) {
              windowSessions[window].ratings.push(config.points);
            }
          }
          if (session.wave_height) {
            windowSessions[window].heights.push(session.wave_height);
          }
          if (session.shape) {
            windowSessions[window].shapes.push(session.shape);
          }
        }
      });

      // Default to most recent session's time window, or current time if no sessions or all unknown
      const hasAnyRating = windowSessions.morning.ratings.length > 0 || 
                           windowSessions.midday.ratings.length > 0 || 
                           windowSessions.afternoon.ratings.length > 0;
      
      if (mostRecentTimeWindow && hasAnyRating) {
        setSelectedTimeOfDay(mostRecentTimeWindow);
      } else {
        // All unknown, default to current time window
        setSelectedTimeOfDay(getCurrentTimeWindow());
      }

      const calculateAvgRating = (ratings: number[]): SpotRating => {
        if (ratings.length === 0) return 'unknown';
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        return pointsToRating(avg);
      };

      const getMostCommon = (items: string[]): string => {
        if (items.length === 0) return '—';
        const counts: Record<string, number> = {};
        items.forEach(h => { counts[h] = (counts[h] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      };

setSpotConditions({
        // Consensus from session data
        rating: {
          morning: calculateAvgRating(windowSessions.morning.ratings),
          midday: calculateAvgRating(windowSessions.midday.ratings),
          afternoon: calculateAvgRating(windowSessions.afternoon.ratings),
        },
        size: {
          morning: getMostCommon(windowSessions.morning.heights),
          midday: getMostCommon(windowSessions.midday.heights),
          afternoon: getMostCommon(windowSessions.afternoon.heights),
        },
        shape: {
          morning: getMostCommon(windowSessions.morning.shapes),
          midday: getMostCommon(windowSessions.midday.shapes),
          afternoon: getMostCommon(windowSessions.afternoon.shapes),
        },
        // Mock live data - 3ft 15s NW swell, 8 kts E wind
        swell: { morning: '3ft 15s NW', midday: '3ft 15s NW', afternoon: '3ft 15s NW' },
        wind: { morning: '8 kts E', midday: '8 kts E', afternoon: '8 kts E' },
        tide: { morning: '— ft', midday: '— ft', afternoon: '— ft' },
      });
      
      setLoadingConditions(false);
    };

    fetchSpotConditions();
  }, [selectedSpot]);

  // Spot ratings state for map markers - use most recent rating instead of current time window
  const [spotRatings, setSpotRatings] = useState<Record<string, SpotRating>>({});

  // Fetch all spot ratings based on most recent session for each spot
  const fetchAllSpotRatings = async () => {
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = new Date().toISOString();

    const { data: sessions } = await supabase
      .from('sessions')
      .select('location, session_date, rating')
      .gte('session_date', todayStart)
      .lte('session_date', todayEnd)
      .eq('is_public', true)
      .order('session_date', { ascending: false });

    // Group by location and take the most recent session's rating
    const mostRecentRatings: Record<string, SpotRating> = {};
    
    sessions?.forEach(session => {
      // Only take the first (most recent) rating for each location
      if (!mostRecentRatings[session.location] && session.rating) {
        const normalizedRating = normalizeRating(session.rating);
        if (normalizedRating !== 'unknown') {
          mostRecentRatings[session.location] = normalizedRating;
        }
      }
    });
    
    setSpotRatings(mostRecentRatings);
  };

  useEffect(() => {
    fetchAllSpotRatings();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAllSpotRatings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for session-logged events to refresh ratings
  useEffect(() => {
    const handleSessionLogged = () => {
      fetchAllSpotRatings();
    };
    
    window.addEventListener('session-logged', handleSessionLogged);
    return () => window.removeEventListener('session-logged', handleSessionLogged);
  }, []);

  // Get current marker color based on current time window rating
  const getSpotMarkerColor = (spot: Spot): string => {
    const rating = spotRatings[spot.name] || 'unknown';
    return RATING_CONFIG[rating].color;
  };

  // Format timestamp in spot's timezone
  const formatCommentTime = (timestamp: string) => {
    return formatInTimeZone(new Date(timestamp), timezone, 'h:mm a');
  };

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = spots.filter(spot => 
        spot.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, spots]);

const handleSelectSearchResult = (spot: Spot) => {
    setSelectedSpot(spot);
    setSearchQuery('');
    setShowSearchResults(false);
    
// Zoom desktop map with padding to account for panel and show crosshairs after animation
    pendingCrosshairsRef.current = true;
    if (map.current) {
      map.current.stop();
      map.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
        padding: DESKTOP_MAP_PADDING,
      });
      map.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && map.current && map.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
    
    // Zoom mobile map and show crosshairs after animation (no offset needed)
    if (mapMobile.current) {
      mapMobile.current.stop();
      mapMobile.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
      });
      mapMobile.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && mapMobile.current && mapMobile.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
  };

const handleSpotClick = (spot: Spot) => {
    setSelectedSpot(spot);
    setSelectedContentTab('local-reports');
    setShowFavorites(false); // Close favorites panel when clicking a spot pin
    
    // Helper to check if map is already at target zoom and centered on spot
    const isAlreadyAtTarget = (mapInstance: mapboxgl.Map, spotLng: number, spotLat: number) => {
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      const distance = Math.sqrt(Math.pow(center.lng - spotLng, 2) + Math.pow(center.lat - spotLat, 2));
      // Must be very close to target zoom (14) and centered - be strict
      return zoom >= 13.8 && distance < 0.0005;
    };
    
    // Check if we need to animate at all
    const desktopNeedsAnimation = map.current && !isAlreadyAtTarget(map.current, spot.longitude, spot.latitude);
    const mobileNeedsAnimation = mapMobile.current && !isAlreadyAtTarget(mapMobile.current, spot.longitude, spot.latitude);
    
    // Only show crosshairs instantly if NO animation is needed on either map
    if (!desktopNeedsAnimation && !mobileNeedsAnimation) {
      setShowCrosshairs(true);
      return;
    }
    
    // Otherwise, animate and wait for completion
    pendingCrosshairsRef.current = true;
    
    // Zoom desktop map with padding to account for panel
    if (map.current && desktopNeedsAnimation) {
      map.current.stop();
      map.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
        padding: DESKTOP_MAP_PADDING,
      });
      map.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && map.current && map.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
    
    // Zoom mobile map (no offset needed)
    if (mapMobile.current && mobileNeedsAnimation) {
      mapMobile.current.stop();
      mapMobile.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 14,
        duration: 1500,
      });
      mapMobile.current.once('moveend', () => {
        if (pendingCrosshairsRef.current && mapMobile.current && mapMobile.current.getZoom() >= 13) {
          setShowCrosshairs(true);
        }
        pendingCrosshairsRef.current = false;
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize desktop map
  const [mapReady, setMapReady] = useState(false);
  
  useEffect(() => {
    if (!mapContainerDesktop.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainerDesktop.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-117.2, 33.2],
        zoom: 7.5,
      });
      
      map.current.on('load', () => {
        setMapReady(true);
      });

      // Handle window resize (e.g., going fullscreen)
      const handleResize = () => {
        if (map.current) {
          map.current.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (map.current) {
          map.current.remove();
          map.current = null;
          setMapReady(false);
        }
      };
    } catch (error) {
      console.error('Error initializing desktop map:', error);
    }
  }, []);

  // Initialize mobile map
  const [mobileMapReady, setMobileMapReady] = useState(false);
  
  useEffect(() => {
    if (!mapContainerMobile.current || mapMobile.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      mapMobile.current = new mapboxgl.Map({
        container: mapContainerMobile.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-117.2, 33.2],
        zoom: 7.5,
      });
      
      mapMobile.current.on('load', () => {
        setMobileMapReady(true);
      });
    } catch (error) {
      console.error('Error initializing mobile map:', error);
    }

    return () => {
      if (mapMobile.current) {
        mapMobile.current.remove();
        mapMobile.current = null;
        setMobileMapReady(false);
      }
    };
  }, []);


// Store the last selected spot for centering when closing
  const lastSelectedSpotRef = useRef<Spot | null>(null);
  
  // Crosshairs overlay refs
  const crosshairsDesktopRef = useRef<HTMLDivElement | null>(null);
  const crosshairsMobileRef = useRef<HTMLDivElement | null>(null);
  const [showCrosshairs, setShowCrosshairs] = useState(false);
  const crosshairsSpotRef = useRef<Spot | null>(null);
  const pendingCrosshairsRef = useRef<boolean>(false); // Track if we're expecting crosshairs from flyTo
  
// Reset crosshairs state on component mount to prevent stale crosshairs from appearing
  useEffect(() => {
    setShowCrosshairs(false);
    lastSelectedSpotRef.current = null;
    crosshairsSpotRef.current = null;
    // Clean up any existing crosshairs DOM elements
    if (crosshairsDesktopRef.current) {
      crosshairsDesktopRef.current.remove();
      crosshairsDesktopRef.current = null;
    }
    if (crosshairsMobileRef.current) {
      crosshairsMobileRef.current.remove();
      crosshairsMobileRef.current = null;
    }
  }, []);
  
// Extract direction from swell/wind string (e.g., "3ft 15s NW" -> "NW", "8 kts E" -> "E")
  const extractDirection = (dataString: string): string => {
    const parts = dataString.trim().split(' ');
    // Direction is typically the last part
    const lastPart = parts[parts.length - 1];
    const validDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    if (validDirections.includes(lastPart.toUpperCase())) {
      return lastPart.toUpperCase();
    }
    return 'N'; // Default fallback
  };
  
  // Convert compass direction to angle (degrees from north, clockwise)
  // The arrow points FROM the direction, so NW swell means arrow comes from NW (315°)
  const directionToAngle = (direction: string): number => {
    const directions: Record<string, number> = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
    };
    return directions[direction.toUpperCase()] ?? 0;
  };
  
// Create crosshairs overlay element using live spot data
  const createCrosshairsElement = (swellDirection: string, windDirection: string): HTMLDivElement => {
    const container = document.createElement('div');
    container.className = 'crosshairs-overlay';
    container.style.cssText = `
      position: absolute;
      width: 200px;
      height: 200px;
      pointer-events: none;
      z-index: 1;
    `;
    
    // Calculate arrow rotations - arrows positioned at their source direction, pointing INWARD toward center
    // Rotating by just the angle positions the arrow in that direction with tip pointing toward center
    const swellAngle = directionToAngle(swellDirection);
    const windAngle = directionToAngle(windDirection);
    
    container.innerHTML = `
      <svg width="200" height="200" viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0;">
        <!-- Crosshairs - faint light blue -->
        <line x1="100" y1="20" x2="100" y2="80" stroke="rgba(135, 206, 250, 0.5)" stroke-width="2" stroke-dasharray="4 4" />
        <line x1="100" y1="120" x2="100" y2="180" stroke="rgba(135, 206, 250, 0.5)" stroke-width="2" stroke-dasharray="4 4" />
        <line x1="20" y1="100" x2="80" y2="100" stroke="rgba(135, 206, 250, 0.5)" stroke-width="2" stroke-dasharray="4 4" />
        <line x1="120" y1="100" x2="180" y2="100" stroke="rgba(135, 206, 250, 0.5)" stroke-width="2" stroke-dasharray="4 4" />
        
        <!-- Swell arrow - deep blue, positioned in source direction with tip pointing toward center -->
        <!-- Arrow starts pointing DOWN (toward center), then rotates to source direction -->
        <g transform="rotate(${swellAngle}, 100, 100)">
          <polygon 
            points="100,75 92,55 100,60 108,55" 
            fill="rgba(30, 64, 175, 0.85)"
            stroke="rgba(30, 64, 175, 1)"
            stroke-width="1"
          />
          <line x1="100" y1="30" x2="100" y2="55" stroke="rgba(30, 64, 175, 0.85)" stroke-width="3" />
        </g>
        
        <!-- Wind arrow - red, positioned in source direction with tip pointing toward center -->
        <g transform="rotate(${windAngle}, 100, 100)">
          <polygon 
            points="100,75 92,55 100,60 108,55" 
            fill="rgba(220, 38, 38, 0.85)"
            stroke="rgba(220, 38, 38, 1)"
            stroke-width="1"
          />
          <line x1="100" y1="30" x2="100" y2="55" stroke="rgba(220, 38, 38, 0.85)" stroke-width="3" />
        </g>
      </svg>
    `;
    
    return container;
  };
  
// Add crosshairs to map at spot location
  const addCrosshairsToMap = (mapInstance: mapboxgl.Map, spot: Spot, overlayRef: React.MutableRefObject<HTMLDivElement | null>, conditions: SpotConditions | null) => {
    // Remove existing crosshairs
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
    
    // Get directions from spotConditions, use current time of day
    const swellData = conditions?.swell[selectedTimeOfDay] || '3ft 15s NW';
    const windData = conditions?.wind[selectedTimeOfDay] || '8 kts E';
    const swellDirection = extractDirection(swellData);
    const windDirection = extractDirection(windData);
    
    const overlay = createCrosshairsElement(swellDirection, windDirection);
    overlayRef.current = overlay;
    
    // Position the overlay at the spot's location
    const updatePosition = () => {
      if (!mapInstance || !overlay) return;
      const point = mapInstance.project([spot.longitude, spot.latitude]);
      overlay.style.left = `${point.x - 100}px`;
      overlay.style.top = `${point.y - 100}px`;
    };
    
    updatePosition();
    
    // Update position on map move/zoom
    mapInstance.on('move', updatePosition);
    
    // Add to map container
    mapInstance.getContainer().appendChild(overlay);
    
    // Store cleanup function
    (overlay as any)._cleanup = () => {
      mapInstance.off('move', updatePosition);
    };
  };
  
  // Remove crosshairs from map
  const removeCrosshairs = (overlayRef: React.MutableRefObject<HTMLDivElement | null>) => {
    if (overlayRef.current) {
      if ((overlayRef.current as any)._cleanup) {
        (overlayRef.current as any)._cleanup();
      }
      overlayRef.current.remove();
      overlayRef.current = null;
    }
  };
  
// Show crosshairs when spot is selected and zoomed, or on mobile when panel is closed but we still have a spot
  useEffect(() => {
    // Determine which spot to use for crosshairs (current selection or last selected for mobile)
    const spotForCrosshairs = selectedSpot || lastSelectedSpotRef.current;
    
    if (showCrosshairs && spotForCrosshairs) {
      crosshairsSpotRef.current = spotForCrosshairs;
      
      // Desktop: only show if spot is selected (panel is open)
      if (map.current && mapReady && selectedSpot) {
        addCrosshairsToMap(map.current, spotForCrosshairs, crosshairsDesktopRef, spotConditions);
      } else {
        removeCrosshairs(crosshairsDesktopRef);
      }
      
      // Mobile: show crosshairs even when panel is closed (using lastSelectedSpotRef)
      if (mapMobile.current && mobileMapReady) {
        addCrosshairsToMap(mapMobile.current, spotForCrosshairs, crosshairsMobileRef, spotConditions);
      }
    } else {
      removeCrosshairs(crosshairsDesktopRef);
      removeCrosshairs(crosshairsMobileRef);
      crosshairsSpotRef.current = null;
    }
    
    return () => {
      removeCrosshairs(crosshairsDesktopRef);
      removeCrosshairs(crosshairsMobileRef);
    };
  }, [selectedSpot, showCrosshairs, mapReady, mobileMapReady, spotConditions, selectedTimeOfDay]);
  
  // Hide crosshairs on user interaction (mouse/touch/wheel - not triggered by programmatic flyTo)
  useEffect(() => {
    const handleMapInteraction = () => {
      pendingCrosshairsRef.current = false; // Cancel any pending crosshairs
      setShowCrosshairs(false);
    };
    
    const desktopContainer = map.current?.getContainer();
    const mobileContainer = mapMobile.current?.getContainer();
    
    if (desktopContainer && mapReady) {
      desktopContainer.addEventListener('mousedown', handleMapInteraction);
      desktopContainer.addEventListener('touchstart', handleMapInteraction);
      desktopContainer.addEventListener('wheel', handleMapInteraction);
    }
    if (mobileContainer && mobileMapReady) {
      mobileContainer.addEventListener('mousedown', handleMapInteraction);
      mobileContainer.addEventListener('touchstart', handleMapInteraction);
      mobileContainer.addEventListener('wheel', handleMapInteraction);
    }
    
    return () => {
      if (desktopContainer) {
        desktopContainer.removeEventListener('mousedown', handleMapInteraction);
        desktopContainer.removeEventListener('touchstart', handleMapInteraction);
        desktopContainer.removeEventListener('wheel', handleMapInteraction);
      }
      if (mobileContainer) {
        mobileContainer.removeEventListener('mousedown', handleMapInteraction);
        mobileContainer.removeEventListener('touchstart', handleMapInteraction);
        mobileContainer.removeEventListener('wheel', handleMapInteraction);
      }
    };
  }, [mapReady, mobileMapReady]);
  
  // Update ref when spot is selected
  useEffect(() => {
    if (selectedSpot) {
      lastSelectedSpotRef.current = selectedSpot;
    }
  }, [selectedSpot]);

// Resize mobile map when selectedSpot changes (for mobile view toggling)
  // Keep map centered on spot, keep zoom level, and keep crosshairs visible
  useEffect(() => {
    if (!selectedSpot && lastSelectedSpotRef.current) {
      // Give time for the map container to become visible, then just resize without changing position
      const resizeMap = () => {
        if (mapMobile.current) {
          mapMobile.current.resize();
          // Keep the current center and zoom - don't change position
          // Just ensure crosshairs stay visible by re-triggering the display
          setShowCrosshairs(true);
        } else {
          // Map not ready yet, retry
          setTimeout(resizeMap, 100);
        }
      };
      setTimeout(resizeMap, 50);
    }
  }, [selectedSpot]);

  // Update desktop markers when spots or ratings change
  useEffect(() => {
    if (!map.current || spots.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each spot with current rating color
    spots.forEach((spot) => {
      const color = getSpotMarkerColor(spot);
      
      const el = document.createElement('div');
      el.className = 'spot-marker';
      el.innerHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform border-2 border-white" style="background-color: ${color};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
          <path d="M21 12c0 1.657-4.03 3-9 3s-9-1.343-9-3"/>
          <path d="M3 12c0-1.657 4.03-3 9-3s9 1.343 9 3"/>
          <path d="M12 15v6"/>
        </svg>
      </div>`;
      
      el.addEventListener('click', () => handleSpotClick(spot));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);
      
      markersRef.current.push(marker);
    });
  }, [spots, spotRatings]);

  // Update mobile markers when spots or ratings change
  useEffect(() => {
    if (!mapMobile.current || spots.length === 0) return;

    // Clear existing markers
    markersMobileRef.current.forEach(marker => marker.remove());
    markersMobileRef.current = [];

    // Add markers for each spot with current rating color
    spots.forEach((spot) => {
      const color = getSpotMarkerColor(spot);
      
      const el = document.createElement('div');
      el.className = 'spot-marker';
      el.innerHTML = `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform border-2 border-white" style="background-color: ${color};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
          <path d="M21 12c0 1.657-4.03 3-9 3s-9-1.343-9-3"/>
          <path d="M3 12c0-1.657 4.03-3 9-3s9 1.343 9 3"/>
          <path d="M12 15v6"/>
        </svg>
      </div>`;
      
      el.addEventListener('click', () => handleSpotClick(spot));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(mapMobile.current!);
      
      markersMobileRef.current.push(marker);
    });
  }, [spots, spotRatings, mobileMapReady]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedSpot || !user) return;
      
      if (selectedSpot.id.startsWith('temp-')) {
        setComments([]);
        return;
      }
      
      const todayStart = startOfDay(new Date()).toISOString();
      
      const { data } = await supabase
        .from('forecast_comments')
        .select('id, content, created_at, user_id, parent_id')
        .eq('spot_id', selectedSpot.id)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false });
      
      if (data) {
        const enriched: ReportComment[] = await Promise.all(data.map(async (c) => {
          const [profileRes, likesRes, myLikeRes, kooksRes, myKookRes] = await Promise.all([
            supabase.from('profiles').select('display_name, total_shakas_received').eq('user_id', c.user_id).maybeSingle(),
            supabase.from('forecast_comment_likes').select('id', { count: 'exact' }).eq('comment_id', c.id),
            supabase.from('forecast_comment_likes').select('id').eq('comment_id', c.id).eq('user_id', user.id).maybeSingle(),
            supabase.from('forecast_comment_kooks').select('id', { count: 'exact' }).eq('comment_id', c.id),
            supabase.from('forecast_comment_kooks').select('id').eq('comment_id', c.id).eq('user_id', user.id).maybeSingle(),
          ]);
          return { 
            ...c, 
            profile: profileRes.data,
            likes_count: likesRes.count || 0,
            kooks_count: kooksRes.count || 0,
            is_liked: !!myLikeRes.data,
            is_kooked: !!myKookRes.data,
            replies: [],
          };
        }));

        const topLevel = enriched.filter(c => !c.parent_id);
        const repliesArr = enriched.filter(c => c.parent_id);
        topLevel.forEach(c => {
          c.replies = repliesArr.filter(r => r.parent_id === c.id);
        });
        
        // Sort by score: (likes - kooks), highest first
        topLevel.sort((a, b) => {
          const scoreA = a.likes_count - a.kooks_count;
          const scoreB = b.likes_count - b.kooks_count;
          return scoreB - scoreA;
        });
        
        setComments(topLevel);
      }
    };
    fetchComments();
  }, [selectedSpot, user]);

  // Fetch photos for the selected spot from public sessions
  useEffect(() => {
    const fetchSpotPhotos = async () => {
      if (!selectedSpot || selectedSpot.id.startsWith('temp-')) {
        setSpotPhotos([]);
        return;
      }

      setLoadingPhotos(true);
      
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, session_date, user_id, location')
        .eq('is_public', true)
        .ilike('location', `%${selectedSpot.name}%`);

      if (!sessions || sessions.length === 0) {
        setSpotPhotos([]);
        setLoadingPhotos(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      
      const { data: media } = await supabase
        .from('session_media')
        .select('id, url, media_type, session_id, user_id')
        .in('session_id', sessionIds)
        .like('media_type', 'image%');

      if (!media || media.length === 0) {
        setSpotPhotos([]);
        setLoadingPhotos(false);
        return;
      }

      const userIds = [...new Set(media.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const sessionDateMap = new Map(sessions.map(s => [s.id, s.session_date]));
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedPhotos: SpotPhoto[] = media.map(m => ({
        ...m,
        session_date: sessionDateMap.get(m.session_id) || '',
        profile: profileMap.get(m.user_id) || null,
      }));

      setSpotPhotos(enrichedPhotos);
      setLoadingPhotos(false);
    };

    fetchSpotPhotos();
  }, [selectedSpot]);

  const handleComment = async () => {
    if (!user || !selectedSpot || !newComment.trim()) return;
    
    if (selectedSpot.id.startsWith('temp-')) {
      toast({ 
        title: 'Cannot post report', 
        description: 'This spot is not yet in our database. Check back soon!', 
        variant: 'destructive' 
      });
      return;
    }
    
    const { data, error } = await supabase.from('forecast_comments').insert({ 
      spot_id: selectedSpot.id, 
      user_id: user.id, 
      content: newComment 
    }).select().single();
    
    if (!error && data) {
      const { data: profile } = await supabase.from('profiles').select('display_name, total_shakas_received').eq('user_id', user.id).maybeSingle();
      setComments([{ ...data, profile, likes_count: 0, kooks_count: 0, is_liked: false, is_kooked: false, replies: [] }, ...comments]);
      setNewComment('');
      toast({ title: 'Report posted!' });
    } else if (error) {
      toast({ title: 'Failed to post report', description: error.message, variant: 'destructive' });
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user || !selectedSpot || !replyContent.trim()) return;
    
    if (selectedSpot.id.startsWith('temp-')) {
      toast({ 
        title: 'Cannot post reply', 
        description: 'This spot is not yet in our database.', 
        variant: 'destructive' 
      });
      return;
    }
    
    const { data, error } = await supabase.from('forecast_comments').insert({ 
      spot_id: selectedSpot.id, 
      user_id: user.id, 
      content: replyContent,
      parent_id: parentId,
    }).select().single();
    if (!error && data) {
      const { data: profile } = await supabase.from('profiles').select('display_name, total_shakas_received').eq('user_id', user.id).maybeSingle();
      setComments(comments.map(c => c.id === parentId ? {
        ...c,
        replies: [...(c.replies || []), { ...data, profile, likes_count: 0, kooks_count: 0, is_liked: false, is_kooked: false }],
      } : c));
      setReplyContent('');
      setReplyingTo(null);
      toast({ title: 'Reply posted!' });
    }
  };

  const handleLikeComment = async (commentId: string, commentUserId: string, isLiked: boolean) => {
    if (!user) return;
    
    // Prevent self-liking
    if (user.id === commentUserId) {
      toast({ title: 'Cannot shaka your own post', variant: 'destructive' });
      return;
    }
    
    try {
      if (isLiked) {
        await supabase.from('forecast_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
        // Decrement total_shakas_received for comment owner
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_shakas_received')
          .eq('user_id', commentUserId)
          .maybeSingle();
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ total_shakas_received: Math.max(0, (profileData.total_shakas_received || 0) - 1) })
            .eq('user_id', commentUserId);
        }
      } else {
        await supabase.from('forecast_comment_likes').insert({ comment_id: commentId, user_id: user.id });
        // Increment total_shakas_received for comment owner
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_shakas_received')
          .eq('user_id', commentUserId)
          .maybeSingle();
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ total_shakas_received: (profileData.total_shakas_received || 0) + 1 })
            .eq('user_id', commentUserId);
        }
      }

      const updateComment = (c: ReportComment): ReportComment => {
        if (c.id === commentId) {
          return { ...c, is_liked: !isLiked, likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1 };
        }
        if (c.replies) {
          return { ...c, replies: c.replies.map(updateComment) };
        }
        return c;
      };
      setComments(comments.map(updateComment));
    } catch (err) {
      console.error('handleLikeComment error:', err);
    }
  };

  const handleKookComment = async (commentId: string, commentUserId: string, isKooked: boolean) => {
    if (!user) return;
    
    // Prevent self-kooking
    if (user.id === commentUserId) {
      toast({ title: 'Cannot kook your own post', variant: 'destructive' });
      return;
    }
    
    try {
      if (isKooked) {
        await supabase.from('forecast_comment_kooks').delete().eq('comment_id', commentId).eq('user_id', user.id);
        // Decrement total_kooks_received for comment owner
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_kooks_received')
          .eq('user_id', commentUserId)
          .maybeSingle();
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ total_kooks_received: Math.max(0, (profileData.total_kooks_received || 0) - 1) })
            .eq('user_id', commentUserId);
        }
      } else {
        await supabase.from('forecast_comment_kooks').insert({ comment_id: commentId, user_id: user.id });
        // Increment total_kooks_received for comment owner
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_kooks_received')
          .eq('user_id', commentUserId)
          .maybeSingle();
        if (profileData) {
          await supabase
            .from('profiles')
            .update({ total_kooks_received: (profileData.total_kooks_received || 0) + 1 })
            .eq('user_id', commentUserId);
        }
      }

      const updateComment = (c: ReportComment): ReportComment => {
        if (c.id === commentId) {
          return { ...c, is_kooked: !isKooked, kooks_count: isKooked ? c.kooks_count - 1 : c.kooks_count + 1 };
        }
        if (c.replies) {
          return { ...c, replies: c.replies.map(updateComment) };
        }
        return c;
      };
      setComments(comments.map(updateComment));
    } catch (err) {
      console.error('handleKookComment error:', err);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    // Allow deletion if user owns the comment OR is admin
    if (!user || (user.id !== commentUserId && !isAdmin)) return;
    
    try {
      await supabase.from('forecast_comments').delete().eq('id', commentId);
      
      // Remove from state - check both top-level and replies
      const removeComment = (commentsList: ReportComment[]): ReportComment[] => {
        return commentsList
          .filter(c => c.id !== commentId)
          .map(c => c.replies ? { ...c, replies: c.replies.filter(r => r.id !== commentId) } : c);
      };
      setComments(removeComment(comments));
      toast({ title: 'Comment deleted' });
    } catch (err) {
      console.error('handleDeleteComment error:', err);
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  // Consensus metrics from session data
  const currentRating = spotConditions?.rating[selectedTimeOfDay] || 'unknown';
  const currentSize = spotConditions?.size[selectedTimeOfDay] || '—';
  const currentShape = spotConditions?.shape[selectedTimeOfDay] || '—';
  // Actual metrics from swell/wind/tide database (empty for now)
  const currentSwell = spotConditions?.swell[selectedTimeOfDay] || '— — —';
  const currentWind = spotConditions?.wind[selectedTimeOfDay] || '— kts —';
  const currentTide = spotConditions?.tide[selectedTimeOfDay] || '— ft';
  const isTempSpot = selectedSpot?.id.startsWith('temp-');

  return (
    <Layout>
      {/* Desktop layout - absolute positioning */}
      <div className="hidden md:flex relative flex-1 h-full overflow-hidden">
        {/* Map */}
        <div ref={mapContainerDesktop} className="absolute inset-0" />

        {/* Custom marker styles */}
        <style>{`
          .spot-marker { cursor: pointer; }
          .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        `}</style>

        {/* Search Bar and Favorites Toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10" ref={searchContainerRef}>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search surf spots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className="pl-10 bg-card/95 backdrop-blur-sm border-border shadow-lg"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {searchResults.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => handleSelectSearchResult(spot)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b border-border last:border-b-0"
                  >
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-foreground">{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.location}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-4">
                <p className="text-sm text-muted-foreground text-center">No spots found</p>
              </div>
            )}
          </div>
          <Button
            variant={showFavorites ? 'default' : 'outline'}
            size="icon"
            onClick={() => {
              if (!showFavorites) setSelectedSpot(null);
              setShowFavorites(!showFavorites);
            }}
            className={`bg-card/95 backdrop-blur-sm shadow-lg ${showFavorites ? 'bg-primary hover:bg-primary/90' : ''}`}
            title="Favorites"
          >
            <Star className={`h-4 w-4 ${showFavorites ? 'fill-primary-foreground text-primary-foreground' : ''}`} />
          </Button>
        </div>


        {/* Favorites Panel - Right side, same size as spot details (desktop only) */}
        {showFavorites && !selectedSpot && (
          <div className="absolute right-4 top-20 bottom-4 w-96 max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-primary fill-primary" />
                    Favorite Spots
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setShowFavorites(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {loadingFavorites ? (
                  <div className="flex justify-center py-8">
                    <Waves className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                ) : favoriteSpots.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No favorite spots yet.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click the star on a spot to add it to your favorites.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favoriteSpots.map((fav) => {
                      const conditions = favoriteConditions[fav.spot_id];
                      const currentTimeWindow = getCurrentTimeWindow();
                      
                      // Get most recent available data, falling back through time windows
                      // Order: afternoon -> midday -> morning (based on time of day progression)
                      const getTimeWindowOrder = (): TimeOfDay[] => {
                        if (currentTimeWindow === 'afternoon') return ['afternoon', 'midday', 'morning'];
                        if (currentTimeWindow === 'midday') return ['midday', 'morning'];
                        return ['morning'];
                      };
                      
                      const findBestValue = <T,>(
                        getter: (tw: TimeOfDay) => T | undefined,
                        fallback: T,
                        isValid: (val: T | undefined) => boolean
                      ): T => {
                        for (const tw of getTimeWindowOrder()) {
                          const val = getter(tw);
                          if (isValid(val)) return val!;
                        }
                        return fallback;
                      };
                      
                      const rating = findBestValue(
                        (tw) => conditions?.rating[tw],
                        'unknown' as SpotRating,
                        (val) => val !== undefined && val !== 'unknown'
                      );
                      const size = findBestValue(
                        (tw) => conditions?.size[tw],
                        '—',
                        (val) => val !== undefined && val !== '—'
                      );
                      const shape = findBestValue(
                        (tw) => conditions?.shape[tw],
                        '—',
                        (val) => val !== undefined && val !== '—'
                      );
                      
                      return (
                        <div
                          key={fav.id}
                          draggable
                          onDragStart={() => handleDragStart(fav.id)}
                          onDragOver={(e) => handleDragOver(e, fav.id)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors border border-border ${draggedItem === fav.id ? 'opacity-50' : ''}`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                          <button
                            onClick={() => handleFavoriteClick(fav.spot)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="font-medium text-foreground">{fav.spot.name}</p>
                            <p className="text-xs text-muted-foreground mb-2">{fav.spot.location}</p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <Ruler className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{size}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Waves className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground capitalize">{shape}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: RATING_CONFIG[rating].color }}
                                />
                                <span className="text-xs text-muted-foreground capitalize">{rating}</span>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => removeFavorite(e, fav.id)}
                            className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove from favorites"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Spot Details Panel (desktop only) */}
        {selectedSpot && (
          <div className="absolute right-4 top-20 bottom-4 w-96 max-w-[calc(100vw-2rem)] overflow-hidden flex flex-col">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {accessedFromFavorites && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleBackToFavorites}
                        className="h-8 w-8 -ml-1"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <div>
                      <CardTitle className="flex items-start gap-2 text-lg">
                        <Waves className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex flex-col">
                          <span>{selectedSpot.name} Report</span>
                          <span className="text-base font-medium text-muted-foreground">{currentDate}</span>
                        </div>
                      </CardTitle>
                      <CardDescription className="ml-7">{selectedSpot.location}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isTempSpot && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={toggleFavorite}
                        title={isSpotFavorited ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className={`h-4 w-4 ${isSpotFavorited ? 'fill-primary text-primary' : ''}`} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedSpot(null); setAccessedFromFavorites(false); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Data Source Blurb */}
                <div className="bg-muted/50 rounded-lg p-3 mt-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Ratings are based on user session data. Log a session to contribute! Once enough sessions are logged at this location, we will default to AI analysis based on swell and wind data—our model is still being trained.
                  </p>
                </div>
                
                {/* Difficulty and Break Type Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSpot.difficulty && (
                    <Badge variant={selectedSpot.difficulty === 'Expert' ? 'destructive' : selectedSpot.difficulty === 'Advanced' ? 'default' : 'secondary'}>
                      {selectedSpot.difficulty}
                    </Badge>
                  )}
                  {selectedSpot.break_type && (
                    <Badge className={BREAK_TYPE_COLORS[selectedSpot.break_type] || 'bg-muted text-muted-foreground'}>
                      {selectedSpot.break_type}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {/* Time of Day Tabs */}
                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                  {TIME_OF_DAY_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedTimeOfDay(value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedTimeOfDay === value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Report Metrics */}
                {loadingConditions ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 text-center animate-pulse">
                        <div className="h-5 w-5 mx-auto bg-muted rounded mb-1" />
                        <div className="h-5 w-12 mx-auto bg-muted rounded mb-1" />
                        <div className="h-3 w-8 mx-auto bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Consensus Metrics Section */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">User Consensus</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                          <p className="text-base font-bold text-foreground">{currentSize}</p>
                          <p className="text-xs text-muted-foreground">Size</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                          <p className="text-base font-bold text-foreground capitalize">{currentShape}</p>
                          <p className="text-xs text-muted-foreground">Shape</p>
                        </div>
                        <div className="rounded-lg py-2 px-3 text-center" style={{ backgroundColor: `${RATING_CONFIG[currentRating].color}20` }}>
                          <p className="text-base font-bold capitalize" style={{ color: RATING_CONFIG[currentRating].color }}>{currentRating}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                      </div>
                    </div>

                    {/* Live Spot Data Section */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Live Spot Data</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                          <p className="text-sm font-bold text-foreground">{currentSwell}</p>
                          <p className="text-xs text-muted-foreground">Swell</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                          <p className="text-sm font-bold text-foreground">{currentWind}</p>
                          <p className="text-xs text-muted-foreground">Wind</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                          <p className="text-sm font-bold text-foreground">{currentTide}</p>
                          <p className="text-xs text-muted-foreground">Tide</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Tabs */}
                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                  {CONTENT_TABS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedContentTab(value)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                        selectedContentTab === value
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {selectedContentTab === 'local-reports' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" /> Daily Discussion
                    </h4>

                    {/* Warning for temp spots */}
                    {isTempSpot && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-600 dark:text-amber-400">
                        This spot is not yet in our database. Reports will be available once it's added.
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Share conditions..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                        className="text-sm"
                        disabled={isTempSpot}
                      />
                      <Button size="icon" onClick={handleComment} disabled={isTempSpot}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No reports yet today. Be the first!</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="space-y-2">
                          <div className="bg-muted/30 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Link to={`/profile/${comment.user_id}`}>
                                <Avatar className="h-7 w-7 hover:ring-2 hover:ring-primary transition-all">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {(comment.profile?.display_name || 'S')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link to={`/profile/${comment.user_id}`} className="hover:underline">
                                    <span className="font-medium text-sm text-foreground">{comment.profile?.display_name || 'Surfer'}</span>
                                  </Link>
                                  {(comment.profile?.total_shakas_received || 0) > 0 && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <img src={shakaIcon} alt="" className="h-3 w-3" />
                                      {comment.profile?.total_shakas_received}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">{formatCommentTime(comment.created_at)}</span>
                                </div>
                                <p className="text-sm text-foreground mt-1">{comment.content}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <button 
                                    onClick={() => handleLikeComment(comment.id, comment.user_id, comment.is_liked)} 
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      user?.id === comment.user_id 
                                        ? 'opacity-30 cursor-not-allowed' 
                                        : comment.is_liked ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                                    }`}
                                    disabled={user?.id === comment.user_id}
                                  >
                                    <img src={shakaIcon} alt="Shaka" className={`h-6 w-6 object-contain ${comment.is_liked ? 'scale-110' : ''} transition-transform`} />
                                    {comment.likes_count > 0 && comment.likes_count}
                                  </button>
                                  <button 
                                    onClick={() => handleKookComment(comment.id, comment.user_id, comment.is_kooked)} 
                                    className={`flex items-center gap-1 text-xs transition-colors ${
                                      user?.id === comment.user_id 
                                        ? 'opacity-30 cursor-not-allowed' 
                                        : comment.is_kooked ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                                    }`}
                                    disabled={user?.id === comment.user_id}
                                  >
                                    <img src={kookIcon} alt="Kook" className={`h-9 w-9 object-contain ${comment.is_kooked ? 'scale-110' : ''} transition-transform`} />
                                    {comment.kooks_count > 0 && comment.kooks_count}
                                  </button>
                                  <button onClick={() => setReplyingTo(comment.id)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    <Reply className="h-3 w-3" /> Reply
                                  </button>
                                  {(user?.id === comment.user_id || isAdmin) && (
                                    <button 
                                      onClick={() => handleDeleteComment(comment.id, comment.user_id)} 
                                      className="text-xs text-destructive/60 hover:text-destructive flex items-center gap-1"
                                    >
                                      <Trash2 className="h-3 w-3" /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="flex gap-2 mt-3 ml-9">
                                <Input
                                  placeholder="Write a reply..."
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleReply(comment.id)}
                                  className="text-sm"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleReply(comment.id)}>Reply</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyContent(''); }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-6 space-y-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="bg-muted/20 rounded-lg p-3">
                                  <div className="flex items-start gap-2">
                                    <Link to={`/profile/${reply.user_id}`}>
                                      <Avatar className="h-6 w-6 hover:ring-2 hover:ring-primary transition-all">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                          {(reply.profile?.display_name || 'S')[0].toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Link to={`/profile/${reply.user_id}`} className="hover:underline">
                                          <span className="font-medium text-sm text-foreground">{reply.profile?.display_name || 'Surfer'}</span>
                                        </Link>
                                        {(reply.profile?.total_shakas_received || 0) > 0 && (
                                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                            <img src={shakaIcon} alt="" className="h-3 w-3" />
                                            {reply.profile?.total_shakas_received}
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground">{formatCommentTime(reply.created_at)}</span>
                                      </div>
                                      <p className="text-sm text-foreground mt-1">{reply.content}</p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <button 
                                          onClick={() => handleLikeComment(reply.id, reply.user_id, reply.is_liked)} 
                                          className={`flex items-center gap-1 text-xs transition-colors ${
                                            user?.id === reply.user_id 
                                              ? 'opacity-30 cursor-not-allowed' 
                                              : reply.is_liked ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                                          }`}
                                          disabled={user?.id === reply.user_id}
                                        >
                                          <img src={shakaIcon} alt="Shaka" className={`h-6 w-6 object-contain ${reply.is_liked ? 'scale-110' : ''} transition-transform`} />
                                          {reply.likes_count > 0 && reply.likes_count}
                                        </button>
                                        <button 
                                          onClick={() => handleKookComment(reply.id, reply.user_id, reply.is_kooked)} 
                                          className={`flex items-center gap-1 text-xs transition-colors ${
                                            user?.id === reply.user_id 
                                              ? 'opacity-30 cursor-not-allowed' 
                                              : reply.is_kooked ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                                          }`}
                                          disabled={user?.id === reply.user_id}
                                        >
                                          <img src={kookIcon} alt="Kook" className={`h-9 w-9 object-contain ${reply.is_kooked ? 'scale-110' : ''} transition-transform`} />
                                          {reply.kooks_count > 0 && reply.kooks_count}
                                        </button>
                                        {(user?.id === reply.user_id || isAdmin) && (
                                          <button 
                                            onClick={() => handleDeleteComment(reply.id, reply.user_id)} 
                                            className="text-xs text-destructive/60 hover:text-destructive flex items-center gap-1"
                                          >
                                            <Trash2 className="h-3 w-3" /> Delete
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {selectedContentTab === 'spot-guide' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Spot Guide
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-6 text-center">
                      <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Spot guide information will be filled out at a later point. Check back soon for details on wave type, best conditions, hazards, and local tips.
                      </p>
                    </div>
                  </div>
                )}

                {selectedContentTab === 'photos' && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Camera className="h-4 w-4" /> Recent Photos
                    </h4>
                    
                    {loadingPhotos ? (
                      <div className="flex justify-center py-8">
                        <Waves className="h-6 w-6 animate-pulse text-primary" />
                      </div>
                    ) : spotPhotos.length === 0 ? (
                      <div className="bg-muted/30 rounded-lg p-6 text-center">
                        <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No photos yet. Log a session with photos at this spot to contribute!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {spotPhotos.map((photo, index) => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhotoIndex(index)}
                            className="aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                          >
                            <img
                              src={photo.url}
                              alt="Spot photo"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Photo Lightbox */}
        <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none [&>button.rounded-sm]:hidden">
            <button
              onClick={() => setSelectedPhotoIndex(null)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {spotPhotos.length > 1 && selectedPhotoIndex !== null && (
              <>
                <button
                  onClick={() => setSelectedPhotoIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : spotPhotos.length - 1) : 0)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setSelectedPhotoIndex(prev => prev !== null ? (prev < spotPhotos.length - 1 ? prev + 1 : 0) : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {selectedPhotoIndex !== null && spotPhotos[selectedPhotoIndex] && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
                <img
                  src={spotPhotos[selectedPhotoIndex].url}
                  alt="Spot photo"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
                <div className="mt-4 text-center text-white">
                  <button
                    onClick={() => {
                      setSelectedPhotoIndex(null);
                      if (spotPhotos[selectedPhotoIndex!].user_id === user?.id) {
                        navigate('/sessions');
                      } else {
                        navigate(`/profile/${spotPhotos[selectedPhotoIndex!].user_id}`);
                      }
                    }}
                    className="flex items-center gap-2 justify-center hover:text-primary transition-colors cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={spotPhotos[selectedPhotoIndex].profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(spotPhotos[selectedPhotoIndex].profile?.display_name || 'S')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{spotPhotos[selectedPhotoIndex].profile?.display_name || 'Surfer'}</span>
                  </button>
                  <p className="text-sm text-white/70 mt-1">
                    {format(new Date(spotPhotos[selectedPhotoIndex].session_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-white/50 mt-2">
                    {selectedPhotoIndex + 1} / {spotPhotos.length}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile layout - map with bottom controls and fullscreen panels */}
      <div className="md:hidden flex flex-col h-full overflow-hidden relative">
        {/* Map container - always rendered, use visibility instead of hidden to preserve dimensions */}
        <div 
          ref={mapContainerMobile} 
          className={`absolute inset-0 ${selectedSpot ? 'invisible' : 'visible'}`}
        >
          {/* Custom marker styles for mobile */}
          <style>{`
            .spot-marker { cursor: pointer; }
            .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
          `}</style>
        </div>

        {/* Bottom Search Bar - Mobile (only when no spot selected) */}
        {!selectedSpot && (
          <>
            {/* Bottom Search Bar - Mobile */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border">
              <div className="relative" ref={searchContainerRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search spots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  className="pl-10 pr-12"
                />
                <Button
                  variant={showFavorites ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => {
                    if (!showFavorites) setSelectedSpot(null);
                    setShowFavorites(!showFavorites);
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  title="Favorites"
                >
                  <Star className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`} />
                </Button>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto z-50">
                    {searchResults.map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => handleSelectSearchResult(spot)}
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b border-border last:border-b-0"
                      >
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-foreground">{spot.name}</p>
                          <p className="text-xs text-muted-foreground">{spot.location}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Favorites Panel - Mobile Overlay */}
            {showFavorites && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-20 overflow-y-auto p-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="h-5 w-5 text-primary fill-primary" />
                        Favorite Spots
                      </CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setShowFavorites(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingFavorites ? (
                      <div className="flex justify-center py-8">
                        <Waves className="h-6 w-6 animate-pulse text-primary" />
                      </div>
                    ) : favoriteSpots.length === 0 ? (
                      <div className="text-center py-8">
                        <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No favorite spots yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Click the star on a spot to add it to your favorites.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {favoriteSpots.map((fav) => {
                          const conditions = favoriteConditions[fav.spot_id];
                          const currentTimeWindow = getCurrentTimeWindow();
                          const getTimeWindowOrder = (): TimeOfDay[] => {
                            if (currentTimeWindow === 'afternoon') return ['afternoon', 'midday', 'morning'];
                            if (currentTimeWindow === 'midday') return ['midday', 'morning'];
                            return ['morning'];
                          };
                          const findBestValue = <T,>(getter: (tw: TimeOfDay) => T | undefined, fallback: T, isValid: (val: T | undefined) => boolean): T => {
                            for (const tw of getTimeWindowOrder()) {
                              const val = getter(tw);
                              if (isValid(val)) return val!;
                            }
                            return fallback;
                          };
                          const rating = findBestValue((tw) => conditions?.rating[tw], 'unknown' as SpotRating, (val) => val !== undefined && val !== 'unknown');
                          const size = findBestValue((tw) => conditions?.size[tw], '—', (val) => val !== undefined && val !== '—');
                          const shape = findBestValue((tw) => conditions?.shape[tw], '—', (val) => val !== undefined && val !== '—');
                          const displayRating = rating === 'unknown' ? 'N/A' : rating;
                          
                          return (
                            <div
                              key={fav.id}
                              draggable
                              onDragStart={() => handleDragStart(fav.id)}
                              onDragOver={(e) => handleDragOver(e, fav.id)}
                              onDragEnd={handleDragEnd}
                              onTouchStart={() => handleDragStart(fav.id)}
                              onTouchEnd={handleDragEnd}
                              className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors border border-border ${draggedItem === fav.id ? 'opacity-50' : ''}`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                              <button
                                onClick={() => handleFavoriteClick(fav.spot)}
                                className="flex-1 text-left min-w-0"
                              >
                                <p className="font-medium text-foreground">{fav.spot.name}</p>
                                <p className="text-xs text-muted-foreground mb-2">{fav.spot.location}</p>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <Ruler className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{size}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Waves className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground capitalize">{shape}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RATING_CONFIG[rating].color }} />
                                    <span className="text-xs text-muted-foreground capitalize">{displayRating}</span>
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={(e) => removeFavorite(e, fav.id)}
                                className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove from favorites"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Spot Details Panel - Mobile Fullscreen */}
        {selectedSpot && (
          <div className="flex-1 overflow-y-auto bg-background p-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {accessedFromFavorites && (
                        <Button variant="ghost" size="icon" onClick={handleBackToFavorites} className="h-8 w-8 -ml-1">
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Waves className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>{selectedSpot.name}</span>
                        </CardTitle>
                        <CardDescription>{selectedSpot.location}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isTempSpot && (
                        <Button variant="ghost" size="icon" onClick={toggleFavorite} title={isSpotFavorited ? 'Remove from favorites' : 'Add to favorites'}>
                          <Star className={`h-4 w-4 ${isSpotFavorited ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedSpot(null); setAccessedFromFavorites(false); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3 mt-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Ratings are based on user session data. Log a session to contribute!
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSpot.difficulty && (
                      <Badge variant={selectedSpot.difficulty === 'Expert' ? 'destructive' : selectedSpot.difficulty === 'Advanced' ? 'default' : 'secondary'}>
                        {selectedSpot.difficulty}
                      </Badge>
                    )}
                    {selectedSpot.break_type && (
                      <Badge className={BREAK_TYPE_COLORS[selectedSpot.break_type] || 'bg-muted text-muted-foreground'}>
                        {selectedSpot.break_type}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                {/* Time of Day Tabs */}
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                    {TIME_OF_DAY_OPTIONS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedTimeOfDay(value)}
                        className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-md text-[10px] font-medium transition-colors ${
                          selectedTimeOfDay === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Report Metrics */}
                  {loadingConditions ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-muted/50 rounded-lg p-3 text-center animate-pulse">
                          <div className="h-5 w-12 mx-auto bg-muted rounded mb-1" />
                          <div className="h-3 w-8 mx-auto bg-muted rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
<div className="space-y-3">
                      {/* User Consensus Section */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">User Consensus</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                            <p className="text-base font-bold text-foreground">{currentSize}</p>
                            <p className="text-xs text-muted-foreground">Size</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                            <p className="text-base font-bold text-foreground capitalize">{currentShape}</p>
                            <p className="text-xs text-muted-foreground">Shape</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg py-2 px-3 text-center flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: RATING_CONFIG[currentRating].color }} />
                              <p className="text-base font-bold text-foreground capitalize">{currentRating === 'unknown' ? 'N/A' : currentRating}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                        </div>
                      </div>

{/* Live Spot Data Section */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Live Spot Data</p>
                        <div className="flex gap-2">
                          <div className="bg-muted/50 rounded-lg py-2 px-2 text-center flex-[1.4]">
                            <p className="text-xs font-bold text-foreground whitespace-nowrap">{currentSwell}</p>
                            <p className="text-xs text-muted-foreground">Swell</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg py-2 px-2 text-center flex-1">
                            <p className="text-xs font-bold text-foreground whitespace-nowrap">{currentWind}</p>
                            <p className="text-xs text-muted-foreground">Wind</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg py-2 px-2 text-center flex-[0.8]">
                            <p className="text-xs font-bold text-foreground whitespace-nowrap">{currentTide}</p>
                            <p className="text-xs text-muted-foreground">Tide</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content Tabs */}
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                    {CONTENT_TABS.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedContentTab(value)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                          selectedContentTab === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Local Reports Tab Content */}
                  {selectedContentTab === 'local-reports' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Share conditions..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                          className="flex-1 text-sm"
                          disabled={isTempSpot}
                        />
                        <Button size="icon" onClick={handleComment} disabled={isTempSpot || !newComment.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {comments.length === 0 ? (
                          <p className="text-center text-muted-foreground text-sm py-4">No reports yet. Be the first to share!</p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {(comment.profile?.display_name || 'S')[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm text-foreground">{comment.profile?.display_name || 'Surfer'}</span>
                                    <span className="text-xs text-muted-foreground">{formatCommentTime(comment.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-foreground mt-1">{comment.content}</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <button 
                                      onClick={() => handleLikeComment(comment.id, comment.user_id, comment.is_liked)} 
                                      className={`flex items-center gap-1 text-xs transition-colors ${user?.id === comment.user_id ? 'opacity-30 cursor-not-allowed' : comment.is_liked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                      disabled={user?.id === comment.user_id}
                                    >
                                      <img src={shakaIcon} alt="Shaka" className={`h-5 w-5 object-contain ${comment.is_liked ? 'scale-110' : ''} transition-transform`} />
                                      {comment.likes_count > 0 && comment.likes_count}
                                    </button>
                                    <button 
                                      onClick={() => handleKookComment(comment.id, comment.user_id, comment.is_kooked)} 
                                      className={`flex items-center gap-1 text-xs transition-colors ${user?.id === comment.user_id ? 'opacity-30 cursor-not-allowed' : comment.is_kooked ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                      disabled={user?.id === comment.user_id}
                                    >
                                      <img src={kookIcon} alt="Kook" className={`h-7 w-7 object-contain ${comment.is_kooked ? 'scale-110' : ''} transition-transform`} />
                                      {comment.kooks_count > 0 && comment.kooks_count}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Spot Guide Tab Content */}
                  {selectedContentTab === 'spot-guide' && (
                    <div className="space-y-4">
                      {selectedSpot.description ? (
                        <p className="text-sm text-muted-foreground">{selectedSpot.description}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No spot guide available yet.</p>
                      )}
                    </div>
                  )}

                  {/* Photos Tab Content */}
                  {selectedContentTab === 'photos' && (
                    <div className="space-y-4">
                      {loadingPhotos ? (
                        <div className="flex justify-center py-8">
                          <Waves className="h-6 w-6 animate-pulse text-primary" />
                        </div>
                      ) : spotPhotos.length === 0 ? (
                        <div className="text-center py-8">
                          <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No photos yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Photos from sessions at this spot will appear here.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {spotPhotos.map((photo, index) => (
                            <button
                              key={photo.id}
                              onClick={() => setSelectedPhotoIndex(index)}
                              className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                            >
                              <img src={photo.url} alt="Spot photo" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        )}

        {/* Photo Lightbox for Mobile */}
        <Dialog open={selectedPhotoIndex !== null} onOpenChange={() => setSelectedPhotoIndex(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none [&>button.rounded-sm]:hidden">
            <button onClick={() => setSelectedPhotoIndex(null)} className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
            {spotPhotos.length > 1 && selectedPhotoIndex !== null && (
              <>
                <button onClick={() => setSelectedPhotoIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : spotPhotos.length - 1) : 0)} className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => setSelectedPhotoIndex(prev => prev !== null ? (prev < spotPhotos.length - 1 ? prev + 1 : 0) : 0)} className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            {selectedPhotoIndex !== null && spotPhotos[selectedPhotoIndex] && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
                <img src={spotPhotos[selectedPhotoIndex].url} alt="Spot photo" className="max-h-[60vh] max-w-full object-contain rounded-lg" />
                <div className="mt-4 text-center text-white">
                  <button
                    onClick={() => {
                      setSelectedPhotoIndex(null);
                      if (spotPhotos[selectedPhotoIndex!].user_id === user?.id) {
                        navigate('/sessions');
                      } else {
                        navigate(`/profile/${spotPhotos[selectedPhotoIndex!].user_id}`);
                      }
                    }}
                    className="flex items-center gap-2 justify-center hover:text-primary transition-colors cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={spotPhotos[selectedPhotoIndex].profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(spotPhotos[selectedPhotoIndex].profile?.display_name || 'S')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{spotPhotos[selectedPhotoIndex].profile?.display_name || 'Surfer'}</span>
                  </button>
                  <p className="text-sm text-white/70 mt-1">{format(new Date(spotPhotos[selectedPhotoIndex].session_date), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-white/50 mt-2">{selectedPhotoIndex + 1} / {spotPhotos.length}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SpotReports;