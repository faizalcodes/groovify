import { useState, useEffect } from 'react';
import { usePlaylists, PlaylistSong } from '@/hooks/usePlaylists';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface PlaylistsProps {
  onPlaySong: (song: any) => void;
  onPlayPlaylist: (songs: any[]) => void;
}

const Playlists = ({ onPlaySong, onPlayPlaylist }: PlaylistsProps) => {
  const { playlists, loading, getPlaylistSongs } = usePlaylists();
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<{ [key: string]: PlaylistSong[] }>({});
  const [loadingSongs, setLoadingSongs] = useState<string | null>(null);

  const handlePlaylistClick = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) {
      setExpandedPlaylist(null);
      return;
    }

    if (!playlistSongs[playlistId]) {
      setLoadingSongs(playlistId);
      const { data, error } = await getPlaylistSongs(playlistId);
      
      if (error) {
        toast.error('Error loading playlist songs');
        setLoadingSongs(null);
        return;
      }

      setPlaylistSongs(prev => ({ ...prev, [playlistId]: data }));
      setLoadingSongs(null);
    }

    setExpandedPlaylist(playlistId);
  };

  const handlePlayPlaylist = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      const formattedSongs = songs.map(song => ({
        song_id: song.song_id,
        track_name: song.track_name,
        artists_string: song.artists_string,
        github_url: song.github_url
      }));
      onPlayPlaylist(formattedSongs);
      toast.success('Playing playlist!');
    }
  };

  const handlePlaySong = (song: PlaylistSong) => {
    const formattedSong = {
      song_id: song.song_id,
      track_name: song.track_name,
      artists_string: song.artists_string,
      github_url: song.github_url
    };
    onPlaySong(formattedSong);
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
            <Card key={playlist.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader onClick={() => handlePlaylistClick(playlist.id)}>
                <CardTitle className="flex items-center justify-between">
                  {playlist.title}
                  <Badge variant="secondary">Public</Badge>
                </CardTitle>
                <CardDescription>
                  {playlist.description || 'No description'}
                </CardDescription>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {playlist.profiles?.display_name || 'Unknown User'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(playlist.created_at)}
                  </div>
                </div>
              </CardHeader>

              {expandedPlaylist === playlist.id && (
                <CardContent>
                  {loadingSongs === playlist.id ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {playlistSongs[playlist.id]?.length > 0 && (
                        <div className="mb-4">
                          <Button 
                            onClick={() => handlePlayPlaylist(playlist.id)}
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Play All ({playlistSongs[playlist.id].length} songs)
                          </Button>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {playlistSongs[playlist.id]?.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            This playlist is empty
                          </p>
                        ) : (
                          playlistSongs[playlist.id]?.map((song, index) => (
                            <div
                              key={song.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{song.track_name}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {song.artists_string}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePlaySong(song)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;