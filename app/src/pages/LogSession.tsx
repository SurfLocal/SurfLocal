import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Waves, Upload, X, Video, MapPin, User, Mountain } from 'lucide-react';
import { getHours } from 'date-fns';

// Time window type for swell data matching
type TimeOfDay = 'morning' | 'midday' | 'afternoon';

// Determine time window based on session hour
const getSessionTimeWindow = (sessionDateTime: Date): TimeOfDay => {
  const hour = getHours(sessionDateTime);
  // Morning: 12am-9am, Midday: 10am-2pm, Afternoon: 2pm-11:59pm
  if (hour >= 0 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 14) return 'midday';
  return 'afternoon';
};

interface Board { id: string; name: string; brand: string | null; }
interface Spot { id: string; name: string; location: string; }

// Dropdown options
const SHAPE_OPTIONS = ['Jumbled', 'Mushy', 'Closed-out', 'Orderly', 'Peaky', 'Hollow'];
const HEIGHT_OPTIONS = ['1-2', '2-3', '3-4', '4-6', '6-8', '8-10', '10+'];
const POWER_OPTIONS = ['Weak', 'Medium', 'Heavy'];
const CROWD_OPTIONS = ['Empty', 'Light', 'Moderate', 'Heavy', 'Zoo'];
const GEAR_OPTIONS = ['Trunks', '2mm Top', '2mm Suit', '3/2mm Suit', '4/3mm Suit'];
const RATING_OPTIONS = [
  { value: 'Dog Shit', label: 'Dog Shit' },
  { value: 'Poor', label: 'Poor' },
  { value: 'Decent', label: 'Decent' },
  { value: 'Fun', label: 'Fun' },
  { value: 'Epic', label: 'Epic' },
];

