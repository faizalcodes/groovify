import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  List, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertTriangle,
  UserCheck,
  Database
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  raw_user_meta_data?: any;
  user_metadata?: any;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface PlaylistWithProfile extends Playlist {
  profiles?: {
    display_name: string | null;
    email: string | null;
  };
  song_count?: number;
}

const AdminGroovify: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistWithProfile[]>([]);
  const [loading, setLoading] = useState({
    users: false,
    profiles: false,
    playlists: false
  });
  const [showPasswords, setShowPasswords] = useState(true); // Show details by default for admin
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Admin authentication - simple password check
  const ADMIN_PASSWORD = 'admin123groovify'; // Change this to a secure password
  
  const handleAdminAuth = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError(null);
      toast({
        title: "Access Granted",
        description: "Welcome to Groovify Admin Panel",
      });
    } else {
      setError('Invalid admin password');
      toast({
        title: "Access Denied",
        description: "Invalid admin password",
        variant: "destructive"
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminPassword('');
    setUsers([]);
    setProfiles([]);
    setPlaylists([]);
    setError(null);
    setShowPasswords(false);
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin panel",
    });
  };

  // Fetch all users and profiles
  const fetchUsers = async () => {
    if (!isAuthenticated) return;
    
    setLoading(prev => ({ ...prev, users: true }));
    setError(null);
    
    try {
      // Try to fetch from profiles table (should be accessible)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw profilesError;
      }
      
      setProfiles(profilesData || []);
      
      // Try to get additional user data from auth.users (might not work with RLS)
      try {
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers) {
          console.log('Auth users found:', authUsers.length);
          // Map auth users to our User interface
          const mappedUsers: User[] = authUsers.map(user => ({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            raw_user_meta_data: user.raw_user_meta_data,
            user_metadata: user.user_metadata
          }));
          setUsers(mappedUsers);
        } else {
          console.log('Could not fetch auth users (normal for client-side):', authError?.message);
        }
      } catch (authError) {
        console.log('Auth admin access not available (expected in client-side)');
      }
      
      toast({
        title: "Users Loaded",
        description: `Loaded ${profilesData?.length || 0} user profiles`,
      });
      
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(`Failed to fetch users: ${error.message}`);
      toast({
        title: "Error",
        description: `Failed to fetch users: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Fetch all playlists with user information
  const fetchPlaylists = async () => {
    if (!isAuthenticated) return;
    
    setLoading(prev => ({ ...prev, playlists: true }));
    setError(null);
    
    try {
      console.log('Fetching playlists...');
      
      // First, try to get playlists without the join to see if basic access works
      const { data: basicPlaylists, error: basicError } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('Basic playlists error:', basicError);
        throw basicError;
      }

      console.log('Basic playlists found:', basicPlaylists?.length || 0);

      // Now try to get playlists with profile information
      const { data: playlistsWithProfiles, error: joinError } = await supabase
        .from('playlists')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      let finalPlaylists = playlistsWithProfiles || basicPlaylists || [];
      
      if (joinError) {
        console.warn('Join query failed, using basic playlists:', joinError);
        finalPlaylists = basicPlaylists || [];
      }

      console.log('Final playlists data:', finalPlaylists);

      // Get song counts for each playlist
      const playlistsWithCounts = await Promise.all(
        finalPlaylists.map(async (playlist) => {
          try {
            const { count, error: countError } = await supabase
              .from('playlist_songs')
              .select('*', { count: 'exact', head: true })
              .eq('playlist_id', playlist.id);

            if (countError) {
              console.warn(`Could not get count for playlist ${playlist.id}:`, countError);
            }

            return {
              ...playlist,
              song_count: count || 0
            };
          } catch (error) {
            console.warn(`Error getting song count for playlist ${playlist.id}:`, error);
            return {
              ...playlist,
              song_count: 0
            };
          }
        })
      );

      setPlaylists(playlistsWithCounts);
      toast({
        title: "Playlists Loaded",
        description: `Loaded ${playlistsWithCounts.length} playlists`,
      });
      
    } catch (error: any) {
      console.error('Error fetching playlists:', error);
      setError(`Failed to fetch playlists: ${error.message}`);
      toast({
        title: "Error",
        description: `Failed to fetch playlists: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, playlists: false }));
    }
  };

  // Delete playlist
  const deletePlaylist = async (playlistId: string, playlistTitle: string) => {
    if (!isAuthenticated) return;
    
    if (!confirm(`Are you sure you want to delete the playlist "${playlistTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Deleting playlist: ${playlistId}`);
      
      // First delete all songs in the playlist
      const { error: songsError } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId);

      if (songsError) {
        console.warn('Error deleting playlist songs (might be empty):', songsError);
        // Continue anyway as the playlist might be empty
      }

      // Then delete the playlist itself
      const { error: playlistError } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (playlistError) {
        console.error('Error deleting playlist:', playlistError);
        throw playlistError;
      }

      // Update local state
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      
      toast({
        title: "Playlist Deleted",
        description: `Successfully deleted "${playlistTitle}"`,
      });
      
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      toast({
        title: "Error",
        description: `Failed to delete playlist: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Test Supabase connection
  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('Connection test failed:', error);
        toast({
          title: "Connection Test Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('Connection test successful, profiles count:', data);
        toast({
          title: "Connection Test Successful",
          description: `Found ${data} profiles in database`,
        });
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Test Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchPlaylists();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-primary" />
              <span>Admin Access Required</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="adminPassword" className="text-sm font-medium">
                Admin Password
              </label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminAuth()}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button onClick={handleAdminAuth} className="w-full">
              Access Admin Panel
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              This admin panel provides access to user data and playlist management.
              Only authorized administrators should access this area.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Database className="h-8 w-8 text-primary" />
              <span>Groovify Admin Panel</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage users, view profiles, and delete playlists
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="flex items-center space-x-2"
          >
            <UserCheck className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
        
        {/* Debug info */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-sm space-y-1">
            <div><strong>Connection Status:</strong> Connected to Supabase</div>
            <div><strong>Users loaded:</strong> {profiles.length}</div>
            <div><strong>Playlists loaded:</strong> {playlists.length}</div>
            {error && (
              <div className="text-destructive">
                <strong>Last Error:</strong> {error}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            className="mt-2"
          >
            Test Connection
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="users">User Profiles</TabsTrigger>
          <TabsTrigger value="auth">Auth Users</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>User Profiles ({profiles.length})</span>
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Details
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    disabled={loading.users}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading.users ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            {profile.display_name || 'Unnamed User'}
                          </h3>
                          <Badge variant="secondary">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>
                            <strong>User ID:</strong> {showPasswords ? profile.user_id : '***hidden***'}
                          </div>
                          <div>
                            <strong>Email:</strong> {showPasswords ? (profile.email || 'Not provided') : '***hidden***'}
                          </div>
                          <div>
                            <strong>Profile ID:</strong> {showPasswords ? profile.id : '***hidden***'}
                          </div>
                          <div>
                            <strong>Updated:</strong> {new Date(profile.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {profiles.length === 0 && !loading.users && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found
                    </div>
                  )}
                  
                  {loading.users && (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading users...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auth Users Tab */}
        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span>Auth Users ({users.length})</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading.users}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading.users ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {users.length > 0 ? users.map((user) => (
                    <div
                      key={user.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">
                            {user.email || 'No Email'}
                          </h3>
                          <Badge variant="default">
                            {new Date(user.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>
                            <strong>User ID:</strong> {user.id}
                          </div>
                          <div>
                            <strong>Email:</strong> {user.email || 'Not provided'}
                          </div>
                          <div>
                            <strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                          </div>
                          <div>
                            <strong>Metadata:</strong> {user.user_metadata ? JSON.stringify(user.user_metadata).slice(0, 50) + '...' : 'None'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No auth users data available.</p>
                      <p className="text-xs mt-2">This requires admin access to auth.users table.</p>
                    </div>
                  )}
                  
                  {loading.users && (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading auth users...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <List className="h-5 w-5 text-primary" />
                  <span>All Playlists ({playlists.length})</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPlaylists}
                  disabled={loading.playlists}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading.playlists ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium">{playlist.title}</h3>
                            {playlist.description && (
                              <p className="text-sm text-muted-foreground">
                                {playlist.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePlaylist(playlist.id, playlist.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <Badge variant={playlist.is_public ? "default" : "secondary"}>
                            {playlist.is_public ? "Public" : "Private"}
                          </Badge>
                          <span>{playlist.song_count || 0} songs</span>
                          <span>Created {new Date(playlist.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="text-sm">
                          <strong>Owner:</strong> {playlist.profiles?.display_name || 'Unknown User'}
                          {playlist.profiles?.email && (
                            <span className="text-muted-foreground ml-2">
                              ({playlist.profiles.email})
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <strong>Playlist ID:</strong> {playlist.id}
                          <br />
                          <strong>User ID:</strong> {playlist.user_id}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {playlists.length === 0 && !loading.playlists && (
                    <div className="text-center py-8 text-muted-foreground">
                      No playlists found
                    </div>
                  )}
                  
                  {loading.playlists && (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading playlists...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGroovify;
