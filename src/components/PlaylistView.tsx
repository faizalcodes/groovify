import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SongCard } from '@/components/SongCard';
import { ArrowLeft, Shuffle, Music, Loader2 } from 'lucide-react';
import { Song, Playlist } from '@/services/songifyApi';

interface PlaylistViewProps {
  playlist: Playlist | null;
  playlistName: string;
  songs: Song[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentSong?: Song | null;
  isPlaying: boolean;
  onBack: () => void;
  onShufflePlay: () => void;
  onPlaySong: (song: Song) => void;
  onPauseSong: () => void;
  sentinelRef?: React.RefObject<HTMLDivElement>;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  playlistName,
  songs,
  isLoading,
  isLoadingMore,
  hasMore,
  currentSong,
  isPlaying,
  onBack,
  onShufflePlay,
  onPlaySong,
  onPauseSong,
  sentinelRef
}) => {
  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Back button */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground p-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back to Playlists</span>
        </Button>
      </div>

      {/* Playlist header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-foreground">{playlistName}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {playlist?.unique_song_count || 0} songs
          </p>
        </div>
        {songs.length > 0 && (
          <Button
            onClick={onShufflePlay}
            className="bg-gradient-primary text-primary-foreground hover:shadow-glow-primary w-full md:w-auto"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Shuffle All
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <PlaylistSkeleton />
      ) : songs.length > 0 ? (
        <div className="space-y-2 md:space-y-4">
          {/* Songs list */}
          {songs.map((song) => (
            <SongCard
              key={song.song_id}
              song={song}
              isCurrentSong={currentSong?.song_id === song.song_id}
              isPlaying={isPlaying && currentSong?.song_id === song.song_id}
              onPlay={onPlaySong}
              onPause={onPauseSong}
            />
          ))}
          
          {/* Infinite scroll sentinel */}
          {hasMore && sentinelRef && (
            <div ref={sentinelRef} className="flex justify-center py-6 md:py-8">
              {isLoadingMore && (
                <div className="flex items-center text-muted-foreground text-sm">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more songs...
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <PlaylistEmptyState />
      )}
    </div>
  );
};

const PlaylistSkeleton: React.FC = () => (
  <div className="space-y-3 md:space-y-4">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="p-3 md:p-4 bg-card/50 border-border/50">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-muted rounded-lg animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 md:h-4 bg-muted rounded animate-pulse" />
            <div className="h-2 md:h-3 bg-muted/60 rounded w-3/4 animate-pulse" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const PlaylistEmptyState: React.FC = () => (
  <div className="text-center py-8 md:py-12">
    <Music className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
    <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No songs found</h3>
    <p className="text-sm text-muted-foreground">This playlist appears to be empty</p>
  </div>
);