const LogSession = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spotSearchRef = useRef<HTMLDivElement>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  
  // Spot search
  const [spotSearch, setSpotSearch] = useState('');
  const [spotResults, setSpotResults] = useState<Spot[]>([]);
  const [showSpotResults, setShowSpotResults] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  
  const [formData, setFormData] = useState(() => {
    // Default to 1 hour ago, rounded to nearest hour (using local time, not UTC)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const roundedHour = Math.round(oneHourAgo.getHours());
    // Use local date components instead of toISOString() which returns UTC
    const year = oneHourAgo.getFullYear();
    const month = (oneHourAgo.getMonth() + 1).toString().padStart(2, '0');
    const day = oneHourAgo.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hours = roundedHour.toString().padStart(2, '0');
    const minutes = '00';
    return {
      session_date: dateStr,
      session_time: `${hours}:${minutes}`,
      duration_hours: '1',
      duration_minutes: '0',
      board_id: '',
      wave_count: '',
      gear: '',
      air_count: '',
      barrel_count: '',
      notes: '',
      is_public: true,
      shape: '',
      wave_height: '',
      power: '',
      crowd: '',
      rating: '',
    };
  });

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [boardsData, spotsData] = await Promise.all([
          api.boards.getByUser(user.id),
          api.spots.getAll(),
        ]);
        
        if (boardsData) setBoards(boardsData);
        if (spotsData) setSpots(spotsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (user) fetchData();
  }, [user]);

  // Filter spots as user types
  useEffect(() => {
    // Don't show results if a spot is already selected and search matches it
    if (selectedSpot && spotSearch === selectedSpot.name) {
      setSpotResults([]);
      setShowSpotResults(false);
      return;
    }
    
    if (spotSearch.trim()) {
      const results = spots.filter(spot => 
        spot.name.toLowerCase().includes(spotSearch.toLowerCase())
      );
      setSpotResults(results);
      setShowSpotResults(true);
    } else {
      setSpotResults([]);
      setShowSpotResults(false);
    }
  }, [spotSearch, spots, selectedSpot]);

  // Close spot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (spotSearchRef.current && !spotSearchRef.current.contains(event.target as Node)) {
        setShowSpotResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSpot = (spot: Spot) => {
    setSelectedSpot(spot);
    setSpotSearch(spot.name);
    setSpotResults([]);
    setShowSpotResults(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    
    if (validFiles.length + mediaFiles.length > 5) {
      toast({ title: 'Maximum 5 files allowed', variant: 'destructive' });
      return;
    }

    setMediaFiles([...mediaFiles, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaPreviews(prev => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate all required fields
    const errors: string[] = [];
    
    if (!selectedSpot) {
      errors.push('Spot');
    }
    if (!formData.session_date) {
      errors.push('Date');
    }
    if (!formData.session_time) {
      errors.push('Start Time');
    }
    if (!formData.shape) {
      errors.push('Shape');
    }
    if (!formData.wave_height) {
      errors.push('Height');
    }
    if (!formData.power) {
      errors.push('Power');
    }
    if (!formData.crowd) {
      errors.push('Crowd');
    }
    if (!formData.rating) {
      errors.push('Rating');
    }
    
    // Check minimum duration of 15 minutes
    const totalMinutes = (parseInt(formData.duration_hours) || 0) * 60 + (parseInt(formData.duration_minutes) || 0);
    if (totalMinutes < 15) {
      errors.push('Duration (minimum 15 minutes)');
    }
    
    // Check for future date/time
    const sessionDateTime = new Date(`${formData.session_date}T${formData.session_time}:00`);
    if (sessionDateTime > new Date()) {
      toast({ 
        title: 'Invalid session date', 
        description: 'You cannot log sessions in the future', 
        variant: 'destructive' 
      });
      return;
    }

    if (errors.length > 0) {
      toast({ 
        title: 'Missing required fields', 
        description: `Please fill out: ${errors.join(', ')}`, 
        variant: 'destructive' 
      });
      return;
    }
    
    setSubmitting(true);

    try {
      // Combine date and time into a proper timestamp
      const sessionDateTime = new Date(`${formData.session_date}T${formData.session_time}:00`);
      
      // Calculate total duration in minutes
      const durationMinutes = (parseInt(formData.duration_hours) || 0) * 60 + (parseInt(formData.duration_minutes) || 0);
      
      // Create session with spot name as location
      const session = await api.sessions.create({
        user_id: user.id,
        location: selectedSpot.name,
        session_date: sessionDateTime.toISOString(),
        duration_minutes: durationMinutes > 0 ? durationMinutes : null,
        board_id: formData.board_id || null,
        wave_count: formData.wave_count ? parseInt(formData.wave_count) : null,
        gear: formData.gear || null,
        air_count: formData.air_count ? parseInt(formData.air_count) : null,
        barrel_count: formData.barrel_count ? parseInt(formData.barrel_count) : null,
        notes: formData.notes || null,
        is_public: formData.is_public,
        shape: formData.shape,
        wave_height: formData.wave_height,
        power: formData.power,
        crowd: formData.crowd,
        rating: formData.rating,
      });

      if (!session) throw new Error('Failed to create session');

      // TODO: Save swell signature data - needs backend endpoint
      // const timeWindow = getSessionTimeWindow(sessionDateTime);

      // Upload media files to MinIO
      if (mediaFiles.length > 0) {
        try {
          await api.upload.sessionMedia(mediaFiles, session.id, user.id);
        } catch (uploadError) {
          console.error('Error uploading media:', uploadError);
          toast({ title: 'Session saved but media upload failed', variant: 'destructive' });
        }
      }

      // Dispatch event to notify SpotReports to recalculate ratings
      window.dispatchEvent(new CustomEvent('session-logged', { detail: { location: selectedSpot.name } }));

      toast({ title: 'Session logged!' });
      navigate('/feed');
    } catch (error) {
      console.error('Error logging session:', error);
      toast({ title: 'Error logging session', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Log Session</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Spot Conditions Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mountain className="h-5 w-5 text-primary" />
                Spot Conditions
              </CardTitle>
              <p className="text-sm text-muted-foreground">All fields required</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Spot Search */}
              <div className="space-y-2" ref={spotSearchRef}>
                <Label htmlFor="spot">Spot *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="spot"
                    value={spotSearch} 
                    onChange={(e) => {
                      setSpotSearch(e.target.value);
                      if (selectedSpot && e.target.value !== selectedSpot.name) {
                        setSelectedSpot(null);
                      }
                    }}
                    onFocus={() => spotSearch && setShowSpotResults(true)}
                    placeholder="Search surf spots..."
                    className="pl-10"
                  />
                  {showSpotResults && spotResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto z-50">
                      {spotResults.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => handleSelectSpot(spot)}
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
                  {showSpotResults && spotSearch && spotResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
                      <p className="text-sm text-muted-foreground text-center">No spots found</p>
                    </div>
                  )}
                </div>
                {selectedSpot && (
                  <p className="text-xs text-muted-foreground">{selectedSpot.location}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Shape *</Label>
                  <Select value={formData.shape} onValueChange={(v) => setFormData({ ...formData, shape: v })}>
                    <SelectTrigger><SelectValue placeholder="Select shape" /></SelectTrigger>
                    <SelectContent>
                      {SHAPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Height *</Label>
                  <Select value={formData.wave_height} onValueChange={(v) => setFormData({ ...formData, wave_height: v })}>
                    <SelectTrigger><SelectValue placeholder="Select height" /></SelectTrigger>
                    <SelectContent>
                      {HEIGHT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt} ft</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Power *</Label>
                  <Select value={formData.power} onValueChange={(v) => setFormData({ ...formData, power: v })}>
                    <SelectTrigger><SelectValue placeholder="Select power" /></SelectTrigger>
                    <SelectContent>
                      {POWER_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Crowd *</Label>
                  <Select value={formData.crowd} onValueChange={(v) => setFormData({ ...formData, crowd: v })}>
                    <SelectTrigger><SelectValue placeholder="Select crowd" /></SelectTrigger>
                    <SelectContent>
                      {CROWD_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Rating *</Label>
                  <Select value={formData.rating} onValueChange={(v) => setFormData({ ...formData, rating: v })}>
                    <SelectTrigger><SelectValue placeholder="Rate this session" /></SelectTrigger>
                    <SelectContent>
                      {RATING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Session Section */}
          <Card>
            <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Your Session
            </CardTitle>
            <p className="text-sm text-muted-foreground">Date/time required, others optional</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="date" value={formData.session_date} onChange={(e) => setFormData({ ...formData, session_date: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Start Time *</Label>
                  <Input id="time" type="time" value={formData.session_time} onChange={(e) => setFormData({ ...formData, session_time: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label>Duration *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.duration_hours} onValueChange={(v) => setFormData({ ...formData, duration_hours: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Hours" /></SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                          <SelectItem key={h} value={h.toString()}>{h} hr</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={formData.duration_minutes} onValueChange={(v) => setFormData({ ...formData, duration_minutes: v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((m) => (
                          <SelectItem key={m} value={m.toString()}>{m} min</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Board</Label>
                  <Select value={formData.board_id} onValueChange={(v) => setFormData({ ...formData, board_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder={boards.length > 0 ? "Select board (optional)" : "No boards yet"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No board</SelectItem>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.brand ? `${b.brand} ` : ''}{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wave_count">Waves Caught</Label>
                  <Input id="wave_count" type="number" min="0" value={formData.wave_count} onChange={(e) => setFormData({ ...formData, wave_count: e.target.value })} placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label>Gear</Label>
                  <Select value={formData.gear} onValueChange={(v) => setFormData({ ...formData, gear: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gear" /></SelectTrigger>
                    <SelectContent>
                      {GEAR_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="air_count">Air Count</Label>
                  <Input id="air_count" type="number" min="0" value={formData.air_count} onChange={(e) => setFormData({ ...formData, air_count: e.target.value })} placeholder="0" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barrel_count">Barrel Count</Label>
                  <Input id="barrel_count" type="number" min="0" value={formData.barrel_count} onChange={(e) => setFormData({ ...formData, barrel_count: e.target.value })} placeholder="0" />
                </div>
              </div>

              {/* Media Upload */}
              <div className="space-y-2">
                <Label>Photos & Videos</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload photos or videos</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 5 files</p>
                </div>
                
                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        {mediaFiles[index]?.type.startsWith('video/') ? (
                          <div className="flex items-center justify-center h-full">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeMedia(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="How was the session?" rows={4} />
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">Share to Feed</Label>
                  <p className="text-sm text-muted-foreground">Let others see this session</p>
                </div>
                <Switch checked={formData.is_public} onCheckedChange={(v) => setFormData({ ...formData, is_public: v })} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={submitting || !selectedSpot}>{submitting ? 'Saving...' : 'Log Session'}</Button>
        </form>
      </div>
    </Layout>
  );
};

export default LogSession;