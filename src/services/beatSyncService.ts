import { io, Socket } from 'socket.io-client';

interface Song {
  song_id: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  cover_art_url?: string;
  github_url: string;
  duration_formatted?: string;
}

export interface SyncPlayEvent {
  room: string;
  url: string;
  startAt: number;
  songInfo?: Song;
  seekTo?: number;
}

export interface RoomJoinInfo {
  room: string;
  isAdmin: boolean;
}

class BeatSyncService {
  private socket: Socket | null = null;
  private timeOffset: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private connectedCallback: (() => void) | null = null;
  private disconnectedCallback: (() => void) | null = null;
  private songPlayCallback: ((data: SyncPlayEvent) => void) | null = null;
  private syncCallback: ((data: SyncPlayEvent) => void) | null = null;
  private queueUpdateCallback: ((queue: Song[], currentSong: Song | null) => void) | null = null;
  private anyoneCanControlCallback: ((enabled: boolean) => void) | null = null;
  private adminStatusCallback: ((isAdmin: boolean) => void) | null = null;
  
  constructor() {
    this.timeOffset = 0;
  }

  connect(serverUrl: string = 'https://songify-6k9c.onrender.com') {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io(serverUrl);
    
    this.socket.on('connect', () => {
      console.log('Connected to BeatSync server');
      this.syncTime();
      if (this.syncInterval) clearInterval(this.syncInterval);
      this.syncInterval = setInterval(() => this.syncTime(), 30000);
      
      if (this.connectedCallback) this.connectedCallback();
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from BeatSync server');
      if (this.syncInterval) clearInterval(this.syncInterval);
      
      if (this.disconnectedCallback) this.disconnectedCallback();
    });
    
    this.socket.on('play_song', (data: any) => {
      console.log('Received play_song:', data);
      
      // Parse songInfo if it has nested structure
      if (data.songInfo && data.songInfo.songInfo) {
        data.songInfo = data.songInfo.songInfo;
      }
      
      console.log('Parsed play_song:', data);
      if (this.songPlayCallback) this.songPlayCallback(data);
    });
    
    this.socket.on('sync_to_current', (data: any) => {
      console.log('Received sync_to_current:', data);
      
      // Parse songInfo if it has nested structure
      if (data.songInfo && data.songInfo.songInfo) {
        data.songInfo = data.songInfo.songInfo;
      }
      
      console.log('Parsed sync_to_current:', data);
      if (this.syncCallback) this.syncCallback(data);
    });
    
    this.socket.on('queue_update', (data: { queue: any[], currentSong: any | null }) => {
      console.log('Received queue_update:', data);
      
      // Parse queue data - handle nested songInfo structure
      const parsedQueue = data.queue?.map((item: any) => {
        // If item has songInfo property, extract it
        if (item.songInfo) {
          return item.songInfo;
        }
        // Otherwise use the item directly
        return item;
      }) || [];
      
      // Parse current song data - handle nested songInfo structure
      let parsedCurrentSong = data.currentSong;
      if (parsedCurrentSong && parsedCurrentSong.songInfo) {
        parsedCurrentSong = parsedCurrentSong.songInfo;
      }
      
      console.log('Parsed queue_update - Queue:', parsedQueue, 'Current Song:', parsedCurrentSong);
      if (this.queueUpdateCallback) this.queueUpdateCallback(parsedQueue, parsedCurrentSong);
    });
    
    this.socket.on('toggle_anyone_can_control', (data: { enabled: boolean }) => {
      console.log('Received toggle_anyone_can_control:', data);
      if (this.anyoneCanControlCallback) this.anyoneCanControlCallback(data.enabled);
    });
    
    this.socket.on('admin_status', (data: { isAdmin: boolean }) => {
      console.log('Received admin_status:', data);
      if (this.adminStatusCallback) this.adminStatusCallback(data.isAdmin);
    });
    
    this.socket.on('queue_sync_response', (data: { queue: any[], currentSong: any | null }) => {
      console.log('Received queue_sync_response:', data);
      
      // Parse queue data - handle nested songInfo structure
      const parsedQueue = data.queue?.map((item: any) => {
        // If item has songInfo property, extract it
        if (item.songInfo) {
          return item.songInfo;
        }
        // Otherwise use the item directly
        return item;
      }) || [];
      
      // Parse current song data
      let parsedCurrentSong = data.currentSong;
      if (parsedCurrentSong && parsedCurrentSong.songInfo) {
        parsedCurrentSong = parsedCurrentSong.songInfo;
      }
      
      console.log('Parsed queue_sync_response - Queue:', parsedQueue, 'Current Song:', parsedCurrentSong);
      if (this.queueUpdateCallback) this.queueUpdateCallback(parsedQueue, parsedCurrentSong);
    });
    
    return this;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  joinRoom(roomInfo: RoomJoinInfo) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot join room: Not connected to server');
      return;
    }
    
