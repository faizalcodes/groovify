import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Playlists from "./pages/Playlists";
import NotFound from "./pages/NotFound";
import { useMusicPlayer } from "./hooks/useMusicPlayer";
import { AppLayout } from "./components/AppLayout";
import BeatSync from "./components/BeatSync";
import { songifyApi } from "./services/songifyApi";

const PlaylistsRoute = () => {
  const musicPlayer = useMusicPlayer();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const handlePlaySong = (song: any) => {
    musicPlayer.playSong(song);
  };

  const handlePlayPlaylist = (songs: any[]) => {
    if (songs.length > 0) {
      musicPlayer.clearQueue();
      musicPlayer.addToQueue(songs);
      musicPlayer.playSong(songs[0]);
    }
  };

  const handleSetPlaylistContext = (songs: any[]) => {
    musicPlayer.setPlaylistContext(songs);
  };

  return (
    <AppLayout
      currentView={(window.location.pathname.replace('/', '') || 'library') as 'search' | 'library' | 'home' | 'playlist' | 'beatsync'}
      onNavigate={(view) => navigate(`/${view}`)}
      onSearch={setSearchQuery}
      musicPlayer={musicPlayer}
    >
      <Playlists 
        onPlaySong={handlePlaySong} 
        onPlayPlaylist={handlePlayPlaylist} 
        onSetPlaylistContext={handleSetPlaylistContext}
        currentSong={musicPlayer.currentSong}
        isPlaying={musicPlayer.isPlaying}
        onPause={musicPlayer.pause}
      />
    </AppLayout>
  );
};

const BeatSyncRoute = () => {
  const musicPlayer = useMusicPlayer();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [playlists, setPlaylists] = useState({});
  
  // Load playlists when component mounts
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const playlistsData = await songifyApi.getPlaylists();
        setPlaylists(playlistsData);
      } catch (error) {
        console.error('Failed to load playlists:', error);
      }
    };
    
    loadPlaylists();
  }, []);

  return (
    <AppLayout
      currentView="beatsync"
      onNavigate={(view) => navigate(`/${view}`)}
      onSearch={setSearchQuery}
      musicPlayer={musicPlayer}
    >
      <BeatSync
        currentSong={musicPlayer.currentSong}
        queue={musicPlayer.queue}
        onPlaySong={musicPlayer.playSong}
        onPause={musicPlayer.pause}
        onNext={musicPlayer.next}
        onSeek={musicPlayer.seek}
        isPlaying={musicPlayer.isPlaying}
        playlists={playlists}
      />
    </AppLayout>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/library" element={<Navigate to="/" replace />} />
          <Route path="/search" element={<Navigate to="/" replace />} />
          <Route path="/beatsync" element={<BeatSyncRoute />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/playlists" element={<PlaylistsRoute />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
