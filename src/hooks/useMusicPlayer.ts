import { useState, useRef, useEffect, useCallback } from 'react';
import { useBeatSyncStore } from './useBeatSyncStore';
import { toast } from 'sonner';

interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

interface UseMusicPlayerReturn {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  currentIndex: number;
  
  // Actions
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
  setPlaylistContext: (songs: Song[]) => void;
}

export const useMusicPlayer = (): UseMusicPlayerReturn => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [playlistContext, setPlaylistContextState] = useState<Song[]>([]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const beatSync = useBeatSyncStore();
  const playSong = useCallback((song: Song) => {
    if (!audioRef.current) return;
    
    // Allow BeatSync component to handle room logic
    // Remove the blocking check - BeatSync will handle queue vs direct play
    
    // If it's a different song, update current song and load it
    if (currentSong?.song_id !== song.song_id) {
      setCurrentSong(song);
      audioRef.current.src = song.github_url;
      setCurrentTime(0);
      // Add to queue if not already there
      if (!queue.find(s => s.song_id === song.song_id)) {
        const newQueue = [song, ...queue];
        setQueue(newQueue);
        setCurrentIndex(0);
      } else {
        const index = queue.findIndex(s => s.song_id === song.song_id);
        setCurrentIndex(index);
      }
    }
    // Prevent rapid successive plays that cause AbortError
    if (audioRef.current.readyState === 1) { // HAVE_METADATA
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => {
          console.error('Error playing audio:', error);
          // Only try again if it's not an AbortError
          if (error.name !== 'AbortError') {
            setTimeout(() => {
              audioRef.current?.play()?.then(() => setIsPlaying(true));
            }, 100);
          }
        });
    } else {
      // Wait for metadata to load
      const onLoadedMetadata = () => {
        audioRef.current?.play()?.then(() => setIsPlaying(true));
        audioRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
      };
      audioRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
    }
  }, [currentSong, queue, beatSync]);

  const next = useCallback(() => {
    // Use playlist context if available, otherwise use queue
    const songsToUse = playlistContext.length > 0 ? playlistContext : queue;
    if (songsToUse.length === 0) return;
    
    let nextIndex: number;
    let currentIndexInContext: number;
    
    if (playlistContext.length > 0) {
      // Find current song index in playlist context
      currentIndexInContext = playlistContext.findIndex(s => s.song_id === currentSong?.song_id);
      if (currentIndexInContext === -1) currentIndexInContext = 0;
    } else {
      currentIndexInContext = currentIndex;
    }
    
    if (isShuffleMode) {
      // In shuffle mode, pick a random song (excluding current)
      const availableIndices = songsToUse.map((_, index) => index).filter(index => index !== currentIndexInContext);
      if (availableIndices.length === 0) {
        nextIndex = currentIndexInContext; // Only one song in context
      } else {
        nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      }
    } else {
      // Normal mode: sequential
      nextIndex = (currentIndexInContext + 1) % songsToUse.length;
    }
    
    const nextSong = songsToUse[nextIndex];
    
    // Update queue and index accordingly
    if (playlistContext.length > 0) {
      setQueue(playlistContext);
      setCurrentIndex(nextIndex);
    } else {
      setCurrentIndex(nextIndex);
    }
    
    playSong(nextSong);
  }, [queue, currentIndex, isShuffleMode, playlistContext, currentSong, playSong]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }
    
    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      next();
    };
    
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      // Try next song on error
      next();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [next]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      }, 1000);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying]);

  const play = useCallback(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(error => console.error('Error playing audio:', error));
    }
  }, [currentSong]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    
    // If we're more than 3 seconds into the song, restart it
    if (currentTime > 3) {
      seek(0);
      return;
    }
    
    const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
    const prevSong = queue[prevIndex];
    
    setCurrentIndex(prevIndex);
    playSong(prevSong);
  }, [queue, currentIndex, currentTime, playSong]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    localStorage.setItem('groovify-volume', newVolume.toString());
  }, []);

  const addToQueue = useCallback((songs: Song[]) => {
    setQueue(prevQueue => [...prevQueue, ...songs]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    setPlaylistContextState([]);
  }, []);

  const setPlaylistContext = useCallback((songs: Song[]) => {
    setPlaylistContextState(songs);
    setQueue(songs);
    setCurrentIndex(0);
  }, []);

  const shuffleQueue = useCallback(() => {
    setIsShuffleMode(true);
    const songsToShuffle = playlistContext.length > 0 ? playlistContext : queue;
    const shuffled = [...songsToShuffle];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    if (playlistContext.length > 0) {
      setPlaylistContextState(shuffled);
      setQueue(shuffled);
    } else {
      setQueue(shuffled);
    }
    
    // Update current index to match current song
    if (currentSong) {
      const newIndex = shuffled.findIndex(s => s.song_id === currentSong.song_id);
      setCurrentIndex(newIndex !== -1 ? newIndex : 0);
    }
  }, [queue, currentSong, playlistContext]);

  // Load volume from localStorage on mount
  useEffect(() => {
    const savedVolume = localStorage.getItem('groovify-volume');
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolumeState(vol);
      if (audioRef.current) {
        audioRef.current.volume = vol;
      }
    }
  }, []);

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentIndex,
    
    playSong,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    addToQueue,
    clearQueue,
    shuffleQueue,
    setPlaylistContext,
  };
};