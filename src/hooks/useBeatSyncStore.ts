import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BeatSyncStore {
  inRoom: boolean;
  roomName: string | null;
  isAdmin: boolean;
  
  setRoom: (roomName: string, isAdmin: boolean) => void;
  leaveRoom: () => void;
}

export const useBeatSyncStore = create<BeatSyncStore>()(
  persist(
    (set) => ({
      inRoom: false,
      roomName: null,
      isAdmin: false,
      
      setRoom: (roomName, isAdmin) => set({ 
        inRoom: true, 
        roomName, 
        isAdmin 
      }),
      
      leaveRoom: () => set({ 
        inRoom: false, 
        roomName: null, 
        isAdmin: false 
      }),
    }),
    {
      name: 'beatsync-store-v2',
    }
  )
);
