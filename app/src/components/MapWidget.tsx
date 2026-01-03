import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, MapPin, Bookmark, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface SessionLocation {
  latitude: number;
  longitude: number;
  location: string;
}

interface MapWidgetProps {
  onLocationSelect: (lat: number, lng: number) => void;
  mapboxToken: string;
  savedLocations?: SavedLocation[];
  onSavedLocationClick?: (location: SavedLocation) => void;
  sessionLocations?: SessionLocation[];
  userLocation?: { lat: number; lng: number } | null;
}

interface SearchResult {
  id: string;
  name: string;
  place_name: string;
  center: [number, number];
  isSaved?: boolean;
  savedLocation?: SavedLocation;
  relevance?: number;
}

const MapWidget: React.FC<MapWidgetProps> = ({ 
  onLocationSelect, 
  mapboxToken, 
  savedLocations = [], 
  onSavedLocationClick,
  sessionLocations = [],
  userLocation = null 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const savedMarkers = useRef<mapboxgl.Marker[]>([]);
  const historyMarkers = useRef<mapboxgl.Marker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const savedLocationsRef = useRef(savedLocations);

  const onLocationSelectRef = useRef(onLocationSelect);
  const onSavedLocationClickRef = useRef(onSavedLocationClick);
  
  // Keep refs updated
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  useEffect(() => {
    onSavedLocationClickRef.current = onSavedLocationClick;
  }, [onSavedLocationClick]);

  // Keep savedLocations ref in sync
  useEffect(() => {
    savedLocationsRef.current = savedLocations;
  }, [savedLocations]);

  // Track breakpoints for placeholder text
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      // Tablet is typically 768px - 1024px
      setIsTablet(width >= 768 && width < 1024);
      // Desktop is 1024px and above
      setIsDesktop(width >= 1024);
    };
    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [-117.261188, 32.7176094], // San Diego coast
      zoom: 10,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'bottom-left'
    );

    // Click handler for dropping pins
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      
      // Remove existing marker
      if (marker.current) {
        marker.current.remove();
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="marker-pin">
          <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#0891b2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        </div>
      `;

      marker.current = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Use the ref to call the callback
      onLocationSelectRef.current(lat, lng);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Add saved location markers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing saved markers
    savedMarkers.current.forEach(m => m.remove());
    savedMarkers.current = [];

    // Add new markers for saved locations
    savedLocations.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'saved-marker';
      el.innerHTML = `
        <div class="saved-marker-pin" title="${loc.name}">
          <svg width="28" height="36" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#8b5cf6"/>
            <circle cx="16" cy="14" r="5" fill="white"/>
            <path d="M16 11v6M13 14h6" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      `;

      const savedMarker = new mapboxgl.Marker(el)
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current!);

      // Click on saved marker to select it and open details
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Update main marker
        if (marker.current) {
          marker.current.remove();
        }
        const mainEl = document.createElement('div');
        mainEl.className = 'custom-marker';
        mainEl.innerHTML = `
          <div class="marker-pin">
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#0891b2"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>
          </div>
        `;
        marker.current = new mapboxgl.Marker(mainEl)
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);

        onLocationSelectRef.current(loc.latitude, loc.longitude);
        
        // Notify parent about saved location click
        if (onSavedLocationClickRef.current) {
          onSavedLocationClickRef.current(loc);
        }
      });

      savedMarkers.current.push(savedMarker);
    });
  }, [savedLocations]);

  // Toggle history markers
  useEffect(() => {
    if (!map.current) return;

    // Remove existing history markers
    historyMarkers.current.forEach(m => m.remove());
    historyMarkers.current = [];

    if (showHistory && sessionLocations.length > 0) {
      // Add green pins for session locations
      sessionLocations.forEach(loc => {
        const el = document.createElement('div');
        el.className = 'history-marker';
        el.innerHTML = `
          <div class="history-marker-pin" title="${loc.location}">
            <svg width="24" height="32" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#22c55e"/>
              <circle cx="16" cy="16" r="5" fill="white"/>
            </svg>
          </div>
        `;

        const historyMarker = new mapboxgl.Marker(el)
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map.current!);

        historyMarkers.current.push(historyMarker);
      });
    }
  }, [showHistory, sessionLocations]);

  // Calculate distance between two points (haversine)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Search with precedence: saved > nearby cities > states > countries
  const handleSearchInput = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    // Use the ref to get current saved locations
    const currentSavedLocations = savedLocationsRef.current;
    
    // Filter saved locations first (highest priority)
    const matchingSaved: SearchResult[] = currentSavedLocations
      .filter(loc => loc.name.toLowerCase().includes(query.toLowerCase()))
      .map(loc => ({
        id: `saved-${loc.id}`,
        name: loc.name,
        place_name: 'Saved Location',
        center: [loc.longitude, loc.latitude] as [number, number],
        isSaved: true,
        savedLocation: loc,
        relevance: 1000, // Highest priority
      }));

    try {
      // Get current map center for proximity-based ranking
      const mapCenter = map.current?.getCenter();
      const proximityParam = mapCenter 
        ? `&proximity=${mapCenter.lng},${mapCenter.lat}` 
        : userLocation 
          ? `&proximity=${userLocation.lng},${userLocation.lat}`
          : '';

      // Search Mapbox with proximity for better local results
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&types=place,region,country&limit=8${proximityParam}`
      );
      const data = await response.json();
      
      // Calculate relevance score based on proximity and type
      const typeBonus: Record<string, number> = { 'place': 50, 'region': 30, 'country': 10 };
      const referencePoint = mapCenter || (userLocation ? { lng: userLocation.lng, lat: userLocation.lat } : null);
      
      const mapboxResults: SearchResult[] = (data.features || []).map((f: any) => {
        const [lng, lat] = f.center;
        let relevanceScore = f.relevance * 100; // Mapbox relevance (0-1) * 100
        
        // Add type bonus
        const featureType = f.place_type?.[0] || 'country';
        relevanceScore += (typeBonus[featureType] || 0);
        
        // Add proximity bonus (closer = higher score)
        if (referencePoint) {
          const distance = getDistance(referencePoint.lat, referencePoint.lng, lat, lng);
          relevanceScore += Math.max(0, 100 - distance / 100); // Bonus decreases with distance
        }
        
        return {
          id: f.id,
          name: f.text,
          place_name: f.place_name,
          center: f.center as [number, number],
          isSaved: false,
          relevance: relevanceScore,
        };
      });

      // Sort by relevance (higher = better)
      mapboxResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      // Combine: saved locations first, then sorted mapbox results
      // Show all saved matches, then fill remaining slots with mapbox results (max 8 total)
      const maxMapboxResults = Math.max(0, 8 - matchingSaved.length);
      const combined = [...matchingSaved, ...mapboxResults.slice(0, maxMapboxResults)];
      setSearchResults(combined);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(matchingSaved.slice(0, 5));
      setShowResults(matchingSaved.length > 0);
    } finally {
      setIsSearching(false);
    }
  }, [mapboxToken, userLocation]);

  const handleSelectResult = (result: SearchResult) => {
    if (!map.current) return;
    
    const [lng, lat] = result.center;
    map.current.flyTo({
      center: [lng, lat],
      zoom: result.isSaved ? 14 : 10,
      duration: 2000,
    });

    setSearchQuery(result.name);
    setShowResults(false);

    // Update main marker
    if (marker.current) {
      marker.current.remove();
    }
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.innerHTML = `
      <div class="marker-pin">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#0891b2"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      </div>
    `;
    marker.current = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map.current!);

    onLocationSelectRef.current(lat, lng);

    // If it's a saved location, also trigger the saved location click handler
    if (result.isSaved && result.savedLocation && onSavedLocationClickRef.current) {
      onSavedLocationClickRef.current(result.savedLocation);
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-medium">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="flex h-12 w-full rounded-xl bg-card/95 backdrop-blur-md border-0 pl-9 md:pl-12 pr-4 py-3 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm"
            style={{ textAlign: 'left' }}
          />
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-md rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectResult(result);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b border-border last:border-b-0"
                >
                  {result.isSaved ? (
                    <Bookmark className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  ) : (
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{result.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.place_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History Toggle Button */}
        <Button
          variant={showHistory ? 'default' : 'secondary'}
          size="sm"
          className={`bg-card/95 backdrop-blur-md border-0 hover:bg-card gap-2 ${showHistory ? 'bg-primary hover:bg-primary/90' : ''}`}
          onClick={() => setShowHistory(!showHistory)}
          title={showHistory ? 'Hide session history' : 'Show session history'}
        >
          <History className={`h-4 w-4 ${showHistory ? 'text-primary-foreground' : 'text-foreground'}`} />
          <span className={`text-sm font-medium ${showHistory ? 'text-primary-foreground' : 'text-foreground'}`}>Places Surfed</span>
        </Button>
      </div>


      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      <style>{`
        .custom-marker {
          cursor: pointer;
        }
        .marker-pin {
          animation: dropIn 0.3s ease-out;
        }
        .saved-marker {
          cursor: pointer;
        }
        .saved-marker-pin {
          animation: dropIn 0.3s ease-out;
          transition: transform 0.2s ease;
        }
        .saved-marker:hover .saved-marker-pin {
          transform: scale(1.1);
        }
        .history-marker {
          cursor: default;
          pointer-events: none;
        }
        .history-marker-pin {
          animation: dropIn 0.3s ease-out;
        }
        @keyframes dropIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .mapboxgl-ctrl-group {
          border-radius: 12px !important;
          box-shadow: var(--shadow-soft) !important;
        }
      `}</style>
    </div>
  );
};

export default MapWidget;