import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { SongCard } from '@/components/SongCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { songifyApi, Song, Playlist } from '@/services/songifyApi';
import { 
  Music, 
  TrendingUp, 
  Disc3, 
  Play,
  Loader2,
  RefreshCw,
  Shuffle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'playlist'>('home');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Record<string, Playlist>>({});
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const musicPlayer = useMusicPlayer();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [songsData, playlistsData] = await Promise.all([
        songifyApi.getAllSongs(1, 20),
        songifyApi.getPlaylists()
      ]);
      
      setSongs(songsData.songs);
      setPlaylists(playlistsData);
      setHasMore(songsData.pagination.has_next);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load music library');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreSongs = async () => {
    if (!hasMore || isLoading) return;
    
    try {
      const nextPage = currentPage + 1;
      const songsData = await songifyApi.getAllSongs(nextPage, 20);
      
      setSongs(prev => [...prev, ...songsData.songs]);
      setCurrentPage(nextPage);
      setHasMore(songsData.pagination.has_next);
    } catch (error) {
      console.error('Failed to load more songs:', error);
      toast.error('Failed to load more songs');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setCurrentView('home');
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    try {
      setIsSearching(true);
      setSearchQuery(query);
      setCurrentView('search');
      
      const results = await songifyApi.searchSongs(query, 1, 30);
      setSearchResults(results.results);
      
      if (results.results.length === 0) {
        toast.info(`No results found for "${query}"`);
      } else {
        toast.success(`Found ${results.total_results} songs`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    musicPlayer.playSong(song);
    
    // Add current songs to queue if not already added
    const currentSongs = currentView === 'search' ? searchResults : songs;
    const queueSongs = currentSongs.filter(s => !musicPlayer.queue.find(q => q.song_id === s.song_id));
    if (queueSongs.length > 0) {
      musicPlayer.addToQueue(queueSongs);
    }
    
    toast.success(`Now playing: ${song.track_name}`);
  };

  const handleShufflePlay = () => {
    const currentSongs = currentView === 'search' ? searchResults : songs;
    if (currentSongs.length === 0) return;
    
    const shuffled = [...currentSongs].sort(() => Math.random() - 0.5);
    musicPlayer.clearQueue();
    musicPlayer.addToQueue(shuffled);
    musicPlayer.playSong(shuffled[0]);
    
    toast.success('Shuffle mode activated');
  };

  const renderHomeView = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-primary p-8 md:p-12 text-white shadow-glow-primary">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">
                Welcome to Songify
              </h1>
              <p className="text-lg md:text-xl opacity-90 mb-6">
                Discover and stream millions of songs from your favorite artists
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={handleShufflePlay}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                  disabled={songs.length === 0}
                >
                  <Shuffle className="mr-2 h-5 w-5" />
                  Shuffle Play
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setCurrentView('search')}
                  className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                >
                  <Music className="mr-2 h-5 w-5" />
                  Explore Music
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Music className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Music className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Total Songs</h3>
              <p className="text-2xl font-bold text-primary">{songs.length}+</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Disc3 className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Playlists</h3>
              <p className="text-2xl font-bold text-secondary">{Object.keys(playlists).length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Now Playing</h3>
              <p className="text-sm text-muted-foreground truncate">
                {musicPlayer.currentSong ? musicPlayer.currentSong.track_name : 'No song playing'}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Songs */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Songs</h2>
          <Button 
            variant="ghost" 
            onClick={loadInitialData}
            disabled={isLoading}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4 bg-card/50 border-border/50">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted/60 rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {songs.slice(0, 10).map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={musicPlayer.currentSong?.song_id === song.song_id}
                isPlaying={musicPlayer.isPlaying && musicPlayer.currentSong?.song_id === song.song_id}
                onPlay={handlePlaySong}
                onPause={musicPlayer.pause}
              />
            ))}
            
            {hasMore && (
              <div className="text-center pt-6">
                <Button
                  onClick={loadMoreSongs}
                  variant="outline"
                  disabled={isLoading}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Music className="mr-2 h-4 w-4" />
                  )}
                  Load More Songs
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const renderSearchView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Search Music'}
        </h2>
        {searchResults.length > 0 && (
          <Button
            onClick={handleShufflePlay}
            className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle All
          </Button>
        )}
      </div>

      {isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Searching for music...</p>
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-4">
          {searchResults.map((song) => (
            <SongCard
              key={song.song_id}
              song={song}
              isCurrentSong={musicPlayer.currentSong?.song_id === song.song_id}
              isPlaying={musicPlayer.isPlaying && musicPlayer.currentSong?.song_id === song.song_id}
              onPlay={handlePlaySong}
              onPause={musicPlayer.pause}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="text-center py-12">
          <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No songs found</h3>
          <p className="text-muted-foreground">
            Try searching with different keywords or check your spelling
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Start your musical journey</h3>
          <p className="text-muted-foreground">
            Use the search bar above to find your favorite songs and artists
          </p>
        </div>
      )}
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'search':
        return renderSearchView();
      case 'library':
        return (
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Library</h3>
            <p className="text-muted-foreground">Coming soon - manage your favorite songs and playlists</p>
          </div>
        );
      default:
        return renderHomeView();
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      onSearch={handleSearch}
    >
      <div className="p-4 md:p-8">
        {renderCurrentView()}
      </div>
    </AppLayout>
  );
};

export default Index;
