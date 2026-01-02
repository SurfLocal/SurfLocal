import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Waves, User, Camera } from 'lucide-react';

interface Spot {
  id: string;
  name: string;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({ display_name: '', bio: '', home_break: '', years_surfing: '', avatar_url: '' });
  const [spots, setSpots] = useState<Spot[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  // Fetch spots for home break dropdown (deduplicated by name)
  useEffect(() => {
    const fetchSpots = async () => {
      const { data } = await supabase
        .from('spots')
        .select('id, name')
        .order('name');
      if (data) {
        // Deduplicate by name, keeping only the first occurrence
        const uniqueSpots = data.reduce((acc: Spot[], spot) => {
          if (!acc.some(s => s.name === spot.name)) {
            acc.push(spot);
          }
          return acc;
        }, []);
        setSpots(uniqueSpots);
      }
    };
    fetchSpots();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setProfile({ 
        display_name: data.display_name || '', 
        bio: data.bio || '', 
        home_break: data.home_break || '', 
        years_surfing: data.years_surfing?.toString() || '',
        avatar_url: data.avatar_url || ''
      });
      setLoadingProfile(false);
    };
    if (user) fetch();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    // Delete old avatar if exists
    await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`, `${user.id}/avatar.webp`]);

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', user.id);

    if (updateError) {
      toast({ title: 'Failed to save avatar', variant: 'destructive' });
    } else {
      setProfile({ ...profile, avatar_url: avatarUrl });
      toast({ title: 'Avatar updated!' });
    }
    setUploadingAvatar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ 
      display_name: profile.display_name || null, 
      bio: profile.bio || null, 
      home_break: profile.home_break || null, 
      years_surfing: profile.years_surfing ? parseInt(profile.years_surfing) : null 
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast({ title: 'Error saving', variant: 'destructive' });
    else toast({ title: 'Profile updated!' });
  };

  if (loading || !user || loadingProfile) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Profile</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Your Profile</CardTitle></CardHeader>
          <CardContent>
            {/* Avatar Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url} alt="Profile" />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {(profile.display_name || user.email || 'S')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              {uploadingAvatar && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
              <p className="text-sm text-muted-foreground mt-2">Click the camera icon to update your photo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Display Name</Label><Input value={profile.display_name} onChange={(e) => setProfile({...profile, display_name: e.target.value})} placeholder="Your name" /></div>
              <div>
                <Label>Home Break</Label>
                <Select value={profile.home_break} onValueChange={(value) => setProfile({...profile, home_break: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your local spot" />
                  </SelectTrigger>
                  <SelectContent>
                    {spots.map((spot) => (
                      <SelectItem key={spot.id} value={spot.name}>{spot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Years Surfing</Label><Input type="number" value={profile.years_surfing} onChange={(e) => setProfile({...profile, years_surfing: e.target.value})} placeholder="5" /></div>
              <div><Label>Bio</Label><Textarea value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} placeholder="Tell us about yourself..." rows={4} /></div>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;