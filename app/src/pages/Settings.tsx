import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Waves, Mail, Lock } from 'lucide-react';

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  if (!loading && !user) { navigate('/auth'); return null; }
  if (loading || !user) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Waves className="h-8 w-8 animate-pulse text-primary" /></div></Layout>;

  const updateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // TODO: Implement email update endpoint
      toast({ title: 'Email update not yet implemented', variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setUpdating(false);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast({ title: 'Passwords do not match', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'Password must be at least 6 characters', variant: 'destructive' }); return; }
    setUpdating(true);
    try {
      // TODO: Implement password update endpoint (requires current password)
      toast({ title: 'Password update not yet implemented', variant: 'destructive' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setUpdating(false);
  };

  return (
    <Layout allowScroll>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />Change Email</CardTitle><CardDescription>Current: {user.email}</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={updateEmail} className="space-y-4">
                <div><Label>New Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="new@email.com" /></div>
                <Button type="submit" disabled={updating}>Update Email</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Change Password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={updatePassword} className="space-y-4">
                <div><Label>New Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" /></div>
                <div><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" /></div>
                <Button type="submit" disabled={updating}>Update Password</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;