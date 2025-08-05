import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Repeat,
  Shuffle,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaSession } from '@/hooks/useMediaSession';

interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

interface MusicPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  duration: number;
  volume: number;
  onVolumeChange: (volume: number) => void;
  queue: Song[];
  onShuffle: () => void;
  className?: string;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime,
  duration,
  volume,
  onVolumeChange,
  queue,
  onShuffle,
  className
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isLiked, setIsLiked] = useState(false);

  // Media Session API for lock screen controls
  useMediaSession({
    currentSong,
    isPlaying,
    onPlay,
    onPause,
    onNext,
    onPrevious,
    onSeek,
    currentTime,
    duration
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(0.7);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  // Always show the player, even without a song

  return (
    <Card className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background-secondary/95 backdrop-blur-lg border-t border-border/50",
      "shadow-glow-secondary",
      className
    )}>
      {currentSong ? (
        // Player with song
        <div className="p-3 md:p-6">
          {/* Mobile Layout - Compact */}
          <div className="md:hidden">
            <div className="flex items-center space-x-3">
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                <img
                  src={currentSong.cover_art_url || '/placeholder.svg'}
                  alt={currentSong.track_name}
                  className="w-12 h-12 rounded-lg object-cover shadow-card"
                />
              </div>
              
              {/* Song Info & Progress */}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <h3 className="font-semibold text-foreground truncate text-sm">
                    {currentSong.track_name}
                  </h3>
                  <p className="text-muted-foreground truncate text-xs">
                    {currentSong.artists_string}
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <Slider
                    value={[currentTime]}
                    max={duration || 1}
                    step={1}
                    onValueChange={(value) => onSeek(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={isPlaying ? onPause : onPlay}
                  className="w-10 h-10 rounded-full bg-gradient-primary text-white shadow-glow-primary hover:shadow-glow-primary/80"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Song Info */}
            <div className="flex items-center space-x-4 w-80">
              <div className="relative">
                <img
                  src={currentSong.cover_art_url || '/placeholder.svg'}
                  alt={currentSong.track_name}
                  className="w-16 h-16 rounded-lg object-cover shadow-card"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {currentSong.track_name}
                </h3>
                <p className="text-muted-foreground truncate text-sm">
                  {currentSong.artists_string}
                </p>
                {currentSong.album_name && (
                  <p className="text-muted-foreground truncate text-xs">
                    {currentSong.album_name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className="text-muted-foreground hover:text-primary"
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-primary text-primary")} />
              </Button>
            </div>

            {/* Center Controls */}
            <div className="flex-1 flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsShuffled(!isShuffled);
                    onShuffle();
                  }}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    isShuffled && "text-primary"
                  )}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrevious}
                  className="text-foreground hover:text-primary"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={isPlaying ? onPause : onPlay}
                  className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary h-12 w-12 rounded-full"
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  className="text-foreground hover:text-primary"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    repeatMode !== 'off' && "text-primary"
                  )}
                >
                  <Repeat className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center space-x-3 w-full max-w-md">
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 1}
                  step={1}
                  onValueChange={(value) => onSeek(value[0])}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-3 w-40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVolumeToggle}
                className="text-muted-foreground hover:text-foreground"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={(value) => {
                  setIsMuted(false);
                  onVolumeChange(value[0]);
                }}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ) : (
        // Empty state when no song is playing
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center space-x-4 text-muted-foreground">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-lg flex items-center justify-center">
              <Play className="h-6 w-6 md:h-8 md:w-8" />
            </div>
            <div className="text-center md:text-left">
              <p className="font-medium text-sm md:text-base">No song playing</p>
              <p className="text-xs md:text-sm">Select a song to start listening</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};