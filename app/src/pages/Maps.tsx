import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import MapWidget from '@/components/MapWidget';
import InfoPanel, { SurfPrediction } from '@/components/InfoPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Waves, Compass, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoicm9icm9uYXluZSIsImEiOiJjbWpwYWI0dWYyODJmM2RweTN1MjBjN3pqIn0.72-EvJIHzZaucikkpia5rg';

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

const Maps = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<SurfPrediction | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [sessionLocations, setSessionLocations] = useState<SessionLocation[]>([]);
  const [selectedSavedLocation, setSelectedSavedLocation] = useState<SavedLocation | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState<SavedLocation | null>(null);
  const [showMobileAnalysis, setShowMobileAnalysis] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  // Fetch saved locations (favorite spots)
  useEffect(() => {
    const fetchSavedLocations = async () => {
      if (!user) return;
      try {
        const locations = await api.locations.getByUser(user.id);
        if (locations && locations.length > 0) {
          setSavedLocations(locations.map((loc: any) => ({
            id: loc.id,
            name: loc.name,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
          })));
        }
      } catch (error) {
        console.error('Error fetching saved locations:', error);
        setSavedLocations([]);
      }
    };
    
    if (user) fetchSavedLocations();
  }, [user]);

  // Fetch session locations for history pins
  useEffect(() => {
    const fetchSessionLocations = async () => {
      if (!user) return;
      
      try {
        // Get user's sessions
        const sessionsData = await api.sessions.getByUser(user.id);
        if (!sessionsData || sessionsData.length === 0) return;
        
        // Get unique location names
        const uniqueLocationNames = [...new Set(sessionsData.map((s: any) => s.location))];
        
        // Fetch coordinates from spots
        const spotsData = await api.spots.getAll();
        if (spotsData) {
          const locations: SessionLocation[] = spotsData
            .filter((spot: any) => uniqueLocationNames.includes(spot.name))
            .map((spot: any) => ({
              latitude: Number(spot.latitude),
              longitude: Number(spot.longitude),
              location: spot.name,
            }));
          setSessionLocations(locations);
        }
      } catch (error) {
        console.error('Error fetching session locations:', error);
      }
    };
    
    if (user) fetchSessionLocations();
  }, [user]);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setPrediction(null);
    setSelectedSavedLocation(null);
  }, []);

  const handleSavedLocationClick = useCallback((location: SavedLocation) => {
    setSelectedSavedLocation(location);
    setSelectedLocation({ lat: location.latitude, lng: location.longitude });
    // Auto-explore saved locations
    handleExploreLocation(location.latitude, location.longitude);
  }, []);

  const handleSaveLocation = async (name: string, lat: number, lng: number) => {
    if (!user) return;
    try {
      // Save to saved_locations table (not favorite_spots)
      await api.locations.save({
        user_id: user.id,
        name,
        latitude: lat,
        longitude: lng,
      });
      
      // Refresh saved locations list to show new pin on map
      const locations = await api.locations.getByUser(user.id);
      if (locations) {
        setSavedLocations(locations.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
        })));
      }
      
      toast({ title: 'Location saved!', description: `${name} saved to your locations` });
    } catch (error) {
      console.error('Error saving location:', error);
      toast({ title: 'Failed to save location', variant: 'destructive' });
    }
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation || !user) return;
    try {
      await api.locations.delete(deletingLocation.id);
      setSavedLocations(prev => prev.filter(loc => loc.id !== deletingLocation.id));
      setSelectedSavedLocation(null);
      toast({ title: 'Location removed' });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({ title: 'Failed to delete location', variant: 'destructive' });
    }
    setShowDeleteDialog(false);
    setDeletingLocation(null);
  };

  const handleExploreLocation = async (lat: number, lng: number) => {
    setIsLoading(true);
    setPrediction(null);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (response.ok) { 
        const data = await response.json();
        // Ensure GPS coordinates are always included
        if (!data.gps) {
          data.gps = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        setPrediction(data);
      }
      else { throw new Error('API error'); }
    } catch {
      // Mock data fallback
      setPrediction({
        gps: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        swell_direction: { predictions: [{ value: 'W', confidence: 0.89 }], top_prediction: 'W', top_confidence: 0.89 },
        wind_direction: { predictions: [{ value: 'NW', confidence: 0.75 }], top_prediction: 'NW', top_confidence: 0.75 },
        tide: { predictions: [{ value: 'Mid', confidence: 0.82 }], top_prediction: 'Mid', top_confidence: 0.82 },
        wave_direction: { value: 'SW', confidence: 0.65 },
        bottom: { predictions: [{ value: 'Sand', confidence: 0.91 }], top_prediction: 'Sand', top_confidence: 0.91 },
        surf_height_estimate: '4-8 ft',
        rating: { value: '6.5', confidence: 0.72 },
        overall_confidence: 0.73,
      });
    } finally { setIsLoading(false); }
  };

  const handleExplore = async () => {
    if (!selectedLocation) return;
    await handleExploreLocation(selectedLocation.lat, selectedLocation.lng);
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout>
      {/* Desktop layout */}
      <div className="hidden md:flex h-full overflow-hidden">
        <div className="flex-1 p-4 pr-2">
          <div className="h-full rounded-2xl overflow-hidden">
            <MapWidget 
              mapboxToken={MAPBOX_TOKEN} 
              onLocationSelect={handleLocationSelect}
              savedLocations={savedLocations}
              onSavedLocationClick={handleSavedLocationClick}
              sessionLocations={sessionLocations}
            />
          </div>
        </div>
        <div className="w-[420px] p-4 pl-2 flex flex-col gap-3 h-[calc(100vh-64px)]">
          {/* Saved Location Header */}
          {selectedSavedLocation && (
            <div className="bg-card rounded-2xl shadow-medium p-4 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saved Spot</p>
                <h3 className="font-semibold text-foreground">{selectedSavedLocation.name}</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setDeletingLocation(selectedSavedLocation);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex-1 min-h-0">
            <InfoPanel 
              selectedLocation={selectedLocation} 
              isLoading={isLoading} 
              prediction={prediction}
              onSaveLocation={selectedSavedLocation ? undefined : handleSaveLocation}
            />
          </div>
          {!prediction && (
            <Button 
              size="xl" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl flex-shrink-0"
              onClick={handleExplore}
              disabled={!selectedLocation || isLoading}
            >
              <Compass className="h-5 w-5 mr-2" />
              {isLoading ? 'Exploring...' : 'Explore Location'}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile layout - map with bottom explore button */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">
        {/* Map container - always rendered but hidden when analysis shown */}
        <div className={`flex-1 relative ${showMobileAnalysis ? 'hidden' : ''}`}>
          <MapWidget 
            mapboxToken={MAPBOX_TOKEN} 
            onLocationSelect={handleLocationSelect}
            savedLocations={savedLocations}
            onSavedLocationClick={(loc) => {
              handleSavedLocationClick(loc);
              setShowMobileAnalysis(true);
            }}
            sessionLocations={sessionLocations}
          />
        </div>

        {/* Bottom Explore Button - Mobile (only when no analysis shown) */}
        {!showMobileAnalysis && (
          <div className="p-3 bg-background border-t border-border">
            <Button 
              size="lg" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
              onClick={() => {
                if (selectedLocation) {
                  handleExplore();
                  setShowMobileAnalysis(true);
                }
              }}
              disabled={!selectedLocation || isLoading}
            >
              <Compass className="h-5 w-5 mr-2" />
              {isLoading ? 'Exploring...' : 'Explore Location'}
            </Button>
          </div>
        )}

        {/* Analysis Panel - Mobile Fullscreen Overlay */}
        {showMobileAnalysis && (
          <div className="flex-1 overflow-y-auto bg-background p-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {selectedSavedLocation ? (
                      <>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Saved Spot</p>
                        <h3 className="font-semibold text-foreground">{selectedSavedLocation.name}</h3>
                      </>
                    ) : selectedLocation ? (
                      <>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Selected Location</p>
                        <h3 className="font-semibold text-foreground">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</h3>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSavedLocation && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeletingLocation(selectedSavedLocation);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setShowMobileAnalysis(false);
                        setPrediction(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <InfoPanel 
                  selectedLocation={selectedLocation} 
                  isLoading={isLoading} 
                  prediction={prediction}
                  onSaveLocation={selectedSavedLocation ? undefined : handleSaveLocation}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="top-auto bottom-4 translate-y-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-top-[48%]">
          <DialogHeader>
            <DialogTitle>Delete Saved Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingLocation?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteLocation}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Maps;