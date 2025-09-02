import React, { useState, useEffect, useRef } from 'react';
import { useBeatSyncStore } from '@/hooks/useBeatSyncStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/SearchBar';
import { SongCard } from '@/components/SongCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { songifyApi } from '@/services/songifyApi';
import { 
  Music, 
  Users, 
  Radio, 
  Plus, 
  ArrowRight, 
  Settings, 
  Clock,
  RefreshCw,
  Search,
  Loader2,
  List,
  Library
} from 'lucide-react';
import { beatSyncService, SyncPlayEvent } from '@/services/beatSyncService';

export interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

export interface Playlist {
  id: string;
  name: string;
  display_name: string;
  created_by: string;
  created_at: string;
  unique_song_count: number;
  has_songs: boolean;
}

interface BeatSyncProps {
  currentSong: Song | null;
  queue: Song[];
  onPlaySong: (song: Song) => void;
  onPause: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  playlists?: Record<string, Playlist>;
}

export const BeatSync: React.FC<BeatSyncProps> = ({
  currentSong,
  queue,
  onPlaySong,
  onPause,
  onNext,
  onSeek,
  isPlaying,
  playlists = {}
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinRoomName, setJoinRoomName] = useState('');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');
  
  // Playlist and search states
  const [selectedTab, setSelectedTab] = useState('rooms');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [isLoadingRecentSongs, setIsLoadingRecentSongs] = useState(false);
  
  // Queue states
  const [roomQueue, setRoomQueue] = useState<Song[]>([]);
  const [currentRoomSong, setCurrentRoomSong] = useState<Song | null>(null);
  const [anyoneCanControl, setAnyoneCanControl] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [lastQueueUpdate, setLastQueueUpdate] = useState<Date | null>(null);
  
  const logAreaRef = useRef<HTMLDivElement>(null);
  
  // Debug roomQueue state changes
  useEffect(() => {
    console.log('🔍 ROOM QUEUE STATE CHANGED:', {
      length: roomQueue.length,
      songs: roomQueue.map(song => ({
        id: song.song_id,
        title: song.track_name,
        artist: song.artists_string,
        cover: song.cover_art_url
      })),
      timestamp: new Date().toISOString()
    });
  }, [roomQueue]);
  
  // Initialize socket connection
  useEffect(() => {
    beatSyncService
      .connect()
      .onConnected(() => {
        setIsConnected(true);
        addLog('Connected to BeatSync server');
        
        // Sync state when reconnecting
        if (currentRoom) {
          setTimeout(() => {
            syncQueueFromServer();
          }, 1000);
        }
      })
      .onDisconnected(() => {
        setIsConnected(false);
        setCurrentRoom(null);
        setRoomQueue([]);
        setCurrentRoomSong(null);
        addLog('Disconnected from BeatSync server');
      })
      .onSongPlay((data) => {
        handleSyncPlay(data);
      })
      .onSync((data) => {
        handleSyncPlay(data);
      })
      .onQueueUpdate((queue, currentSong) => {
        console.log('🔄 QUEUE UPDATE EVENT RECEIVED:', { 
          queueLength: queue?.length || 0, 
          currentSong: currentSong?.track_name,
          currentSongRawData: currentSong,
          currentSongData: currentSong ? {
            id: currentSong.song_id,
            title: currentSong.track_name,
            artist: currentSong.artists_string,
            cover: currentSong.cover_art_url,
            hasCompleteData: !!(currentSong.song_id && currentSong.track_name && currentSong.artists_string)
          } : null,
          queueSongs: queue?.map(song => ({
            id: song.song_id,
            title: song.track_name,
            artist: song.artists_string,
            cover: song.cover_art_url,
            hasAllFields: !!(song.song_id && song.track_name && song.artists_string && song.github_url),
            rawData: song
          })),
          timestamp: new Date().toISOString()
        });
        
        // Direct update - no debouncing to avoid data loss
        if (queue && Array.isArray(queue)) {
          console.log('📊 UPDATING QUEUE - Raw server data:', queue);
          
          // Use server data directly if it has complete information
          const processedQueue = queue.map((serverSong, index) => {
            console.log(`Processing queue item ${index + 1}:`, serverSong);
            
            // Server should send complete data, use it directly
            return {
              song_id: serverSong.song_id || `unknown-${Date.now()}-${index}`,
              track_name: serverSong.track_name || 'Unknown Song',
              artists_string: serverSong.artists_string || 'Unknown Artist',
              album_name: serverSong.album_name,
              cover_art_url: serverSong.cover_art_url,
              github_url: serverSong.github_url || '',
              duration_formatted: serverSong.duration_formatted
            };
          });
          
          console.log('✅ Final processed queue:', processedQueue.map(s => ({
            id: s.song_id,
            title: s.track_name,
            artist: s.artists_string,
            hasCompleteData: !!(s.track_name && s.artists_string && s.cover_art_url)
          })));
          
          setRoomQueue(processedQueue);
        } else {
          console.log('❌ No valid queue data received, clearing queue');
          setRoomQueue([]);
        }
        
        console.log('🎤 SETTING CURRENT ROOM SONG FROM QUEUE UPDATE:', currentSong);
        setCurrentRoomSong(currentSong);
        setLastQueueUpdate(new Date());
        setIsSyncingQueue(false);
        addLog(`Queue updated: ${(queue || []).length} songs`);
      })
      .onAnyoneCanControl((enabled) => {
        setAnyoneCanControl(enabled);
        addLog(`${enabled ? '🔓' : '🔒'} Anyone can control mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        
        // Force a re-render of permission-dependent UI
        setTimeout(() => {
          console.log('Permission updated, current state:', { isAdmin, anyoneCanControl: enabled });
        }, 100);
      })
      .onAdminStatus((isAdminStatus) => {
        console.log('Admin status update received:', isAdminStatus);
        setIsAdmin(isAdminStatus);
        
        // Update the persistent store
        if (currentRoom) {
          beatSyncStore.setRoom(currentRoom, isAdminStatus);
        }
        
        addLog(`${isAdminStatus ? '👑' : '🎧'} Admin status updated: ${isAdminStatus ? 'Admin' : 'Listener'}`);
        
        // Force a re-render by updating a dummy state
        setTimeout(() => {
          console.log('Admin status confirmed:', { isAdmin: isAdminStatus, room: currentRoom });
        }, 100);
      });
      
    // Start with an initial time sync
    syncTime();
    
    // Load recent songs
    loadRecentSongs();
    
    return () => {
      beatSyncService.disconnect();
    };
  }, []);
  
  // Debug roomQueue state changes
  useEffect(() => {
    console.log('🔍 ROOM QUEUE STATE CHANGED:', {
      length: roomQueue.length,
      songs: roomQueue.map(song => ({
        id: song.song_id,
        title: song.track_name,
        artist: song.artists_string,
        cover: song.cover_art_url
      })),
      timestamp: new Date().toISOString()
    });
  }, [roomQueue]);
  
  // Debug currentRoomSong state changes
  useEffect(() => {
    console.log('🎤 CURRENT ROOM SONG STATE CHANGED:', {
      songData: currentRoomSong,
      hasData: !!currentRoomSong,
      songId: currentRoomSong?.song_id,
      trackName: currentRoomSong?.track_name,
      artistsString: currentRoomSong?.artists_string,
      coverArtUrl: currentRoomSong?.cover_art_url,
      timestamp: new Date().toISOString()
    });
  }, [currentRoomSong]);
  
  // Load recent songs
  const loadRecentSongs = async () => {
    try {
      setIsLoadingRecentSongs(true);
      const songsData = await songifyApi.getAllSongs(1, 15);
      console.log('Recent songs:', songsData.songs.map(song => ({
        id: song.song_id,
        title: song.track_name,
        artist: song.artists_string,
        cover: song.cover_art_url
      })));
      setRecentSongs(songsData.songs);
      addLog(`Loaded ${songsData.songs.length} recent songs`);
    } catch (error) {
      console.error('Failed to load recent songs:', error);
      addLog('Failed to load recent songs');
    } finally {
      setIsLoadingRecentSongs(false);
    }
  };
  
  // Search songs
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    try {
      setIsSearching(true);
      setSearchQuery(query);
      
      const results = await songifyApi.searchSongs(query, 1, 20);
      console.log('Search results:', results.results.map(song => ({
        id: song.song_id,
        title: song.track_name,
        artist: song.artists_string,
        cover: song.cover_art_url
      })));
      setSearchResults(results.results);
      
      if (results.results.length === 0) {
        addLog(`No results found for "${query}"`);
      } else {
        addLog(`Found ${results.total_results} songs for "${query}"`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      addLog('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  // Load playlist songs
  const loadPlaylistSongs = async (playlistName: string) => {
    if (!playlistName) return;
    
    try {
      setIsLoadingPlaylist(true);
      setPlaylistSongs([]);
      
      const playlistData = await songifyApi.getPlaylistSongs(playlistName, 1, 20);
      setPlaylistSongs(playlistData.songs);
      
      addLog(`Loaded ${playlistData.songs.length} songs from playlist "${playlistName}"`);
    } catch (error) {
      console.error('Failed to load playlist songs:', error);
      addLog('Failed to load playlist songs');
    } finally {
      setIsLoadingPlaylist(false);
    }
  };
  
  // Safely play a song - handle room permissions
  const safePlaySong = (song: Song) => {
    if (currentRoom) {
      // If we're in a room
      if (isAdmin || anyoneCanControl) {
        // Admin or anyone can control mode - add to queue
        addSongToQueue(song);
      } else {
        // Listener without control permission
        addLog('❌ Only room admin can add songs to queue (or enable "Anyone can control" mode)');
        // Don't add to queue, just show message
      }
    } else {
      // Normal play if not in a room - use main music player
      onPlaySong(song);
      addLog(`Playing "${song.track_name}"`);
    }
  };
  
  // Handle sync play
  const handleSyncPlay = (data: SyncPlayEvent) => {
    console.log('🔄 HANDLE SYNC PLAY CALLED:', {
      rawData: data,
      songInfo: data.songInfo,
      hasSongInfo: !!data.songInfo,
      songInfoData: data.songInfo ? {
        id: data.songInfo.song_id,
        title: data.songInfo.track_name,
        artist: data.songInfo.artists_string,
        cover: data.songInfo.cover_art_url
      } : null
    });
    
    if (!data.songInfo) {
      addLog('Received play command with no song info');
      return;
    }
    
    addLog(`Received play command: ${data.songInfo.track_name}`);
    
    // Update current room song
    console.log('🎤 SETTING CURRENT ROOM SONG FROM SYNC PLAY:', data.songInfo);
    setCurrentRoomSong(data.songInfo);
    
    // Remove the played song from queue if it exists
    setRoomQueue(prev => {
      const songIndex = prev.findIndex(song => song.song_id === data.songInfo!.song_id);
      if (songIndex !== -1) {
        const newQueue = [...prev];
        newQueue.splice(songIndex, 1);
        return newQueue;
      }
      return prev;
    });
    
    // If we have seekTo, it's an immediate sync for late joiners
    if (data.seekTo !== undefined) {
      addLog(`Seeking to ${data.seekTo.toFixed(2)}s and playing`);
      
      // Play the song immediately and seek to position
      onPlaySong(data.songInfo);
      setTimeout(() => {
        onSeek(data.seekTo || 0);
      }, 100);
      return;
    }
    
    // Calculate delay based on server start time
    const currentTime = Date.now() + beatSyncService.getTimeOffset();
    const delay = data.startAt - currentTime;
    
    if (delay > 0) {
      addLog(`Waiting ${delay}ms to start playback`);
      
      // Wait and then play
      setTimeout(() => {
        onPlaySong(data.songInfo!);
      }, delay);
    } else {
      // We're late, so start immediately but seek to correct position
      const seekTo = Math.abs(delay) / 1000;
      addLog(`Starting late, seeking to ${seekTo.toFixed(2)}s`);
      
      onPlaySong(data.songInfo);
      setTimeout(() => {
        onSeek(seekTo);
      }, 100);
    }
  };
  
  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${time}] ${message}`]);
    
    // Scroll to bottom of logs
    setTimeout(() => {
      if (logAreaRef.current) {
        logAreaRef.current.scrollTop = logAreaRef.current.scrollHeight;
      }
    }, 50);
  };
  
  const syncTime = async () => {
    await beatSyncService.syncTime();
    setTimeOffset(beatSyncService.getTimeOffset());
    setLastSyncTime(new Date().toLocaleTimeString());
    addLog(`Time synced: offset ${beatSyncService.getTimeOffset()}ms`);
  };
  
  const beatSyncStore = useBeatSyncStore();
  
  // Load initial state from store
  useEffect(() => {
    const storeState = beatSyncStore;
    if (storeState.inRoom && storeState.roomName) {
      console.log('Loading persisted room state:', storeState);
      setCurrentRoom(storeState.roomName);
      setIsAdmin(storeState.isAdmin);
      addLog(`Rejoined room: ${storeState.roomName} (${storeState.isAdmin ? 'Admin' : 'Listener'})`);
      
      // Reconnect to the room if we're connected
      if (isConnected) {
        setTimeout(() => {
          beatSyncService.joinRoom({ 
            room: storeState.roomName!, 
            isAdmin: storeState.isAdmin 
          });
        }, 500);
      }
    }
  }, [isConnected]); // Run when isConnected changes
  
  // Handle connection recovery and sync
  useEffect(() => {
    if (isConnected && currentRoom) {
      // When reconnecting, request fresh state from server
      setTimeout(() => {
        console.log('Reconnected, requesting queue sync');
        beatSyncService.requestQueueSync(currentRoom);
      }, 1000);
    }
  }, [isConnected, currentRoom]);

  // Monitor queue sync health
  useEffect(() => {
    if (!currentRoom) return;

    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = lastQueueUpdate ? now - lastQueueUpdate.getTime() : null;

      // If we haven't received a queue update in 60 seconds, show warning
      if (timeSinceLastUpdate && timeSinceLastUpdate > 60000) {
        console.warn('Queue sync may be stale:', timeSinceLastUpdate / 1000, 'seconds since last update');
        addLog('⚠️ Queue sync may be delayed - check connection');
      }
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [currentRoom, lastQueueUpdate]);

  // Periodic sync as fallback for socket events
  useEffect(() => {
    if (!currentRoom || !isConnected) return;

    const syncInterval = setInterval(() => {
      // Request queue sync from server every 30 seconds to ensure synchronization
      if (!isSyncingQueue) {
        console.log('Periodic queue sync check');
        beatSyncService.requestQueueSync(currentRoom);
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [currentRoom, isConnected, isSyncingQueue]);

  const createRoom = () => {
    if (!roomName.trim()) {
      addLog('Please enter a room name');
      return;
    }
    
    // Reset admin status when creating a new room
    setIsAdmin(false);
    
    setCurrentRoom(roomName);
    setRoomQueue([]);
    setCurrentRoomSong(null);
    setAnyoneCanControl(false);
    
    // Clear any existing room state
    beatSyncStore.leaveRoom();
    
    beatSyncService.joinRoom({ room: roomName, isAdmin: true });
    addLog(`Created and joined room: ${roomName} (waiting for admin confirmation)`);
  };

  const joinRoom = () => {
    if (!joinRoomName.trim()) {
      addLog('Please enter a room name');
      return;
    }
    
    // Reset admin status when joining as listener
    setIsAdmin(false);
    
    setCurrentRoom(joinRoomName);
    setRoomQueue([]);
    setCurrentRoomSong(null);
    setAnyoneCanControl(false);
    
    // Clear any existing room state
    beatSyncStore.leaveRoom();
    
    beatSyncService.joinRoom({ room: joinRoomName, isAdmin: false });
    addLog(`Joined room: ${joinRoomName} (waiting for status confirmation)`);
  };
  
  const leaveRoom = () => {
    const roomToLeave = currentRoom;
    setCurrentRoom(null);
    setRoomQueue([]);
    setCurrentRoomSong(null);
    setAnyoneCanControl(false);
    setIsAdmin(false);
    beatSyncStore.leaveRoom();
    addLog(`Left room: ${roomToLeave}`);
  };
  
  const broadcastCurrentSong = () => {
    if (!currentSong || !currentRoom || !isAdmin) {
      addLog('Cannot broadcast: No song playing or not room admin');
      return;
    }
    
    beatSyncService.playSong(currentRoom, currentSong);
    addLog(`Broadcasting to room: ${currentSong.track_name}`);
  };
  
  const addSongToQueue = (song: Song) => {
    if (!currentRoom) {
      addLog('Cannot add to queue: Not in a room');
      return;
    }

    // Check permissions
    if (!isAdmin && !anyoneCanControl) {
      addLog('❌ Only room admin can add songs to queue (or enable "Anyone can control" mode)');
      return;
    }

    // Optimistically add to local queue for immediate UI feedback
    setRoomQueue(prev => {
      // Check if song is already in queue to avoid duplicates
      const isAlreadyInQueue = prev.some(existingSong => existingSong.song_id === song.song_id);
      if (isAlreadyInQueue) {
        console.log('Song already in queue, skipping optimistic add');
        return prev;
      }
      
      const newQueue = [...prev, {
        song_id: song.song_id,
        track_name: song.track_name || 'Unknown Song',
        artists_string: song.artists_string || 'Unknown Artist',
        album_name: song.album_name,
        cover_art_url: song.cover_art_url,
        github_url: song.github_url,
        duration_formatted: song.duration_formatted
      }];
      
      console.log('✅ Optimistically added to queue:', {
        song: {
          id: song.song_id,
          title: song.track_name,
          artist: song.artists_string,
          cover: song.cover_art_url
        },
        newQueueLength: newQueue.length
      });
      return newQueue;
    });
    addLog(`➕ Added "${song.track_name}" to queue`);

    // Send to server
    try {
      // Ensure song has all required fields
      const normalizedSong = {
        song_id: song.song_id,
        track_name: song.track_name || 'Unknown Song',
        artists_string: song.artists_string || 'Unknown Artist',
        album_name: song.album_name,
        cover_art_url: song.cover_art_url,
        github_url: song.github_url,
        duration_formatted: song.duration_formatted
      };
      
      beatSyncService.addToQueue(currentRoom, normalizedSong);
      console.log('Sent normalized song to server:', normalizedSong);
    } catch (error) {
      console.error('Failed to send to server:', error);
      addLog('⚠️ Server communication failed, but song added locally');
    }
  };
  
  const removeFromQueue = (index: number) => {
    if (!currentRoom || !isAdmin) {
      addLog('Cannot remove from queue: Not admin or not in room');
      return;
    }
    
    // Optimistically remove from local queue
    setRoomQueue(prev => prev.filter((_, i) => i !== index));
    addLog(`Removed song at position ${index + 1} from queue`);
    
    // Send to server
    beatSyncService.removeFromQueue(currentRoom, index);
  };
  
  const clearRoomQueue = () => {
    if (!currentRoom || !isAdmin) {
      addLog('Cannot clear queue: Not admin or not in room');
      return;
    }
    
    // Optimistically clear local queue
    setRoomQueue([]);
    addLog('Cleared queue');
    
    // Send to server
    beatSyncService.clearQueue(currentRoom);
  };
  
  const playNextFromQueue = () => {
    if (!currentRoom || !isAdmin || roomQueue.length === 0) {
      addLog('Cannot play next: Not admin, not in room, or queue is empty');
      return;
    }
    
    const nextSong = roomQueue[0];
    
    // Remove the song from queue immediately
    setRoomQueue(prev => prev.slice(1));
    
    // Play the song
    beatSyncService.playSong(currentRoom, nextSong);
    addLog(`Playing next from queue: ${nextSong.track_name}`);
  };
  
  const toggleAnyoneCanControlMode = () => {
    if (!isAdmin || !currentRoom) {
      addLog('❌ Only admin can toggle control mode');
      return;
    }

    const newValue = !anyoneCanControl;
    // Optimistically update local state
    setAnyoneCanControl(newValue);

    // Send to server
    try {
      beatSyncService.toggleAnyoneCanControl(currentRoom, newValue);
      addLog(`${newValue ? '🔓' : '🔒'} Anyone can control: ${newValue ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
      console.error('Failed to toggle control mode:', error);
      // Revert optimistic update on failure
      setAnyoneCanControl(!newValue);
      addLog('❌ Failed to toggle control mode');
    }
  };
  
  const syncQueueFromServer = async () => {
    if (!currentRoom || !isConnected) {
      addLog('Cannot sync queue: Not in room or not connected');
      return;
    }

    try {
      setIsSyncingQueue(true);
      addLog('🔄 Syncing queue from server...');

      // Since we can't directly query the server queue, we'll emit a special event
      // This is a workaround since the server might not support queue queries
      beatSyncService.requestQueueSync(currentRoom);

      // Fallback: wait a bit and assume sync is complete
      setTimeout(() => {
        setIsSyncingQueue(false);
        addLog('Queue sync completed');
      }, 2000);

    } catch (error) {
      console.error('Queue sync failed:', error);
      setIsSyncingQueue(false);
      addLog('❌ Queue sync failed');
    }
  };
  
  const formatTime = (ms: number) => {
    return Math.round(ms) + 'ms';
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Connection Status */}
        <Card className="col-span-1 md:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Radio className="h-5 w-5 text-primary" />
              <span>BeatSync Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-md text-sm font-medium ${isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
              {isConnected 
                ? '✅ Connected to BeatSync server' 
                : '❌ Disconnected from BeatSync server'}
            </div>
            
            {currentRoom && (
              <div className="mt-3 p-3 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium">
                🎵 Room: {currentRoom} ({isAdmin ? 'Admin' : 'Listener'})
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Left Section - Room Controls & Music */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="rooms">Rooms</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
            </TabsList>
            
            {/* Rooms Tab */}
            <TabsContent value="rooms" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Create Room</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input 
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name" 
                      />
                      <Button 
                        className="w-full" 
                        onClick={createRoom}
                        disabled={!isConnected || !!currentRoom}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create & Join as Admin
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Join Room</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input
                        value={joinRoomName}
                        onChange={(e) => setJoinRoomName(e.target.value)}
                        placeholder="Enter room name"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={joinRoom}
                        disabled={!isConnected || !!currentRoom}
                      >
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Join as Listener
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            
              {currentRoom && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Room Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button 
                        variant="destructive" 
                        onClick={leaveRoom}
                        className="w-full"
                      >
                        Leave Room
                      </Button>
                      
                      {!isAdmin && anyoneCanControl && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            🎛️ Anyone can control mode is enabled - you can add songs to the queue!
                          </p>
                        </div>
                      )}
                      
                      {!isAdmin && !anyoneCanControl && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <p className="text-sm text-orange-800 dark:text-orange-200">
                            🎧 You are listening as a guest. Only the room admin can add songs to the queue.
                          </p>
                        </div>
                      )}
                      
                      {/* {isAdmin && currentSong && (
                        <div className="space-y-3 border rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={currentSong.cover_art_url || '/placeholder.svg'} 
                              alt={currentSong.track_name}
                              className="w-12 h-12 rounded-md object-cover" 
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{currentSong.track_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{currentSong.artists_string}</p>
                            </div>
                          </div>
                          
                          <Button 
                            disabled={!currentSong || !isAdmin} 
                            className="w-full" 
                            onClick={broadcastCurrentSong}
                          >
                            <Music className="mr-2 h-4 w-4" />
                            Broadcast Current Song
                          </Button>
                        </div>
                      )} */}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Room Queue & Controls */}
              {currentRoom && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <List className="h-5 w-5 mr-2 text-primary" />
                        Room Queue ({roomQueue.length} songs)
                        {isSyncingQueue && <RefreshCw className="h-4 w-4 ml-2 animate-spin text-muted-foreground" />}
                        {lastQueueUpdate && Date.now() - lastQueueUpdate.getTime() > 30000 && (
                          <span className="ml-2 text-xs text-orange-500" title="Queue may be out of sync">
                            ⚠️
                          </span>
                        )}
                      </span>
                      <div className="flex items-center space-x-2">
                        {!isAdmin && currentRoom && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={syncQueueFromServer}
                            disabled={isSyncingQueue}
                            title="Refresh queue from server"
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log('Debug state:', {
                              currentRoom,
                              isAdmin,
                              anyoneCanControl,
                              roomQueue: roomQueue.length,
                              isConnected,
                              lastQueueUpdate
                            });
                            addLog(`Debug: Room=${currentRoom}, Admin=${isAdmin}, Control=${anyoneCanControl}, Queue=${roomQueue.length}`);
                          }}
                          title="Debug current state"
                        >
                          🐛
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={syncQueueFromServer}
                              disabled={isSyncingQueue}
                              title="Sync queue from server"
                            >
                              <RefreshCw className={`h-4 w-4 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={playNextFromQueue}
                              disabled={roomQueue.length === 0}
                            >
                              Play Next
                            </Button>
                            <label className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={anyoneCanControl}
                                onChange={toggleAnyoneCanControlMode}
                                className="rounded"
                              />
                              <span>Anyone can control</span>
                            </label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearRoomQueue}
                              disabled={roomQueue.length === 0}
                            >
                              Clear Queue
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log('Debug state:', {
                                  currentRoom,
                                  isAdmin,
                                  anyoneCanControl,
                                  roomQueue: roomQueue.length,
                                  isConnected,
                                  lastQueueUpdate
                                });
                                addLog(`Debug: Room=${currentRoom}, Admin=${isAdmin}, Control=${anyoneCanControl}, Queue=${roomQueue.length}`);
                              }}
                              title="Debug current state"
                            >
                              🐛
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentRoomSong && (
                      <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        {(() => {
                          console.log('🎵 RENDERING NOW PLAYING:', {
                            rawData: currentRoomSong,
                            songId: currentRoomSong.song_id,
                            trackName: currentRoomSong.track_name,
                            artistsString: currentRoomSong.artists_string,
                            coverArtUrl: currentRoomSong.cover_art_url,
                            hasCompleteData: !!(currentRoomSong.song_id && currentRoomSong.track_name && currentRoomSong.artists_string)
                          });
                          return null;
                        })()}
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-primary">Now Playing:</div>
                          <img
                            src={currentRoomSong.cover_art_url || '/placeholder.svg'}
                            alt={currentRoomSong.track_name || 'Unknown Song'}
                            className="w-10 h-10 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{currentRoomSong.track_name || 'Unknown Song'}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentRoomSong.artists_string || 'Unknown Artist'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <ScrollArea className="h-[200px]">
                      {roomQueue.length > 0 ? (
                        <div className="space-y-2">
                          {roomQueue.map((song, index) => {
                            console.log(`🎵 Rendering queue item ${index + 1}:`, {
                              id: song.song_id,
                              title: song.track_name,
                              artist: song.artists_string,
                              cover: song.cover_art_url,
                              hasTitle: !!song.track_name,
                              hasArtist: !!song.artists_string,
                              hasCover: !!song.cover_art_url
                            });
                            return (
                            <div
                              key={`${song.song_id}-${index}`}
                              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                            >
                              <div className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}
                              </div>
                              <img
                                src={song.cover_art_url || '/placeholder.svg'}
                                alt={song.track_name || 'Unknown Song'}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">{song.track_name || 'Unknown Song'}</p>
                                <p className="text-xs text-muted-foreground truncate">{song.artists_string || 'Unknown Artist'}</p>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromQueue(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  ✕
                                </Button>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Queue is empty. Add songs to get started!
                          {lastQueueUpdate && (
                            <div className="text-xs mt-2">
                              Last synced: {lastQueueUpdate.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
              
              {/* Recent Songs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Music className="h-5 w-5 mr-2 text-primary" /> 
                      Recent Songs
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={loadRecentSongs}
                      disabled={isLoadingRecentSongs}
                      className="text-primary hover:text-primary hover:bg-primary/10 p-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingRecentSongs ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingRecentSongs ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentSongs.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {recentSongs.map((song) => (
                          <SongCard
                            key={song.song_id}
                            song={song}
                            isCurrentSong={currentSong?.song_id === song.song_id}
                            isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                            onPlay={safePlaySong}
                            onPause={onPause}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No songs available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Search Tab */}
            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Search className="h-5 w-5 mr-2 text-primary" /> 
                    Search Songs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchBar 
                    onSearch={handleSearch} 
                    placeholder="Search for songs..."
                    className="w-full mb-4"
                  />
                  
                  {isSearching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {searchResults.map((song) => (
                          <SongCard
                            key={song.song_id}
                            song={song}
                            isCurrentSong={currentSong?.song_id === song.song_id}
                            isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                            onPlay={safePlaySong}
                            onPause={onPause}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : searchQuery ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No results found for "{searchQuery}"
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Search for songs to play in your room
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Playlists Tab */}
            <TabsContent value="playlists" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <List className="h-5 w-5 mr-2 text-primary" /> 
                    Your Playlists
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select
                      value={selectedPlaylist || ""}
                      onValueChange={(value) => {
                        setSelectedPlaylist(value);
                        loadPlaylistSongs(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a playlist" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(playlists).map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.name}>
                            {playlist.display_name} ({playlist.unique_song_count} songs)
                          </SelectItem>
                        ))}
                        {Object.keys(playlists).length === 0 && (
                          <SelectItem value="none" disabled>
                            No playlists available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    
                    {isLoadingPlaylist ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : playlistSongs.length > 0 ? (
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {playlistSongs.map((song) => (
                            <SongCard
                              key={song.song_id}
                              song={song}
                              isCurrentSong={currentSong?.song_id === song.song_id}
                              isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                              onPlay={safePlaySong}
                              onPause={onPause}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : selectedPlaylist ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No songs in this playlist
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Select a playlist to view songs
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Section - Sync Controls & Log */}
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-primary" />
                <span>Sync Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-medium text-sm">Time Synchronization</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="font-medium">Server Offset:</div>
                    <div>{formatTime(timeOffset)}</div>
                    <div className="font-medium">Last Sync:</div>
                    <div>{lastSyncTime}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={syncTime} className="w-full mt-2">
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Time
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>Activity Log</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea ref={logAreaRef} className="h-[300px] w-full rounded-md border p-4 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="pb-1">{log}</div>
                ))}
                {logs.length === 0 && (
                  <div className="text-muted-foreground">No activity yet</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Currently Playing */}
          {currentSong && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Now Playing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <img 
                    src={currentSong.cover_art_url || '/placeholder.svg'} 
                    alt={currentSong.track_name}
                    className="w-12 h-12 rounded-md object-cover" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{currentSong.track_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentSong.artists_string}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BeatSync;
