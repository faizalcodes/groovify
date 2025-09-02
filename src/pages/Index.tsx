import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { SongCard } from '@/components/SongCard';
import { LibraryView } from '@/components/LibraryView';
import { PlaylistView } from '@/components/PlaylistView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useAuth } from '@/hooks/useAuth';
import { songifyApi, Song, Playlist } from '@/services/songifyApi';
import { 
  Music, 
  TrendingUp, 
  Disc3, 
  Loader2,
  RefreshCw,
  Shuffle,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'playlist' | 'beatsync'>('home');
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

  // Handle route changes and view updates
  useEffect(() => {
    const handleRouteChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const view = searchParams.get('view') as 'home' | 'search' | 'library' | 'playlist' | 'beatsync' | null;
      
      if (view && ['search', 'library', 'playlist', 'beatsync'].includes(view)) {
        setCurrentView(view);
      } else {
        setCurrentView('home');
      }
    };

    // Set initial view
    handleRouteChange();

    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Handle authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      loadInitialData();
    }
  }, [user, authLoading, navigate]);

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
    let contextSongs: Song[] = [];
    
    // Set the appropriate context based on current view
    if (currentView === 'search') {
      contextSongs = searchResults;
    } else if (currentView === 'playlist') {
      contextSongs = playlistSongs;
    } else {
      contextSongs = songs;
    }
    
    // Set playlist context for proper next/previous behavior
    musicPlayer.setPlaylistContext(contextSongs);
    musicPlayer.playSong(song);
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
      musicPlayer.setPlaylistContext(shuffledSongs);
      musicPlayer.addToQueue(shuffledSongs);
      musicPlayer.shuffleQueue();
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

  const handleBackToLibrary = () => {
    setCurrentView('library');
    setSelectedPlaylist(null);
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

  const renderSearchView = () => (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <h2 className="text-lg md:text-2xl font-bold text-foreground">
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Search Music'}
        </h2>
        {searchResults.length > 0 && (
          <Button
            onClick={handleShufflePlay}
            className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full md:w-auto"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle All
          </Button>
        )}
      </div>

      {isSearching ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <div className="text-center">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Searching for music...</p>
          </div>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2 md:space-y-4">
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
        <div className="text-center py-8 md:py-12">
          <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No songs found</h3>
          <p className="text-sm text-muted-foreground">
            Try searching with different keywords or check your spelling
          </p>
        </div>
      ) : (
        <div className="text-center py-8 md:py-12">
          <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">Start your musical journey</h3>
          <p className="text-sm text-muted-foreground">
            Use the search bar above to find your favorite songs and artists
          </p>
        </div>
      )}
    </div>
  );

  const renderHomeView = () => (
    <div className="w-full min-h-screen overflow-x-hidden">
      <div className="w-full max-w-full px-2 sm:px-3 md:px-6 space-y-3 md:space-y-6">
        {/* Hero Section - Hidden on mobile */}
        <section className="hidden md:block relative overflow-hidden rounded-xl bg-gradient-primary p-4 md:p-8 lg:p-12 text-white shadow-glow-primary mx-1 md:mx-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-6 lg:mb-0">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                  Welcome All Melophiles to Groovify
                </h1>
                <p className="text-base md:text-lg opacity-90 mb-4 md:mb-6">
                  Discover and stream millions of songs from your favorite artists
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <Button
                    size="lg"
                    onClick={handleShufflePlay}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                    disabled={songs.length === 0}
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Shuffle Play
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setCurrentView('search')}
                    className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    <Music className="mr-2 h-4 w-4" />
                    Explore Music
                  </Button>
                  <Link to="/playlists">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm w-full"
                    >
                      <List className="mr-2 h-4 w-4" />
                      Community Playlists
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Music className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Shuffle Button */}
        <section className="md:hidden w-full px-1">
          <Button
            onClick={handleShufflePlay}
            disabled={songs.length === 0}
            className="w-full bg-gradient-primary text-primary-foreground hover:shadow-glow-primary py-3 text-sm font-medium"
          >
            <Shuffle className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">Shuffle All Songs</span>
          </Button>
        </section>

        {/* Stats Cards */}
        <section className="w-full px-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3 md:gap-4">
            <Card className="w-full p-3 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground text-xs">Total Songs</h3>
                  <p className="text-sm font-bold text-primary">{totalSongs.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            
            <Card className="w-full p-3 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Disc3 className="h-4 w-4 text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground text-xs">Playlists</h3>
                  <p className="text-sm font-bold text-secondary">{Object.keys(playlists).length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="w-full p-3 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground text-xs">Current Track</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {musicPlayer.currentSong ? musicPlayer.currentSong.track_name : 'No song playing'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Recent Songs */}
        <section className="w-full px-1">
          <div className="flex items-center justify-between mb-3 md:mb-6">
            <h2 className="text-base md:text-2xl font-bold text-foreground">Recent Songs</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={loadInitialData}
              disabled={isLoading}
              className="text-primary hover:text-primary hover:bg-primary/10 p-2 flex-shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="w-full p-3 md:p-4 bg-card/50 border-border/50">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-3 md:h-4 bg-muted rounded animate-pulse" />
                      <div className="h-2 md:h-3 bg-muted/60 rounded w-3/4 animate-pulse" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2 md:space-y-4">
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
                <div ref={homeSentinelRef} className="flex justify-center py-6 md:py-8">
                  {isLoadingMore && (
                    <div className="flex items-center text-muted-foreground text-sm">
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
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'search':
        return renderSearchView();
      case 'library':
        return (
          <LibraryView
            playlists={playlists}
            onPlaylistSelect={handlePlaylistSelect}
          />
        );
      case 'playlist':
        if (!selectedPlaylist) return renderHomeView();
        return (
          <PlaylistView
            playlist={playlists[selectedPlaylist] || null}
            playlistName={selectedPlaylist}
            songs={playlistSongs}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={playlistHasMore}
            currentSong={musicPlayer.currentSong}
            isPlaying={musicPlayer.isPlaying}
            onBack={handleBackToLibrary}
            onShufflePlay={handleShufflePlay}
            onPlaySong={handlePlaySong}
            onPauseSong={musicPlayer.pause}
            sentinelRef={playlistSentinelRef}
          />
        );
      case 'beatsync':
        // Redirect to /beatsync route
        navigate('/beatsync');
        return null;
      default:
        return renderHomeView();
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={(view) => {
        if (view === 'beatsync') {
          navigate('/beatsync');
        } else {
          setCurrentView(view);
          if (view === 'home') {
            navigate('/');
          } else {
            navigate(`/?view=${view}`);
          }
        }
      }}
      onSearch={handleSearch}
      musicPlayer={musicPlayer}
    >
      {renderCurrentView()}
    </AppLayout>
  );
};

export default Index;