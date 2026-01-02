import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Waves, Trash2, Camera, Loader2, MapPin, Clock } from 'lucide-react';
import ImageLightbox from '@/components/ImageLightbox';

interface Board {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  length_feet: number | null;
  length_inches: number | null;
  volume_liters: number | null;
  board_type: string | null;
  photo_url: string | null;
}

interface BoardStats {
  waves_caught: number;
  hours_surfed: number;
  most_surfed_spot: string | null;
}

const Quiver = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardStats, setBoardStats] = useState<Map<string, BoardStats>>(new Map());
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxBoardId, setLightboxBoardId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    length_feet: '',
    length_inches: '',
    volume_liters: '',
    board_type: ''
  });

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchBoards = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setBoards(data);
      setLoadingData(false);
    };
    if (user) fetchBoards();
  }, [user]);

  // Fetch board stats
  useEffect(() => {
    const fetchBoardStats = async () => {
      if (!user || boards.length === 0) return;

      const boardIds = boards.map(b => b.id);
      
      // Fetch all sessions that used these boards - include duration_minutes
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, board_id, wave_count, location, session_date, created_at, duration_minutes')
        .eq('user_id', user.id)
        .in('board_id', boardIds);

      if (!sessions) return;

      const statsMap = new Map<string, BoardStats>();

      boardIds.forEach(boardId => {
        const boardSessions = sessions.filter(s => s.board_id === boardId);
        
        // Calculate waves caught
        const wavesCaught = boardSessions.reduce((sum, s) => sum + (s.wave_count || 0), 0);
        
        // Calculate hours surfed from actual duration_minutes
        const totalMinutes = boardSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const hoursSurfed = totalMinutes / 60;
        
        // Find most surfed spot
        const spotCounts = new Map<string, number>();
        boardSessions.forEach(s => {
          const count = spotCounts.get(s.location) || 0;
          spotCounts.set(s.location, count + 1);
        });
        
        let mostSurfedSpot: string | null = null;
        let maxCount = 0;
        spotCounts.forEach((count, spot) => {
          if (count > maxCount) {
            maxCount = count;
            mostSurfedSpot = spot;
          }
        });

        statsMap.set(boardId, {
          waves_caught: wavesCaught,
          hours_surfed: hoursSurfed,
          most_surfed_spot: mostSurfedSpot,
        });
      });

      setBoardStats(statsMap);
    };

    fetchBoardStats();
  }, [user, boards]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const { data, error } = await supabase.from('boards').insert({
      user_id: user.id,
      name: formData.name,
      brand: formData.brand || null,
      model: formData.model || null,
      length_feet: formData.length_feet ? parseInt(formData.length_feet) : null,
      length_inches: formData.length_inches ? parseInt(formData.length_inches) : null,
      volume_liters: formData.volume_liters ? parseFloat(formData.volume_liters) : null,
      board_type: formData.board_type || null
    }).select().single();

    if (!error && data) {
      setBoards([data, ...boards]);
      setDialogOpen(false);
      setFormData({ name: '', brand: '', model: '', length_feet: '', length_inches: '', volume_liters: '', board_type: '' });
      toast({ title: 'Board added!' });
    }
  };

  const deleteBoard = async (id: string) => {
    await supabase.from('boards').delete().eq('id', id);
    setBoards(boards.filter(b => b.id !== id));
    toast({ title: 'Board removed' });
  };

  const handlePhotoUpload = async (boardId: string, file: File) => {
    if (!user) return;
    
    setUploadingPhoto(boardId);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${boardId}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('board-photos')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploadingPhoto(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('board-photos')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('boards')
      .update({ photo_url: publicUrl })
      .eq('id', boardId);

    if (!updateError) {
      setBoards(boards.map(b => b.id === boardId ? { ...b, photo_url: publicUrl } : b));
      toast({ title: 'Photo uploaded!' });
    }
    
    setUploadingPhoto(null);
  };

  const formatHours = (hours: number) => {
    if (hours === 0) return '0 hrs';
    if (Number.isInteger(hours)) return `${hours} hrs`;
    return `${hours.toFixed(1)} hrs`;
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Quiver</h1>
            <p className="text-muted-foreground">{boards.length} board{boards.length !== 1 ? 's' : ''}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Board</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="My favorite shortboard"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brand</Label>
                    <Input
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="Channel Islands"
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Fever"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Length (ft)</Label>
                    <Input
                      type="number"
                      value={formData.length_feet}
                      onChange={(e) => setFormData({ ...formData, length_feet: e.target.value })}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <Label>Length (in)</Label>
                    <Input
                      type="number"
                      value={formData.length_inches}
                      onChange={(e) => setFormData({ ...formData, length_inches: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label>Volume (L)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.volume_liters}
                      onChange={(e) => setFormData({ ...formData, volume_liters: e.target.value })}
                      placeholder="32.5"
                    />
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Input
                    value={formData.board_type}
                    onChange={(e) => setFormData({ ...formData, board_type: e.target.value })}
                    placeholder="Shortboard, Longboard, Fish..."
                  />
                </div>
                <Button type="submit" className="w-full">Add Board</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-16">
            <Waves className="h-8 w-8 animate-pulse text-primary" />
          </div>
        ) : boards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Waves className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6">Add your boards to link them to sessions.</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Board
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const stats = boardStats.get(board.id);
              return (
                <Card key={board.id} className="overflow-hidden">
                  {/* Board Photo */}
                  <div className="relative aspect-[4/3] bg-muted">
                    {board.photo_url ? (
                      <button
                        onClick={() => {
                          setLightboxBoardId(board.id);
                          setLightboxOpen(true);
                        }}
                        className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={board.photo_url}
                          alt={board.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Waves className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Photo upload overlay */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileInputRefs.current[board.id] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(board.id, file);
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[board.id]?.click()}
                      disabled={uploadingPhoto === board.id}
                      className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background rounded-full p-2 transition-colors"
                    >
                      {uploadingPhoto === board.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                      ) : (
                        <Camera className="h-5 w-5 text-foreground" />
                      )}
                    </button>
                  </div>

                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-lg">{board.name}</CardTitle>
                      {board.brand && (
                        <CardDescription>
                          {board.brand}{board.model ? ` ${board.model}` : ''}
                        </CardDescription>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteBoard(board.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {board.length_feet && (
                        <span>{board.length_feet}'{board.length_inches || 0}"</span>
                      )}
                      {board.volume_liters && <span>{board.volume_liters}L</span>}
                      {board.board_type && <span>{board.board_type}</span>}
                    </div>

                    {/* Board Stats */}
                    {stats && (stats.waves_caught > 0 || stats.most_surfed_spot) && (
                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Waves className="h-4 w-4 text-primary" />
                            <span className="text-foreground font-medium">{stats.waves_caught} waves</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-foreground font-medium">{formatHours(stats.hours_surfed)}</span>
                          </div>
                        </div>
                        {stats.most_surfed_spot && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Most surfed:</span>
                            <span className="text-foreground font-medium truncate">{stats.most_surfed_spot}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Board Photo Lightbox */}
        {lightboxBoardId && (
          <ImageLightbox
            images={boards
              .filter(b => b.id === lightboxBoardId && b.photo_url)
              .map(b => ({ url: b.photo_url!, media_type: 'image/jpeg' }))}
            initialIndex={0}
            open={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setLightboxBoardId(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default Quiver;