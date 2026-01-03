import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, ShieldOff, Waves, UserX, Crown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserResult {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
      toast({ title: 'Access denied', description: 'You must be an admin to access this page.', variant: 'destructive' });
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);

    try {
      const profiles = await api.profiles.search(searchQuery, 20);
      if (profiles && profiles.length > 0) {
        // Check admin status for each user
        const resultsWithAdmin = await Promise.all(
          profiles.map(async (p: any) => {
            try {
              const adminCheck = await api.auth.checkAdmin(p.user_id);
              return {
                ...p,
                is_admin: adminCheck?.is_admin || false
              };
            } catch (error) {
              console.error('Error checking admin status for user:', p.user_id, error);
              return {
                ...p,
                is_admin: false
              };
            }
          })
        );
        setSearchResults(resultsWithAdmin);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      await api.admin.promoteToAdmin(userId);
      toast({ title: 'User promoted to admin!' });
      // Update the user in search results
      setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, is_admin: true } : u));
    } catch (error: any) {
      console.error('Error promoting user:', error);
      const message = error?.message?.includes('already') 
        ? 'User is already an admin' 
        : 'Failed to promote user';
      toast({ title: message, variant: 'destructive' });
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'Cannot remove your own admin status', variant: 'destructive' });
      return;
    }
    try {
      await api.admin.removeAdmin(userId);
      toast({ title: 'Admin role removed' });
      // Update the user in search results
      setSearchResults(prev => prev.map(u => u.user_id === userId ? { ...u, is_admin: false } : u));
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({ title: 'Failed to remove admin', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'Cannot delete yourself', variant: 'destructive' });
      return;
    }
    try {
      await api.admin.deleteUser(userId);
      toast({ title: 'User deleted' });
      // Remove the user from search results
      setSearchResults(prev => prev.filter(u => u.user_id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  if (adminLoading || !isAdmin) {
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
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Manage users and content</p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Management</CardTitle>
            <CardDescription>Search for users to manage their accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Search Results */}
            {hasSearched && (
              <div className="mt-6 space-y-3">
                {searching ? (
                  <div className="text-center py-8">
                    <Waves className="h-6 w-6 animate-pulse text-primary mx-auto" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => (
                    <div
                      key={u.user_id}
                      className="p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <Link to={`/profile/${u.user_id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {(u.display_name || 'U')[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{u.display_name || 'Unknown'}</p>
                            {/* Admin badge - shows inline on desktop, on its own line on mobile */}
                            {u.is_admin && (
                              <Badge variant="secondary" className="text-xs mt-1 sm:hidden">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {u.bio && (
                              <p className="text-sm text-muted-foreground truncate">{u.bio}</p>
                            )}
                          </div>
                          {/* Admin badge for desktop - inline with name */}
                          {u.is_admin && (
                            <Badge variant="secondary" className="text-xs hidden sm:flex">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </Link>

                        {/* Action buttons - below on mobile, inline on desktop/tablet */}
                        <div className="flex gap-2 sm:flex-shrink-0">
                          {/* Admin toggle */}
                          {u.is_admin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handleRemoveAdmin(u.user_id); }}
                              disabled={u.user_id === user?.id}
                              className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 active:bg-orange-500/20 flex-1 sm:flex-none"
                            >
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Remove Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); handlePromoteToAdmin(u.user_id); }}
                              className="text-green-500 border-green-500/30 hover:bg-green-500/10 active:bg-green-500/20 flex-1 sm:flex-none"
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Make Admin
                            </Button>
                          )}

                          {/* Delete user */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={u.user_id === user?.id}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-1 sm:flex-none"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete all data for <strong>{u.display_name}</strong> including their sessions, comments, boards, and profile. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Admin Capabilities</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Delete any user's data (sessions, comments, boards, profile)</li>
                  <li>Promote or demote admin status for other users</li>
                  <li>Delete comments on any session or daily discussion</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
