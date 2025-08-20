import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Disc3, Play, ArrowLeft, Shuffle } from 'lucide-react';
import { Playlist } from '@/services/songifyApi';

interface LibraryViewProps {
  playlists: Record<string, Playlist>;
  onPlaylistSelect: (playlistName: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  onPlaylistSelect,
  onBack,
  showBackButton = false
}) => {
  const playlistEntries = Object.entries(playlists);

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      {/* Header with optional back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {showBackButton && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          <h2 className="text-lg md:text-2xl font-bold text-foreground">Your Playlists</h2>
        </div>
      </div>
      
      {/* Empty state */}
      {playlistEntries.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <Disc3 className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">No playlists found</h3>
          <p className="text-sm text-muted-foreground">Playlists will appear here when available</p>
        </div>
      ) : (
        /* Playlists grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {playlistEntries.map(([name, playlist]) => (
            <PlaylistCard 
              key={name} 
              name={name}
              playlist={playlist}
              onSelect={() => onPlaylistSelect(name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PlaylistCardProps {
  name: string;
  playlist: Playlist;
  onSelect: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ name, playlist, onSelect }) => {
  return (
    <Card 
      className="p-4 md:p-6 bg-card/50 border-border/50 hover:shadow-card transition-all duration-300 cursor-pointer group"
      onClick={onSelect}
    >
      {/* Playlist icon and info */}
      <div className="flex items-start space-x-3 md:space-x-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Disc3 className="h-6 w-6 md:h-8 md:w-8 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm md:text-base">
            {playlist.name}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground">
            {playlist.unique_song_count} songs
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {playlist.successful_downloads} downloads
          </p>
        </div>
      </div>
      
      {/* Play indicator */}
      <div className="mt-3 md:mt-4 flex items-center text-xs md:text-sm text-muted-foreground">
        <Play className="h-3 w-3 md:h-4 md:w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="group-hover:text-primary transition-colors">Play playlist</span>
      </div>
    </Card>
  );
};