import React, { useState } from 'react';
import { Ship, Waves, Compass, Wind, Gauge, Mountain, Star, Activity, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PredictionItem {
  value: string;
  confidence: number;
}

interface PredictionCategory {
  predictions?: PredictionItem[];
  top_prediction?: string;
  top_confidence?: number;
  value?: string;
  confidence?: number;
}

export interface SurfPrediction {
  gps: string;
  swell_direction: PredictionCategory;
  wind_direction: PredictionCategory;
  tide: PredictionCategory;
  wave_direction: PredictionCategory;
  bottom: PredictionCategory;
  surf_height_estimate: string;
  rating: PredictionCategory;
  overall_confidence: number;
}

interface InfoPanelProps {
  isLoading: boolean;
  prediction: SurfPrediction | null;
  selectedLocation: { lat: number; lng: number } | null;
  onSaveLocation?: (name: string, lat: number, lng: number) => void;
}

const ConfidenceMeter: React.FC<{ confidence: number; size?: 'sm' | 'md' }> = ({ 
  confidence, 
  size = 'md' 
}) => {
  const percentage = Math.round(confidence * 100);
  const getColor = () => {
    if (percentage >= 70) return 'bg-confidence-high';
    if (percentage >= 40) return 'bg-confidence-mid';
    return 'bg-confidence-low';
  };

  return (
    <div className={`flex items-center gap-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <div className={`flex-1 ${size === 'sm' ? 'h-1.5' : 'h-2'} bg-muted rounded-full overflow-hidden`}>
        <div 
          className={`h-full ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-muted-foreground font-medium w-10 text-right">{percentage}%</span>
    </div>
  );
};

const PredictionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  confidence: number;
}> = ({ icon, label, value, confidence }) => (
  <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-semibold text-foreground">{value}</div>
    <ConfidenceMeter confidence={confidence} size="sm" />
  </div>
);

const LoadingAnimation: React.FC = () => (
  <div className="absolute inset-0 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-2xl overflow-hidden">
    {/* Ocean background */}
    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-ocean-light/20 to-transparent" />
    
    {/* Animated waves at bottom */}
    <div className="absolute bottom-8 left-0 right-0 flex justify-center">
      <div className="flex gap-2">
        <div className="w-20 h-3 bg-ocean-light/40 rounded-full animate-wave" style={{ animationDelay: '0s' }} />
        <div className="w-16 h-2 bg-ocean-light/30 rounded-full animate-wave" style={{ animationDelay: '0.4s' }} />
        <div className="w-24 h-3 bg-ocean-light/35 rounded-full animate-wave" style={{ animationDelay: '0.8s' }} />
      </div>
    </div>
    
    {/* Sailing boat container - moves across */}
    <div className="relative mb-8">
      <div className="animate-sail">
        <Ship className="w-20 h-20 text-primary" strokeWidth={1.5} />
      </div>
      {/* Wake behind boat */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-ocean-light/30 rounded-full blur-sm animate-pulse" />
    </div>
    
    <div className="text-center z-10">
      <p className="text-xl font-semibold text-foreground">Charting the waters...</p>
      <p className="text-sm text-muted-foreground mt-2">Analyzing surf potential</p>
    </div>

    {/* Animated compass dots */}
    <div className="flex gap-2 mt-6">
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
    </div>
  </div>
);

const EmptyState: React.FC<{ hasLocation: boolean }> = ({ hasLocation }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6">
    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
      <Compass className="w-10 h-10 text-muted-foreground" />
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-2">
      {hasLocation ? 'Ready to Explore' : 'Select a Location'}
    </h3>
    <p className="text-muted-foreground max-w-xs">
      {hasLocation 
        ? 'Click the Explore button below to analyze surf conditions at your selected location.'
        : 'Select a location on the map to analyze surf conditions and predictions.'}
    </p>
  </div>
);

const PredictionResults: React.FC<{ 
  prediction: SurfPrediction;
  selectedLocation: { lat: number; lng: number } | null;
  onSaveLocation?: (name: string, lat: number, lng: number) => void;
}> = ({ prediction, selectedLocation, onSaveLocation }) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [saving, setSaving] = useState(false);

  const getValue = (cat: PredictionCategory) => cat.top_prediction || cat.value || 'N/A';
  const getConfidence = (cat: PredictionCategory) => cat.top_confidence || cat.confidence || 0;

  const handleSave = async () => {
    if (!locationName.trim() || !selectedLocation || !onSaveLocation) return;
    setSaving(true);
    await onSaveLocation(locationName.trim(), selectedLocation.lat, selectedLocation.lng);
    setSaving(false);
    setShowSaveDialog(false);
    setLocationName('');
  };

  return (
    <div className="h-full overflow-y-auto px-1">

      {/* Rating Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-ocean-deep text-primary-foreground px-6 py-3 rounded-full">
          <Star className="w-5 h-5" />
          <span className="text-2xl font-bold">{getValue(prediction.rating)}</span>
          <span className="text-sm opacity-80">/ 10</span>
        </div>
        <div className="mt-3">
          <p className="text-sm text-muted-foreground mb-1">Overall Confidence</p>
          <ConfidenceMeter confidence={prediction.overall_confidence} />
        </div>
      </div>

      {/* Surf Height */}
      <div className="bg-gradient-ocean text-primary-foreground rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 opacity-80 mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Estimated Surf Height</span>
        </div>
        <div className="text-3xl font-bold">{prediction.surf_height_estimate}</div>
        <p className="text-xs opacity-70 mt-1">Under ideal conditions</p>
      </div>

      {/* GPS */}
      <div className="text-xs text-muted-foreground mb-4 text-center font-mono">
        📍 {prediction.gps}
      </div>

      {/* Prediction Grid */}
      <div className="grid grid-cols-2 gap-3">
        <PredictionCard
          icon={<Waves className="w-4 h-4" />}
          label="Ideal Swell Dir"
          value={getValue(prediction.swell_direction)}
          confidence={getConfidence(prediction.swell_direction)}
        />
        <PredictionCard
          icon={<Wind className="w-4 h-4" />}
          label="Ideal Wind Dir"
          value={getValue(prediction.wind_direction)}
          confidence={getConfidence(prediction.wind_direction)}
        />
        <PredictionCard
          icon={<Gauge className="w-4 h-4" />}
          label="Ideal Tide"
          value={getValue(prediction.tide)}
          confidence={getConfidence(prediction.tide)}
        />
        <PredictionCard
          icon={<Compass className="w-4 h-4" />}
          label="Wave Direction"
          value={getValue(prediction.wave_direction)}
          confidence={getConfidence(prediction.wave_direction)}
        />
        <div className="col-span-2">
          <PredictionCard
            icon={<Mountain className="w-4 h-4" />}
            label="Bottom Type"
            value={getValue(prediction.bottom)}
            confidence={getConfidence(prediction.bottom)}
          />
        </div>
      </div>

      {/* Save Location Button */}
      {onSaveLocation && selectedLocation && (
        <Button 
          variant="outline" 
          className="w-full mt-4"
          onClick={() => setShowSaveDialog(true)}
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save This Location
        </Button>
      )}

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Location</DialogTitle>
            <DialogDescription>
              Give this spot a name. It will appear as a pin on your map and in search results.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="e.g., Secret Reef, My Local Break..."
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!locationName.trim() || saving}>
                {saving ? 'Saving...' : 'Save Location'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoPanel: React.FC<InfoPanelProps> = ({ isLoading, prediction, selectedLocation, onSaveLocation }) => {
  return (
    <div className="relative h-full bg-card rounded-2xl shadow-medium p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-xl font-bold text-foreground">Surf Analysis</h2>
        <p className="text-sm text-muted-foreground">Surfability prediction</p>
      </div>

      {/* Content */}
      <div className="flex-1 relative min-h-0 overflow-y-auto">
        {isLoading && <LoadingAnimation />}
        
        {!isLoading && !prediction && (
          <EmptyState hasLocation={!!selectedLocation} />
        )}
        
        {!isLoading && prediction && (
          <PredictionResults 
            prediction={prediction} 
            selectedLocation={selectedLocation}
            onSaveLocation={onSaveLocation}
          />
        )}
      </div>
    </div>
  );
};

export default InfoPanel;