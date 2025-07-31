import { useEffect } from 'react';

interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

interface UseMediaSessionProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
  duration: number;
}

export const useMediaSession = ({
  currentSong,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime,
  duration
}: UseMediaSessionProps) => {
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      return;
    }

    // Update metadata when song changes
    if (currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.track_name,
        artist: currentSong.artists_string,
        album: currentSong.album_name || '',
        artwork: currentSong.cover_art_url ? [
          {
            src: currentSong.cover_art_url,
            sizes: '300x300',
            type: 'image/jpeg'
          }
        ] : []
      });
    }

    // Set playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Set action handlers
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('previoustrack', onPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);
    
    // Seek support
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        onSeek(details.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      onSeek(Math.max(0, currentTime - skipTime));
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      onSeek(Math.min(duration, currentTime + skipTime));
    });

    // Update position state
    if (duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: currentTime
      });
    }

    return () => {
      // Clear handlers when component unmounts
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [currentSong, isPlaying, onPlay, onPause, onNext, onPrevious, onSeek, currentTime, duration]);

  // Update position more frequently
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong || duration === 0) {
      return;
    }

    const updateInterval = setInterval(() => {
      if (isPlaying && duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: 1,
          position: currentTime
        });
      }
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [currentSong, isPlaying, currentTime, duration]);
};