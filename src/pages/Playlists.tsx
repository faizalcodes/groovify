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
import PlaylistDialog from '@/components/PlaylistDialog';
import { useAuth } from '@/hooks/useAuth';

interface PlaylistsProps {
  onPlaySong: (song: any) => void;
  onPlayPlaylist: (songs: any[]) => void;
  onSetPlaylistContext: (songs: any[]) => void;
  currentSong?: any;
  isPlaying?: boolean;
  onPause: () => void;
}

const Playlists = ({ onPlaySong, onPlayPlaylist, onSetPlaylistContext, currentSong, isPlaying, onPause }: PlaylistsProps) => {
  const { playlists, loading, getPlaylistSongs, removeSongFromPlaylist } = usePlaylists();
  const { user } = useAuth();
  const [playlistSongs, setPlaylistSongs] = useState<{ [key: string]: PlaylistSong[] }>({});
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

  // Load songs for the selected playlist when needed
  useEffect(() => {
    let isMounted = true;

    const loadPlaylistSongs = async () => {
      if (selectedPlaylist && !playlistSongs[selectedPlaylist]) {
        setIsLoadingPlaylist(true);
        const { data, error } = await getPlaylistSongs(selectedPlaylist);
        if (isMounted) {
          if (!error && data) {
            setPlaylistSongs(prev => ({ ...prev, [selectedPlaylist]: data }));
          }
          setIsLoadingPlaylist(false);
        }
      }
    };

    loadPlaylistSongs();

    return () => {
      isMounted = false;
    };
  }, [selectedPlaylist, playlistSongs]);

  const formatSongForPlayer = (song: PlaylistSong) => ({
    song_id: song.song_id,
    track_name: song.track_name,
    artists_string: song.artists_string,
    github_url: song.github_url,
    cover_art_url: song.cover_art_url,
    album_name: song.album_name,
    duration_formatted: song.duration_formatted
  });

  const handlePlayPlaylist = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      const formattedSongs = songs.map(formatSongForPlayer);
      onSetPlaylistContext(formattedSongs);
      onPlayPlaylist(formattedSongs);
      toast.success('Playing playlist!');
    }
  };

  const handlePlaySong = (song: PlaylistSong) => {
    // Set playlist context when playing a song from community playlist
    if (selectedPlaylist && playlistSongs[selectedPlaylist]) {
      const songs = playlistSongs[selectedPlaylist].map(formatSongForPlayer);
      onSetPlaylistContext(songs);
    }
    onPlaySong(formatSongForPlayer(song));
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    try {
      setSelectedPlaylist(playlistId);
      setIsLoadingPlaylist(true);
      
      if (!playlistSongs[playlistId]) {
        const { data, error } = await getPlaylistSongs(playlistId);
        if (!error && data) {
          setPlaylistSongs(prev => ({ ...prev, [playlistId]: data }));
        }
      }
    } finally {
      setIsLoadingPlaylist(false);
    }
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
      const formattedSongs = songs.map(formatSongForPlayer);
      
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

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="w-48 h-48 md:w-64 md:h-64 bg-gradient-primary rounded-lg overflow-hidden shadow-lg relative group">
            {songs.length > 0 && songs[0].cover_art_url ? (
              <>
                <img
                  src={songs[0].cover_art_url}
                  alt={playlist?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="h-16 w-16 text-white/80" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <p className="uppercase tracking-wider text-xs font-medium text-primary mb-1">Playlist</p>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-2">{playlist?.title}</h2>
            {playlist?.description && (
              <p className="text-base text-muted-foreground mt-1 mb-3">{playlist.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <User className="h-4 w-4" />
              <span>{playlist?.profiles?.[0]?.display_name || 'Unknown'}</span>
              <span>•</span>
              <Calendar className="h-4 w-4" />
              <span>{formatDate(playlist?.created_at || '')}</span>
              <span>•</span>
              <Music className="h-4 w-4" />
              <span>{songs.length} songs</span>
            </div>
            
            <div className="flex gap-3">
              {songs.length > 0 && (
                <>
                  <Button
                    onClick={() => handlePlayPlaylist(selectedPlaylist)}
                    size="lg"
                    className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Play All
                  </Button>
                  <Button
                    onClick={() => handleShufflePlaylist(selectedPlaylist)}
                    size="lg"
                    variant="outline"
                    className="border-primary/20 hover:border-primary"
                  >
                    <Shuffle className="mr-2 h-5 w-5" />
                    Shuffle
                  </Button>
                </>
              )}
            </div>
          </div>
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
                hidePlaylistButton={true}
                isPlaylistOwner={playlist?.user_id === user?.id}
                onRemoveFromPlaylist={async () => {
                  const { error } = await removeSongFromPlaylist(selectedPlaylist, song.song_id);
                  if (error) {
                    toast.error("Failed to remove song");
                  } else {
                    const { data } = await getPlaylistSongs(selectedPlaylist);
                    if (data) {
                      setPlaylistSongs(prev => ({ ...prev, [selectedPlaylist]: data }));
                    }
                    toast.success("Song removed from playlist");
                  }
                }}
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
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Community Playlists</h1>
          <p className="text-muted-foreground">
            Discover playlists created by the community
          </p>
        </div>
        <PlaylistDialog variant="create" />
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
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden relative group-hover:ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300">
                  <Music className="h-6 w-6 md:h-8 md:w-8 text-white absolute inset-0 m-auto z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity z-[5]" />
                  <div className="w-full h-full">
                    <img
                      src={playlistSongs[playlist.id]?.[0]?.cover_art_url || '/placeholder.svg'}
                      alt={playlist.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm md:text-base">
                    {playlist.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    by {playlist.profiles?.[0]?.display_name || 'Unknown'}
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