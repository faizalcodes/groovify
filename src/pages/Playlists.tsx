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
  onSetPlaylistContext: (songs: any[]) => void;
}

const Playlists = ({ onPlaySong, onPlayPlaylist, onSetPlaylistContext }: PlaylistsProps) => {
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
      onSetPlaylistContext(formattedSongs);
      onPlayPlaylist(formattedSongs);
      toast.success('Playing playlist!');
    }
  };

  const handlePlaySong = (song: PlaylistSong, playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      const formattedSongs = songs.map(s => ({
        song_id: s.song_id,
        track_name: s.track_name,
        artists_string: s.artists_string,
        github_url: s.github_url
      }));
      onSetPlaylistContext(formattedSongs);
    }
    
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
            <Card key={playlist.id} className="cursor-pointer hover:shadow-md transition-shadow bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 group">
              <CardHeader onClick={() => handlePlaylistClick(playlist.id)} className="p-4 md:p-6">
                <div className="flex items-start space-x-3 md:space-x-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Play className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center justify-between text-sm md:text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {playlist.title}
                      <Badge variant="secondary" className="ml-2">Public</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm text-muted-foreground mt-1">
                      {playlist.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs md:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 md:h-4 md:w-4" />
                    {playlist.profiles?.display_name || 'Unknown User'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                    {formatDate(playlist.created_at)}
                  </div>
                </div>
                <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm text-muted-foreground">
                  <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="group-hover:text-primary transition-colors">View playlist</span>
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
                                onClick={() => handlePlaySong(song, playlist.id)}
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