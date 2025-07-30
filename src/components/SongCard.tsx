import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, MoreHorizontal, Clock } from 'lucide-react';
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

interface SongCardProps {
  song: Song;
  isPlaying?: boolean;
  isCurrentSong?: boolean;
  onPlay: (song: Song) => void;
  onPause: () => void;
  className?: string;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isPlaying = false,
  isCurrentSong = false,
  onPlay,
  onPause,
  className
}) => {
  const handlePlayClick = () => {
    if (isCurrentSong && isPlaying) {
      onPause();
    } else {
      onPlay(song);
    }
  };

  return (
    <Card className={cn(
      "group p-4 bg-card/50 hover:bg-card transition-all duration-300 cursor-pointer",
      "border border-border/50 hover:border-primary/20 hover:shadow-card",
      isCurrentSong && "bg-accent border-primary/40 shadow-primary",
      className
    )}>
      <div className="flex items-center space-x-4">
        {/* Album Art & Play Button */}
        <div className="relative">
          <img
            src={song.cover_art_url || '/placeholder.svg'}
            alt={song.track_name}
            className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover shadow-card"
          />
          
          {/* Play/Pause Overlay */}
          <div className={cn(
            "absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isCurrentSong && isPlaying && "opacity-100"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayClick}
              className="text-white hover:text-primary hover:bg-transparent p-1"
            >
              {isCurrentSong && isPlaying ? (
                <Pause className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <Play className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>

          {/* Playing Indicator */}
          {isCurrentSong && isPlaying && (
            <div className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-gradient-primary rounded-full animate-pulse shadow-glow-primary" />
            </div>
          )}
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0" onClick={handlePlayClick}>
          <h3 className={cn(
            "font-semibold truncate text-sm md:text-base transition-colors",
            isCurrentSong ? "text-primary" : "text-foreground group-hover:text-primary"
          )}>
            {song.track_name}
          </h3>
          <p className="text-muted-foreground truncate text-xs md:text-sm">
            {song.artists_string}
          </p>
          {song.album_name && (
            <p className="text-muted-foreground truncate text-xs hidden md:block">
              {song.album_name}
            </p>
          )}
        </div>

        {/* Duration & Actions */}
        <div className="flex items-center space-x-2 text-muted-foreground">
          {song.duration_formatted && (
            <div className="hidden md:flex items-center space-x-1 text-xs">
              <Clock className="h-3 w-3" />
              <span>{song.duration_formatted}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Duration */}
      {song.duration_formatted && (
        <div className="flex md:hidden justify-end mt-2">
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{song.duration_formatted}</span>
          </div>
        </div>
      )}
    </Card>
  );
};