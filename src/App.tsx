import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Playlists from "./pages/Playlists";
import NotFound from "./pages/NotFound";
import { useMusicPlayer } from "./hooks/useMusicPlayer";

const PlaylistsRoute = () => {
  const musicPlayer = useMusicPlayer();
  
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

  return <Playlists 
    onPlaySong={handlePlaySong} 
    onPlayPlaylist={handlePlayPlaylist} 
    onSetPlaylistContext={handleSetPlaylistContext}
  />;
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
