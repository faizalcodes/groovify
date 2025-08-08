import { useState, useEffect } from 'react';
import { usePlaylists, PlaylistSong } from '@/hooks/usePlaylists';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SongCard } from '@/components/SongCard';
import { Play, User, Calendar, Shuffle, Music, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PlaylistsProps {
  onPlaySong: (song: any) => void;
  onPlayPlaylist: (songs: any[]) => void;
  onSetPlaylistContext: (songs: any[]) => void;
  currentSong?: any;
  isPlaying?: boolean;
  onPause: () => void;
}

const Playlists = ({ onPlaySong, onPlayPlaylist, onSetPlaylistContext, currentSong, isPlaying, onPause }: PlaylistsProps) => {
  const { playlists, loading, getPlaylistSongs } = usePlaylists();
  const [playlistSongs, setPlaylistSongs] = useState<{ [key: string]: PlaylistSong[] }>({});
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

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
    // Set playlist context when playing a song from community playlist
    if (selectedPlaylist && playlistSongs[selectedPlaylist]) {
      const songs = playlistSongs[selectedPlaylist].map(s => ({
        song_id: s.song_id,
        track_name: s.track_name,
        artists_string: s.artists_string,
        github_url: s.github_url,
        cover_art_url: s.cover_art_url,
        album_name: s.album_name,
        duration_formatted: s.duration_formatted
      }));
      onSetPlaylistContext(songs);
    }
    onPlaySong(song);
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    setSelectedPlaylist(playlistId);
    setIsLoadingPlaylist(true);
    
    if (!playlistSongs[playlistId]) {
      const { data, error } = await getPlaylistSongs(playlistId);
      if (!error && data) {
        setPlaylistSongs(prev => ({ ...prev, [playlistId]: data }));
      }
    }
    setIsLoadingPlaylist(false);
  };

  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
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

  // Show playlist view if one is selected
  if (selectedPlaylist) {
    const playlist = playlists.find(p => p.id === selectedPlaylist);
    const songs = playlistSongs[selectedPlaylist] || [];
    
    return (
      <div className="container mx-auto p-3 md:p-6">
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPlaylists}
            className="text-muted-foreground hover:text-foreground p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to Playlists</span>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-foreground">{playlist?.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              by {playlist?.profiles?.display_name || 'Unknown'} • {songs.length} songs
            </p>
            {playlist?.description && (
              <p className="text-sm text-muted-foreground mt-1">{playlist.description}</p>
            )}
          </div>
          {songs.length > 0 && (
            <Button
              onClick={() => handleShufflePlaylist(selectedPlaylist)}
              className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full md:w-auto"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle All
            </Button>
          )}
        </div>

        {isLoadingPlaylist ? (
          <div className="space-y-3 md:space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-3 md:p-4 bg-card/50 border-border/50">
                <div className="flex items-center space-x-3 md:space-x-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 md:h-4 bg-muted rounded animate-pulse" />
                    <div className="h-2 md:h-3 bg-muted/60 rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : songs.length > 0 ? (
          <div className="space-y-2 md:space-y-4">
            {songs.map((song) => (
              <SongCard
                key={song.id}
                song={{
                  song_id: song.song_id,
                  track_name: song.track_name,
                  artists_string: song.artists_string,
                  github_url: song.github_url,
                  cover_art_url: song.cover_art_url,
                  album_name: song.album_name,
                  duration_formatted: song.duration_formatted
                }}
                isCurrentSong={currentSong?.song_id === song.song_id}
                isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                onPlay={handlePlaySong}
                onPause={onPause}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12">
            <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No songs found</h3>
            <p className="text-sm text-muted-foreground">This playlist appears to be empty</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Community Playlists</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {playlists.map((playlist) => (
            <Card 
              key={playlist.id} 
              className="p-4 md:p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 cursor-pointer group"
              onClick={() => handleSelectPlaylist(playlist.id)}
            >
              <div className="flex items-start space-x-3 md:space-x-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                  {playlistSongs[playlist.id] && playlistSongs[playlist.id].length > 0 ? (
                    <div className="grid grid-cols-2 gap-0.5 w-full h-full rounded-lg overflow-hidden">
                      {playlistSongs[playlist.id].slice(0, 4).map((song, index) => (
                        song.cover_art_url ? (
                          <img
                            key={song.id}
                            src={song.cover_art_url}
                            alt={song.track_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div key={song.id} className="bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                            <Music className="h-3 w-3 md:h-4 md:w-4 text-primary/60" />
                          </div>
                        )
                      ))}
                      {playlistSongs[playlist.id].length < 4 && 
                        [...Array(4 - playlistSongs[playlist.id].length)].map((_, i) => (
                          <div key={i} className="bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center">
                            <Music className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground/40" />
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <Music className="h-6 w-6 md:h-8 md:w-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm md:text-base">
                    {playlist.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    by {playlist.profiles?.display_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {playlistSongs[playlist.id] ? `${playlistSongs[playlist.id].length} songs` : 'Loading...'} • {formatDate(playlist.created_at)}
                  </p>
                </div>
              </div>
              <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm text-muted-foreground">
                <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="group-hover:text-primary transition-colors">Open playlist</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;