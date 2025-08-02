import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { SongCard } from '@/components/SongCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { songifyApi, Song, Playlist } from '@/services/songifyApi';
import { 
  Music, 
  TrendingUp, 
  Disc3, 
  Play,
  Loader2,
  RefreshCw,
  Shuffle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'playlist'>('home');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Record<string, Playlist>>({});
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [totalSongs, setTotalSongs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [playlistPage, setPlaylistPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [playlistHasMore, setPlaylistHasMore] = useState(true);
  
  const musicPlayer = useMusicPlayer();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [songsData, playlistsData] = await Promise.all([
        songifyApi.getAllSongs(1, 30),
        songifyApi.getPlaylists()
      ]);
      
      setSongs(songsData.songs);
      setTotalSongs(songsData.total_songs);
      setPlaylists(playlistsData);
      setHasMore(songsData.pagination.has_next);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load music library');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreSongs = async () => {
    if (!hasMore || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const songsData = await songifyApi.getAllSongs(nextPage, 30);
      
      setSongs(prev => [...prev, ...songsData.songs]);
      setCurrentPage(nextPage);
      setHasMore(songsData.pagination.has_next);
    } catch (error) {
      console.error('Failed to load more songs:', error);
      toast.error('Failed to load more songs');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadPlaylistSongs = async (playlistName: string, page: number = 1) => {
    try {
      const isFirstLoad = page === 1;
      if (isFirstLoad) {
        setIsLoading(true);
        setPlaylistSongs([]);
      } else {
        setIsLoadingMore(true);
      }
      
      const playlistData = await songifyApi.getPlaylistSongs(playlistName, page, 30);
      
      if (isFirstLoad) {
        setPlaylistSongs(playlistData.songs);
        setPlaylistPage(1);
      } else {
        setPlaylistSongs(prev => [...prev, ...playlistData.songs]);
        setPlaylistPage(page);
      }
      
      setPlaylistHasMore(playlistData.pagination.has_next);
    } catch (error) {
      console.error('Failed to load playlist songs:', error);
      toast.error('Failed to load playlist songs');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePlaylistSongs = async () => {
    if (!playlistHasMore || isLoadingMore || !selectedPlaylist) return;
    await loadPlaylistSongs(selectedPlaylist, playlistPage + 1);
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

  const handleShufflePlay = async () => {
    try {
      let shuffledSongs: Song[] = [];
      
      if (currentView === 'home') {
        // Get random songs from all songs
        const randomPage = Math.floor(Math.random() * Math.ceil(totalSongs / 30)) + 1;
        const response = await songifyApi.getAllSongs(randomPage, 30);
        shuffledSongs = response.songs.sort(() => Math.random() - 0.5);
      } else if (currentView === 'search') {
        // Shuffle search results (keep existing behavior)
        if (searchResults.length === 0) return;
        shuffledSongs = [...searchResults].sort(() => Math.random() - 0.5);
      } else if (currentView === 'playlist' && selectedPlaylist) {
        // Get random songs from the selected playlist
        const playlist = playlists[selectedPlaylist];
        if (!playlist) return;
        
        const totalPlaylistSongs = playlist.unique_song_count;
        const randomPage = Math.floor(Math.random() * Math.ceil(totalPlaylistSongs / 30)) + 1;
        const response = await songifyApi.getPlaylistSongs(selectedPlaylist, randomPage, 30);
        shuffledSongs = response.songs.sort(() => Math.random() - 0.5);
      }
      
      if (shuffledSongs.length === 0) return;
      
      musicPlayer.clearQueue();
      musicPlayer.addToQueue(shuffledSongs);
      musicPlayer.playSong(shuffledSongs[0]);
      
      toast.success('Shuffle mode activated');
    } catch (error) {
      console.error('Error shuffling songs:', error);
      toast.error('Failed to shuffle songs');
    }
  };

  const handlePlaylistSelect = (playlistName: string) => {
    setSelectedPlaylist(playlistName);
    setCurrentView('playlist');
    loadPlaylistSongs(playlistName);
  };

  const { sentinelRef: homeSentinelRef } = useInfiniteScroll({
    onLoadMore: loadMoreSongs,
    hasMore,
    threshold: 5,
    isLoading: isLoadingMore
  });

  const { sentinelRef: playlistSentinelRef } = useInfiniteScroll({
    onLoadMore: loadMorePlaylistSongs,
    hasMore: playlistHasMore,
    threshold: 5,
    isLoading: isLoadingMore
  });

  const renderLibraryView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Your Playlists</h2>
      
      {Object.keys(playlists).length === 0 ? (
        <div className="text-center py-12">
          <Disc3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No playlists found</h3>
          <p className="text-muted-foreground">Playlists will appear here when available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(playlists).map(([name, playlist]) => (
            <Card 
              key={name} 
              className="p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 cursor-pointer group"
              onClick={() => handlePlaylistSelect(name)}
            >
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Disc3 className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {playlist.unique_song_count} songs
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {playlist.successful_downloads} downloads
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <Play className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="group-hover:text-primary transition-colors">Play playlist</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderPlaylistView = () => {
    if (!selectedPlaylist) return renderLibraryView();
    
    const playlist = playlists[selectedPlaylist];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('library')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Playlists
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{selectedPlaylist}</h2>
            <p className="text-muted-foreground mt-1">
              {playlist?.unique_song_count || 0} songs
            </p>
          </div>
          {playlistSongs.length > 0 && (
            <Button
              onClick={handleShufflePlay}
              className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle All
            </Button>
          )}
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
        ) : playlistSongs.length > 0 ? (
          <div className="space-y-4">
            {playlistSongs.map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={musicPlayer.currentSong?.song_id === song.song_id}
                isPlaying={musicPlayer.isPlaying && musicPlayer.currentSong?.song_id === song.song_id}
                onPlay={handlePlaySong}
                onPause={musicPlayer.pause}
              />
            ))}
            
            {/* Infinite scroll sentinel for playlist */}
            {playlistHasMore && (
              <div ref={playlistSentinelRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more songs...
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Music className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No songs found</h3>
            <p className="text-muted-foreground">This playlist appears to be empty</p>
          </div>
        )}
      </div>
    );
  };

  const renderHomeView = () => (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-primary p-6 md:p-12 text-white shadow-glow-primary">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-3 md:mb-4">
                Welcome to Songify
              </h1>
              <p className="text-base md:text-lg lg:text-xl opacity-90 mb-4 md:mb-6">
                Discover and stream millions of songs from your favorite artists
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button
                  size="lg"
                  onClick={handleShufflePlay}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm w-full sm:w-auto"
                  disabled={songs.length === 0}
                >
                  <Shuffle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Shuffle Play
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setCurrentView('search')}
                  className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm w-full sm:w-auto"
                >
                  <Music className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  Explore Music
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Music className="h-12 w-12 lg:h-16 lg:w-16 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="p-4 md:p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Music className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm md:text-base">Total Songs</h3>
              <p className="text-xl md:text-2xl font-bold text-primary">{totalSongs.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 md:p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
              <Disc3 className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm md:text-base">Playlists</h3>
              <p className="text-xl md:text-2xl font-bold text-secondary">{Object.keys(playlists).length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 md:p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm md:text-base">Now Playing</h3>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {musicPlayer.currentSong ? musicPlayer.currentSong.track_name : 'No song playing'}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Songs */}
      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Recent Songs</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={loadInitialData}
            disabled={isLoading}
            className="text-primary hover:text-primary hover:bg-primary/10"
          >
            <RefreshCw className={cn("mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
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
            {songs.map((song, index) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={musicPlayer.currentSong?.song_id === song.song_id}
                isPlaying={musicPlayer.isPlaying && musicPlayer.currentSong?.song_id === song.song_id}
                onPlay={handlePlaySong}
                onPause={musicPlayer.pause}
              />
            ))}
            
            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={homeSentinelRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading more songs...
                  </div>
                )}
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
        return renderLibraryView();
      case 'playlist':
        return renderPlaylistView();
      default:
        return renderHomeView();
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      onSearch={handleSearch}
      musicPlayer={musicPlayer}
    >
      <div className="p-4 md:p-8">
        {renderCurrentView()}
      </div>
    </AppLayout>
  );
};

export default Index;
