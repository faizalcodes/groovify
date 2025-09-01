import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SearchBar } from '@/components/SearchBar';
import { MusicPlayer } from '@/components/MusicPlayer';
import { useAuth } from '@/hooks/useAuth';
import PlaylistDialog from '@/components/PlaylistDialog';
import { 
  Home, 
  Search, 
  Library, 
  Menu,
  X,
  Music,
  Disc3,
  Heart,
  Clock,
  TrendingUp,
  User,
  LogOut,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

interface MusicPlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  currentIndex: number;
  playSong: (song: Song) => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (songs: Song[]) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
}

interface AppLayoutProps {
  children: React.ReactNode;
  currentView: 'home' | 'search' | 'library' | 'playlist';
  onNavigate: (view: 'home' | 'search' | 'library' | 'playlist') => void;
  onSearch: (query: string) => void;
  musicPlayer: MusicPlayerState;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentView,
  onNavigate,
  onSearch,
  musicPlayer
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
  ];

  const libraryItems = [
    { id: 'liked', label: 'Liked Songs', icon: Heart, count: 0 },
    { id: 'recent', label: 'Recently Played', icon: Clock, count: 0 },
    { id: 'trending', label: 'Trending', icon: TrendingUp, count: 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Mobile Header */}
      <header className="md:hidden bg-background-secondary/95 backdrop-blur-lg border-b border-border/50 p-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="text-foreground p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/src/components/images/groovify.jpeg" alt="Groovify" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Groovify
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden md:flex flex-col w-72 lg:w-80 bg-background-secondary border-r border-border/50 min-h-screen"
        )}>
          <div className="p-6">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow-primary overflow-hidden">
                <img src="/src/components/images/groovify.jpeg" alt="Groovify" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-bold text-2xl bg-gradient-primary bg-clip-text text-transparent">
                Groovify
              </h1>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
              <SearchBar
                onSearch={onSearch}
                placeholder="Search music..."
                className="w-full"
              />
            </div>

            {/* Navigation */}
            <nav className="space-y-2 mb-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.id}
                    to={item.id === 'home' ? '/' : `/?view=${item.id}`}
                    className="block"
                  >
                    <Button
                      variant="ghost"
                      onClick={() => onNavigate(item.id as any)}
                      className={cn(
                        "w-full justify-start text-left font-medium transition-all duration-200",
                        currentView === item.id
                          ? "bg-accent text-primary shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* User Actions */}
            <div className="border-t border-border/30 pt-6 mb-8">
              <div className="space-y-2">
                <PlaylistDialog variant="create" />
                <Link to="/playlists" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <List className="mr-3 h-4 w-4" />
                    Community Playlists
                  </Button>
                </Link>
              </div>
            </div>

            {/* User Profile */}
            {user && (
              <div className="border-t border-border/30 pt-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <Card className="relative w-72 sm:w-80 h-full bg-background-secondary border-r border-border/50 overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden">
                      <img src="/src/components/images/groovify.jpeg" alt="Groovify" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="font-bold text-xl bg-gradient-primary bg-clip-text text-transparent">
                      Groovify
                    </h1>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Navigation */}
                <nav className="space-y-2 mb-8">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        onClick={() => {
                          onNavigate(item.id as any);
                          setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full justify-start text-left font-medium transition-all duration-200",
                          currentView === item.id
                            ? "bg-accent text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>

                {/* Playlists Section */}
                <div className="border-t border-border/30 pt-6 mb-8">
                  <div className="space-y-2">
                    <PlaylistDialog variant="create" />
                    <Link 
                      to="/playlists" 
                      onClick={() => setIsSidebarOpen(false)}
                      className="block"
                    >
                      <Button variant="ghost" className="w-full justify-start">
                        <List className="mr-3 h-4 w-4" />
                        Community Playlists
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Library Section */}
                <div className="border-t border-border/30 pt-6">
                  <h3 className="font-semibold text-foreground mb-4 px-3">Your Library</h3>
                  <div className="space-y-2">
                    {libraryItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="w-full justify-between text-left font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <div className="flex items-center">
                            <Icon className="mr-3 h-4 w-4" />
                            {item.label}
                          </div>
                          {item.count > 0 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded-full">
                              {item.count}
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen pb-32 md:pb-24 overflow-x-hidden">
          {/* Search Bar for Mobile */}
          <div className="md:hidden p-2 sm:p-3 border-b border-border/30 max-w-full">
            <div className="w-full max-w-full">
              <SearchBar
                onSearch={onSearch}
                placeholder="Search music..."
                className="w-full max-w-full"
              />
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Music Player */}
        <MusicPlayer
          currentSong={musicPlayer.currentSong}
          isPlaying={musicPlayer.isPlaying}
          onPlay={musicPlayer.play}
          onPause={musicPlayer.pause}
          onNext={musicPlayer.next}
          onPrevious={musicPlayer.previous}
          onSeek={musicPlayer.seek}
          currentTime={musicPlayer.currentTime}
          duration={musicPlayer.duration}
          volume={musicPlayer.volume}
          onVolumeChange={musicPlayer.setVolume}
          queue={musicPlayer.queue}
          onShuffle={musicPlayer.shuffleQueue}
        />
    </div>
  );
};