    this.socket.emit('join_room', roomInfo);
  }
  
  playSong(room: string, song: Song) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot play song: Not connected to server');
      return;
    }
    
    // Calculate start time (2 seconds from now) with NTP offset
    const startAt = Date.now() + this.timeOffset + 2000;
    
    // Emit to room
    this.socket.emit('play_song', { 
      room: room, 
      url: song.github_url,
      startAt: startAt,
      songInfo: song
    });
  }
  
  addToQueue(room: string, song: Song) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot add to queue: Not connected to server');
      return;
    }
    
    this.socket.emit('add_to_queue', { 
      room: room, 
      url: song.github_url,
      songInfo: song
    });
  }
  
  removeFromQueue(room: string, index: number) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot remove from queue: Not connected to server');
      return;
    }
    
    this.socket.emit('remove_from_queue', { 
      room: room, 
      index: index
    });
  }
  
  clearQueue(room: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot clear queue: Not connected to server');
      return;
    }
    
    this.socket.emit('clear_queue', { 
      room: room
    });
  }
  
  toggleAnyoneCanControl(room: string, enabled: boolean) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot toggle control: Not connected to server');
      return;
    }
    
    this.socket.emit('toggle_anyone_can_control', { 
      room: room, 
      enabled: enabled
    });
  }
  
  async syncTime() {
    try {
      const startTime = Date.now();
      const response = await fetch('https://songify-6k9c.onrender.com/ping');
      const endTime = Date.now();
      const data = await response.json();
      
      // Simple NTP-like calculation
      const roundTripTime = endTime - startTime;
      const serverTime = new Date(data.timestamp).getTime();
      const networkDelay = roundTripTime / 2;
      const estimatedServerTime = serverTime + networkDelay;
      
      this.timeOffset = estimatedServerTime - Date.now();
      
      console.log(`Time synced: offset ${Math.round(this.timeOffset)}ms (RTT: ${roundTripTime}ms)`);
    } catch (error) {
      console.error('Time sync failed:', error);
    }
  }
  
  // Event listeners
  onConnected(callback: () => void) {
    this.connectedCallback = callback;
    return this;
  }
  
  onDisconnected(callback: () => void) {
    this.disconnectedCallback = callback;
    return this;
  }
  
  onSongPlay(callback: (data: SyncPlayEvent) => void) {
    this.songPlayCallback = callback;
    return this;
  }
  
  onSync(callback: (data: SyncPlayEvent) => void) {
    this.syncCallback = callback;
    return this;
  }
  
  onQueueUpdate(callback: (queue: Song[], currentSong: Song | null) => void) {
    this.queueUpdateCallback = callback;
    return this;
  }
  
  onAnyoneCanControl(callback: (enabled: boolean) => void) {
    this.anyoneCanControlCallback = callback;
    return this;
  }
  
  onAdminStatus(callback: (isAdmin: boolean) => void) {
    this.adminStatusCallback = callback;
    return this;
  }
  
  requestQueueSync(room: string) {
    if (!this.socket || !this.socket.connected) {
      console.error('Cannot request queue sync: Not connected to server');
      return;
    }
    
    this.socket.emit('request_queue_sync', { room });
  }
  
  getTimeOffset() {
    return this.timeOffset;
  }
  
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create a singleton instance
export const beatSyncService = new BeatSyncService();
