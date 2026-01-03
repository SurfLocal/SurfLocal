import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Waves, Cloud, Wind, Send, MessageCircle, Reply, X, AlertCircle, Sunrise, Sun, Sunset, Search, MapPin, Camera, BookOpen, ChevronLeft, ChevronRight, Trash2, Star, ArrowLeft, GripVertical, Droplets, Ruler } from 'lucide-react';
import { format, startOfDay, parseISO, getHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import shakaIcon from '@/assets/shaka.png';
import kookIcon from '@/assets/kook.png';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoicm9icm9uYXluZSIsImEiOiJjbWpwYWI0dWYyODJmM2RweTN1MjBjN3pqIn0.72-EvJIHzZaucikkpia5rg';

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
  // Morning: 5am-10am, Midday: 10am-2pm, Afternoon: 2pm-7pm
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 19) return 'afternoon';
  // Outside surf hours, show most recent relevant window
  if (hour < 5) return 'afternoon'; // Late night, show yesterday's afternoon
  return 'afternoon'; // After 7pm, show afternoon
};

// Determine time window for a session based on session_date (hour) in local time
const getSessionTimeWindow = (sessionDate: string): TimeOfDay | null => {
  const date = parseISO(sessionDate);
  const hour = date.getHours(); // Uses local timezone
  // Morning: 5am-10am, Midday: 10am-2pm, Afternoon: 2pm-7pm
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 19) return 'afternoon';
  return null; // Outside defined time windows
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

  // Check admin status - TODO: Add admin check endpoint
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      // TODO: Implement admin check via API
      setIsAdmin(false);
    };
    checkAdmin();
  }, [user]);

  // Fetch favorite spots
  const fetchFavorites = async () => {
    if (!user) return;
    setLoadingFavorites(true);
    try {
      const favorites = await api.spots.getFavorites(user.id);
      if (favorites) {
        setFavoriteSpots(favorites.map((f: any) => ({
          id: f.id,
          spot_id: f.id,
          display_order: f.display_order || 0,
          spot: {
            id: f.id,
            name: f.name,
            location: f.location || '',
            latitude: f.latitude,
            longitude: f.longitude,
            description: f.description || null,
            difficulty: f.difficulty || null,
            break_type: f.break_type || null,
          } as Spot,
        })));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  useEffect(() => {
    if (user && spots.length > 0) {
      fetchFavorites();
    }
  }, [user, spots]);

  // Fetch conditions for all favorite spots (today's consensus)
  useEffect(() => {
    const fetchFavoriteConditions = async () => {
      if (favoriteSpots.length === 0) return;
      
      const conditionsMap: Record<string, SpotConditions> = {};
      
      // Convert rating string to SpotRating type
      const ratingToSpotRating = (rating: string | null): SpotRating => {
        if (!rating) return 'unknown';
        const normalized = rating.toLowerCase();
        if (normalized === 'dog shit') return 'dog shit';
        if (normalized === 'poor') return 'poor';
        if (normalized === 'decent') return 'decent';
        if (normalized === 'fun') return 'fun';
        if (normalized === 'epic') return 'epic';
        return 'unknown';
      };
      
      await Promise.all(
        favoriteSpots.map(async (fav) => {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/spots/${fav.spot_id}/report`);
            if (response.ok) {
              const data = await response.json();
              const consensus = data.consensus;
              
              conditionsMap[fav.spot_id] = {
                rating: {
                  morning: ratingToSpotRating(consensus.morning?.rating),
                  midday: ratingToSpotRating(consensus.midday?.rating),
                  afternoon: ratingToSpotRating(consensus.afternoon?.rating),
                },
                size: {
                  morning: consensus.morning?.wave_height || '—',
                  midday: consensus.midday?.wave_height || '—',
                  afternoon: consensus.afternoon?.wave_height || '—',
                },
                shape: {
                  morning: consensus.morning?.shape || '—',
                  midday: consensus.midday?.shape || '—',
                  afternoon: consensus.afternoon?.shape || '—',
                },
                swell: { morning: '—', midday: '—', afternoon: '—' },
                wind: { morning: '—', midday: '—', afternoon: '—' },
                tide: { morning: '—', midday: '—', afternoon: '—' },
              };
            }
          } catch (error) {
            console.error(`Error fetching conditions for spot ${fav.spot_id}:`, error);
          }
        })
      );
      
      setFavoriteConditions(conditionsMap);
    };
    
    fetchFavoriteConditions();
  }, [favoriteSpots]);

  // Toggle favorite for current spot
  const toggleFavorite = async () => {
    if (!user || !selectedSpot || selectedSpot.id.startsWith('temp-')) return;
    try {
      const isFav = favoriteSpots.some(f => f.spot_id === selectedSpot.id);
      if (isFav) {
        await api.spots.removeFavorite(user.id, selectedSpot.id);
        setFavoriteSpots(prev => prev.filter(f => f.spot_id !== selectedSpot.id));
        toast({ title: 'Removed from favorites' });
      } else {
        await api.spots.addFavorite(user.id, selectedSpot.id);
        await fetchFavorites(); // Refresh to get updated list
        toast({ title: 'Added to favorites' });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: 'Failed to update favorites', variant: 'destructive' });
    }
  };

  // Remove favorite by ID
  const removeFavorite = async (e: React.MouseEvent, favoriteId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const favorite = favoriteSpots.find(f => f.id === favoriteId);
      if (favorite) {
        await api.spots.removeFavorite(user.id, favorite.spot_id);
        setFavoriteSpots(prev => prev.filter(f => f.id !== favoriteId));
        toast({ title: 'Removed from favorites' });
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({ title: 'Failed to remove favorite', variant: 'destructive' });
    }
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
    // TODO: Update display_order via API
  };

// Padding for desktop flyTo to offset for the report panel on the right
  // This uses Mapbox's built-in padding feature to properly center the spot in the visible area
  const DESKTOP_MAP_PADDING = { top: 0, bottom: 0, left: 0, right: 420 };

// Handle clicking on a favorite spot
  const handleFavoriteClick = (spot: Spot) => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    setAccessedFromFavorites(true); // Track for both mobile and desktop back navigation
    setShowFavorites(false); // Close favorites panel when clicking a spot
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
    // Don't disable crosshairs - keep them visible
    setSelectedSpot(null);
    setAccessedFromFavorites(false);
    setShowFavorites(true);
  };

  // Check if current spot is favorited
  const isSpotFavorited = selectedSpot ? favoriteSpots.some(f => f.spot_id === selectedSpot.id) : false;

  // Fetch spots from database
  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const dbSpots = await api.spots.getAll();
        if (dbSpots && dbSpots.length > 0) {
          setSpots(dbSpots as Spot[]);
        }
      } catch (error) {
        console.error('Error fetching spots:', error);
      }
    };
    fetchSpots();
  }, []);


  // Live spot data state (swell, wind, tide - separate from consensus)
  const [liveData, setLiveData] = useState<{
    swell: string | null;
    swellDirection: string | null;
    wind: string | null;
    windDirection: string | null;
    windDirectionDegrees: number | null;
    tide: string | null;
  } | null>(null);
  const [loadingLiveData, setLoadingLiveData] = useState(false);

  // Fetch live spot data from surf_analytics
  useEffect(() => {
    const fetchLiveData = async () => {
      if (!selectedSpot || selectedSpot.id.startsWith('temp-')) {
        setLiveData(null);
        return;
      }
      
      setLoadingLiveData(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/spots/${selectedSpot.id}/live`);
        if (response.ok) {
          const data = await response.json();
          setLiveData({
            swell: data.swell?.formatted || null,
            swellDirection: data.swell?.direction || null,
            wind: data.wind?.formatted || null,
            windDirection: data.wind?.direction || null,
            windDirectionDegrees: data.wind?.direction_degrees || null,
            tide: data.tide?.formatted || null,
          });
        }
      } catch (error) {
        console.error('Error fetching live data:', error);
        setLiveData(null);
      } finally {
        setLoadingLiveData(false);
      }
    };
    
    fetchLiveData();
    // Refresh live data every 5 minutes
    const interval = setInterval(fetchLiveData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedSpot]);

  // Fetch spot conditions (user consensus) from session data
  useEffect(() => {
    const fetchSpotConditions = async () => {
      if (!selectedSpot) {
        setSpotConditions(null);
        setLoadingConditions(false);
        return;
      }

      setLoadingConditions(true);
      
      try {
        // Fetch spot report with time-windowed consensus from API (today's sessions only)
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/spots/${selectedSpot.id}/report`);
        if (response.ok) {
          const data = await response.json();
          const consensus = data.consensus;
          
          // Convert rating string to SpotRating type (most frequent rating from sessions)
          const ratingToSpotRating = (rating: string | null): SpotRating => {
            if (!rating) return 'unknown';
            const normalized = rating.toLowerCase();
            if (normalized === 'dog shit') return 'dog shit';
            if (normalized === 'poor') return 'poor';
            if (normalized === 'decent') return 'decent';
            if (normalized === 'fun') return 'fun';
            if (normalized === 'epic') return 'epic';
            return 'unknown';
          };
          
          setSpotConditions({
            rating: {
              morning: ratingToSpotRating(consensus.morning?.rating),
              midday: ratingToSpotRating(consensus.midday?.rating),
              afternoon: ratingToSpotRating(consensus.afternoon?.rating),
            },
            size: {
              morning: consensus.morning?.wave_height || '—',
              midday: consensus.midday?.wave_height || '—',
              afternoon: consensus.afternoon?.wave_height || '—',
            },
            shape: {
              morning: consensus.morning?.shape || '—',
              midday: consensus.midday?.shape || '—',
              afternoon: consensus.afternoon?.shape || '—',
            },
            // Live data is now separate - these are just placeholders
            swell: { morning: '—', midday: '—', afternoon: '—' },
            wind: { morning: '—', midday: '—', afternoon: '—' },
            tide: { morning: '—', midday: '—', afternoon: '—' },
          });
          
          // Set time of day to the last time period with consensus data
          if (data.latest_consensus_time) {
            setSelectedTimeOfDay(data.latest_consensus_time as TimeOfDay);
          } else {
            setSelectedTimeOfDay(getCurrentTimeWindow());
          }
        } else {
          // Fallback to empty conditions
          setSpotConditions({
            rating: { morning: 'unknown', midday: 'unknown', afternoon: 'unknown' },
            size: { morning: '—', midday: '—', afternoon: '—' },
            shape: { morning: '—', midday: '—', afternoon: '—' },
            swell: { morning: '—', midday: '—', afternoon: '—' },
            wind: { morning: '—', midday: '—', afternoon: '—' },
            tide: { morning: '—', midday: '—', afternoon: '—' },
          });
        }
      } catch (error) {
        console.error('Error fetching spot conditions:', error);
        setSpotConditions({
          rating: { morning: 'unknown', midday: 'unknown', afternoon: 'unknown' },
          size: { morning: '—', midday: '—', afternoon: '—' },
          shape: { morning: '—', midday: '—', afternoon: '—' },
          swell: { morning: '—', midday: '—', afternoon: '—' },
          wind: { morning: '—', midday: '—', afternoon: '—' },
          tide: { morning: '—', midday: '—', afternoon: '—' },
        });
      } finally {
        setLoadingConditions(false);
      }
    };

    fetchSpotConditions();
  }, [selectedSpot]);

  // Spot ratings state for map markers - use most recent rating instead of current time window
  const [spotRatings, setSpotRatings] = useState<Record<string, SpotRating>>({});

  // Fetch all spot ratings based on TODAY's sessions within time windows only
  const fetchAllSpotRatings = async () => {
    try {
      // Fetch recent public sessions to get ratings for each spot
      const sessions = await api.sessions.getPublic(200, 0);
      
      // Filter to only TODAY's sessions that are within valid time windows
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Time windows: morning 5am-10am, midday 10am-2pm, afternoon 2pm-7pm
      const isInTimeWindow = (hour: number) => {
        return (hour >= 5 && hour < 10) ||   // morning
               (hour >= 10 && hour < 14) ||  // midday
               (hour >= 14 && hour < 19);    // afternoon
      };
      
      const todaysSessions = sessions.filter((session: any) => {
        const sessionDate = new Date(session.session_date);
        const sessionDay = new Date(sessionDate);
        sessionDay.setHours(0, 0, 0, 0);
        
        // Must be today AND within a valid time window
        const hour = sessionDate.getHours();
        return sessionDay.getTime() === today.getTime() && isInTimeWindow(hour);
      });
      
      // Group sessions by location and get the most frequent rating for each
      const ratingsMap: Record<string, SpotRating[]> = {};
      
      todaysSessions.forEach((session: any) => {
        const location = session.location;
        const rating = session.rating?.toLowerCase();
        if (rating) {
          if (!ratingsMap[location]) ratingsMap[location] = [];
          ratingsMap[location].push(rating as SpotRating);
        }
      });
      
      // Get the most frequent rating for each location
      const simpleRatings: Record<string, SpotRating> = {};
      Object.keys(ratingsMap).forEach(location => {
        const ratings = ratingsMap[location];
        if (ratings.length === 0) return;
        
        // Count occurrences of each rating
        const counts: Record<string, number> = {};
        ratings.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
        
        // Get the most frequent
        const mostFrequent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        simpleRatings[location] = mostFrequent as SpotRating;
      });
      
      setSpotRatings(simpleRatings);
    } catch (error) {
      console.error('Error fetching spot ratings:', error);
      setSpotRatings({});
    }
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

  // Format timestamp in user's local timezone
  const formatCommentTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
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
  
  // Use effect that runs when user/loading changes to initialize the map
  // This ensures map initializes after auth is complete and container is rendered
  useEffect(() => {
    // Don't initialize if still loading or no user
    if (loading || !user) return;
    
    // Wait for container to be available
    if (!mapContainerDesktop.current) return;
    
    // If map already exists and is valid, skip initialization
    if (map.current) return;

    // Clear container before initializing to prevent "container should be empty" error
    mapContainerDesktop.current.innerHTML = '';
    
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    try {
      const newMap = new mapboxgl.Map({
        container: mapContainerDesktop.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [-117.2, 33.2],
        zoom: 7.5,
      });
      
      map.current = newMap;
      
      newMap.on('load', () => {
        setMapReady(true);
      });
      
      newMap.on('error', (e) => {
        console.error('Mapbox error:', e);
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
      map.current = null;
    }
  }, [loading, user]);

  // Initialize mobile map
  const [mobileMapReady, setMobileMapReady] = useState(false);
  
  useEffect(() => {
    // Don't initialize if still loading or no user
    if (loading || !user) return;
    
    if (!mapContainerMobile.current) return;
    
    // If map already exists, skip initialization
    if (mapMobile.current) return;

    // Clear container before initializing
    mapContainerMobile.current.innerHTML = '';
    
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
  }, [loading, user]);


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
  const addCrosshairsToMap = (mapInstance: mapboxgl.Map, spot: Spot, overlayRef: React.MutableRefObject<HTMLDivElement | null>) => {
    // Remove existing crosshairs
    if (overlayRef.current) {
      overlayRef.current.remove();
      overlayRef.current = null;
    }
    
    // Get directions from live data
    const swellDirection = liveData?.swellDirection || 'NW';
    const windDirection = liveData?.windDirection || 'E';
    
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
        addCrosshairsToMap(map.current, spotForCrosshairs, crosshairsDesktopRef);
      } else {
        removeCrosshairs(crosshairsDesktopRef);
      }
      
      // Mobile: show crosshairs even when panel is closed (using lastSelectedSpotRef)
      if (mapMobile.current && mobileMapReady) {
        addCrosshairsToMap(mapMobile.current, spotForCrosshairs, crosshairsMobileRef);
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
  }, [selectedSpot, showCrosshairs, mapReady, mobileMapReady, liveData]);
  
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

  const fetchComments = useCallback(async () => {
    if (!selectedSpot || !user) return;
    
    if (selectedSpot.id.startsWith('temp-')) {
      setComments([]);
      return;
    }
    
    try {
      const data = await api.forecast.getComments(selectedSpot.id, user.id);
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  }, [selectedSpot, user]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Fetch photos for the selected spot from public sessions
  useEffect(() => {
    const fetchSpotPhotos = async () => {
      if (!selectedSpot || selectedSpot.id.startsWith('temp-')) {
        setSpotPhotos([]);
        return;
      }

      setLoadingPhotos(true);
      try {
        const photos = await api.spots.getPhotos(selectedSpot.id);
        if (photos) {
          setSpotPhotos(photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            media_type: p.media_type,
            session_id: p.session_id,
            session_date: p.session_date,
            user_id: p.user_id,
            profile: {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            },
          })));
        }
      } catch (error) {
        console.error('Error fetching spot photos:', error);
        setSpotPhotos([]);
      }
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
    
    try {
      await api.forecast.addComment(selectedSpot.id, newComment);
      setNewComment('');
      fetchComments();
      toast({ title: 'Comment posted!' });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({ title: 'Failed to post comment', variant: 'destructive' });
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
    
    try {
      await api.forecast.addComment(selectedSpot.id, replyContent, parentId);
      setReplyContent('');
      setReplyingTo(null);
      fetchComments();
      toast({ title: 'Reply posted!' });
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
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
        await api.forecast.unlikeComment(commentId);
      } else {
        await api.forecast.likeComment(commentId);
      }
      fetchComments();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({ title: 'Failed to update shaka', variant: 'destructive' });
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
        await api.forecast.unkookComment(commentId);
      } else {
        await api.forecast.kookComment(commentId);
      }
      fetchComments();
    } catch (error) {
      console.error('Error toggling kook:', error);
      toast({ title: 'Failed to update kook', variant: 'destructive' });
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    // Allow deletion if user owns the comment OR is admin
    if (!user || (user.id !== commentUserId && !isAdmin)) return;
    
    try {
      await api.forecast.deleteComment(commentId);
      fetchComments();
      toast({ title: 'Comment deleted' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  // Consensus metrics from session data (changes with time tab)
  const currentRating = spotConditions?.rating[selectedTimeOfDay] || 'unknown';
  const currentSize = spotConditions?.size[selectedTimeOfDay] || '—';
  const currentShape = spotConditions?.shape[selectedTimeOfDay] || '—';
  // Live metrics from surf_analytics (static - doesn't change with time tab)
  const currentSwell = liveData?.swell || '— — —';
  const currentWind = liveData?.wind || '— kts —';
  const currentTide = liveData?.tide || '— ft';
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
                                <span className="text-xs text-muted-foreground">{size !== '—' ? `${size} ft` : size}</span>
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
                    <Button variant="ghost" size="icon" onClick={() => { 
                      setSelectedSpot(null); 
                      setAccessedFromFavorites(false);
                      // Don't disable crosshairs when closing report card
                    }}>
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
                  <div>
                    {/* Consensus Metrics Section */}
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">User Consensus</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/50 rounded-lg py-2 px-3 text-center">
                        <p className="text-base font-bold text-foreground">{currentSize !== '—' ? `${currentSize} ft` : currentSize}</p>
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
                )}

                {/* Live Spot Data Section */}
                {loadingLiveData ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 text-center animate-pulse">
                        <div className="h-5 w-12 mx-auto bg-muted rounded mb-1" />
                        <div className="h-3 w-8 mx-auto bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
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
                                    <span className="text-xs text-muted-foreground">{size !== '—' ? `${size} ft` : size}</span>
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
                      <Button variant="ghost" size="icon" onClick={() => { 
                        setSelectedSpot(null); 
                        setAccessedFromFavorites(false);
                        // Don't disable crosshairs when closing report card
                      }}>
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
                            <p className="text-base font-bold text-foreground">{currentSize !== '—' ? `${currentSize} ft` : currentSize}</p>
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