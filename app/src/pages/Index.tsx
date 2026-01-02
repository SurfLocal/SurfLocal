import React, { useState, useCallback } from 'react';
import { Waves, Navigation2, AlertCircle } from 'lucide-react';
import MapWidget from '@/components/MapWidget';
import InfoPanel, { SurfPrediction } from '@/components/InfoPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const MAPBOX_TOKEN_KEY = 'mapbox_token';

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem(MAPBOX_TOKEN_KEY) || ''
  );
  const [tokenInput, setTokenInput] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<SurfPrediction | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setPrediction(null);
  }, []);

  const handleExplore = async () => {
    if (!selectedLocation) {
      toast.error('Please drop a pin on the map first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const data = await response.json();
      setPrediction(data);
      toast.success('Location explored successfully!');
    } catch (error) {
      console.error('Explore error:', error);
      toast.error('Could not connect to prediction service. Make sure the backend is running.');
      
      // Mock data for demo purposes when backend isn't available
      const mockData: SurfPrediction = {
        gps: `${selectedLocation.lat.toFixed(6)},${selectedLocation.lng.toFixed(6)}`,
        swell_direction: { top_prediction: 'W', top_confidence: 0.89 },
        wind_direction: { top_prediction: 'NW', top_confidence: 0.76 },
        tide: { top_prediction: 'Mid', top_confidence: 0.82 },
        wave_direction: { value: 'N/A', confidence: 0.65 },
        bottom: { top_prediction: 'Sand', top_confidence: 0.91 },
        surf_height_estimate: '4-8 ft',
        rating: { value: '6.5', confidence: 0.72 },
        overall_confidence: 0.73,
      };
      setPrediction(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      localStorage.setItem(MAPBOX_TOKEN_KEY, tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setTokenInput('');
    }
  };

  if (!mapboxToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-medium p-8 text-center">
          <div className="w-16 h-16 bg-ocean-light/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Navigation2 className="w-8 h-8 text-ocean-light" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Maps to Nowhere</h1>
          <p className="text-muted-foreground mb-6">
            To get started, please enter your Mapbox public token. You can find it in your{' '}
            <a 
              href="https://account.mapbox.com/access-tokens/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-ocean-light hover:underline"
            >
              Mapbox dashboard
            </a>.
          </p>
          
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg mb-6 text-left">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your token is stored locally and never sent to our servers.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="text"
              placeholder="pk.eyJ1Ijoi..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTokenSubmit()}
            />
            <Button 
              onClick={handleTokenSubmit} 
              className="w-full" 
              variant="ocean"
              disabled={!tokenInput.trim()}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center px-6 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-ocean rounded-xl flex items-center justify-center shadow-soft">
            <Waves className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Maps to Nowhere</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Find your perfect surf spot</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex gap-6">
        {/* Map Section - Left of center */}
        <div className="flex-1 max-w-[65%]">
          <MapWidget 
            onLocationSelect={handleLocationSelect}
            mapboxToken={mapboxToken}
          />
        </div>

        {/* Info Panel - Right sidebar */}
        <div className="w-[380px] flex flex-col gap-4">
          <div className="flex-1">
            <InfoPanel 
              isLoading={isLoading}
              prediction={prediction}
              selectedLocation={selectedLocation}
            />
          </div>
          
          {/* Explore Button */}
          <Button
            onClick={handleExplore}
            variant="explore"
            className="w-full"
            disabled={!selectedLocation || isLoading}
          >
            <Navigation2 className="w-5 h-5" />
            {isLoading ? 'Exploring...' : 'Explore Location'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
