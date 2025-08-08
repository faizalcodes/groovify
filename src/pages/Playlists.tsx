import { useState, useEffect } from 'react';
import { usePlaylists, PlaylistSong } from '@/hooks/usePlaylists';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, User, Calendar, Shuffle, Music } from 'lucide-react';
import { toast } from 'sonner';

interface PlaylistsProps {
  onPlaySong: (song: any) => void;
  onPlayPlaylist: (songs: any[]) => void;
  onSetPlaylistContext: (songs: any[]) => void;
}

const Playlists = ({ onPlaySong, onPlayPlaylist, onSetPlaylistContext }: PlaylistsProps) => {
  const { playlists, loading, getPlaylistSongs } = usePlaylists();
  const [playlistSongs, setPlaylistSongs] = useState<{ [key: string]: PlaylistSong[] }>({});

  // Load songs for all playlists automatically
  useEffect(() => {
    const loadAllPlaylistSongs = async () => {
      for (const playlist of playlists) {
        if (!playlistSongs[playlist.id]) {
          const { data, error } = await getPlaylistSongs(playlist.id);
          if (!error && data) {
            setPlaylistSongs(prev => ({ ...prev, [playlist.id]: data }));
          }
        }
      }
    };

    if (playlists.length > 0) {
      loadAllPlaylistSongs();
    }
  }, [playlists, getPlaylistSongs]);

  const handlePlayPlaylist = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      const formattedSongs = songs.map(song => ({
        song_id: song.song_id,
        track_name: song.track_name,
        artists_string: song.artists_string,
        github_url: song.github_url
      }));
      onSetPlaylistContext(formattedSongs);
      onPlayPlaylist(formattedSongs);
      toast.success('Playing playlist!');
    }
  };

  const handlePlaySong = (song: any) => {
    onPlaySong(song);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const handleShufflePlaylist = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      const formattedSongs = songs.map(song => ({
        song_id: song.song_id,
        track_name: song.track_name,
        artists_string: song.artists_string,
        github_url: song.github_url
      }));
      
      // Shuffle the songs
      const shuffled = [...formattedSongs].sort(() => Math.random() - 0.5);
      onSetPlaylistContext(shuffled);
      onPlayPlaylist(shuffled);
      toast.success('Shuffling playlist!');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Public Playlists</h1>
        <p className="text-muted-foreground">
          Discover playlists created by the community
        </p>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">No public playlists yet</p>
          <p className="text-sm text-muted-foreground">
            Be the first to create a playlist and share your music taste!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
              <div className="relative aspect-square bg-gradient-to-br from-primary/20 to-primary/5">
                {playlistSongs[playlist.id] && playlistSongs[playlist.id].length > 0 ? (
                  <div className="grid grid-cols-2 h-full">
                    {playlistSongs[playlist.id].slice(0, 4).map((song, index) => (
                      <div key={song.id} className="bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <Music className="h-8 w-8 text-primary/60" />
                      </div>
                    ))}
                    {playlistSongs[playlist.id].length < 4 && 
                      [...Array(4 - playlistSongs[playlist.id].length)].map((_, i) => (
                        <div key={i} className="bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center">
                          <Music className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Music className="h-16 w-16 text-muted-foreground/40" />
                  </div>
                )}
                
                {/* Play controls overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const songs = playlistSongs[playlist.id];
                      if (songs && songs.length > 0) {
                        const formattedSongs = songs.map(song => ({
                          song_id: song.song_id,
                          track_name: song.track_name,
                          artists_string: song.artists_string,
                          github_url: song.github_url
                        }));
                        onSetPlaylistContext(formattedSongs);
                        onPlayPlaylist(formattedSongs);
                      }
                    }}
                    className="h-12 w-12 rounded-full p-0"
                    disabled={!playlistSongs[playlist.id] || playlistSongs[playlist.id].length === 0}
                  >
                    <Play className="h-6 w-6" />
                  </Button>
                  {playlistSongs[playlist.id] && playlistSongs[playlist.id].length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShufflePlaylist(playlist.id)}
                      className="h-12 w-12 rounded-full p-0"
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg truncate">{playlist.title}</CardTitle>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    by {playlist.profiles?.display_name || 'Unknown'}
                  </p>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{playlist.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {playlistSongs[playlist.id] ? `${playlistSongs[playlist.id].length} songs` : 'Loading...'} • {formatDate(playlist.created_at)}
                  </p>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;