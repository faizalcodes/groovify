import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

export interface PlaylistSong {
  id: string;
  song_id: string;
  track_name: string;
  artists_string: string;
  github_url: string;
  position: number;
  added_at: string;
}

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching playlists:', error);
      setPlaylists([]);
    } else {
      // Fetch profile data separately to avoid relation issues
      const playlistsWithProfiles = await Promise.all(
        (data || []).map(async (playlist) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', playlist.user_id)
            .single();
          
          return {
            ...playlist,
            profiles: profile
          };
        })
      );
      setPlaylists(playlistsWithProfiles);
    }
    setLoading(false);
  };

  const createPlaylist = async (title: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        title,
        description,
        is_public: true,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating playlist:', error);
      return { error };
    }

    fetchPlaylists();
    return { data, error: null };
  };

  const addSongToPlaylist = async (playlistId: string, song: any) => {
    // Get the current max position
    const { data: existingSongs } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingSongs && existingSongs.length > 0 
      ? existingSongs[0].position + 1 
      : 0;

    const { error } = await supabase
      .from('playlist_songs')
      .insert({
        playlist_id: playlistId,
        song_id: song.song_id,
        track_name: song.track_name,
        artists_string: song.artists_string,
        github_url: song.github_url,
        position: nextPosition
      });

    return { error };
  };

  const getPlaylistSongs = async (playlistId: string) => {
    const { data, error } = await supabase
      .from('playlist_songs')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    return { data: data || [], error };
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  return {
    playlists,
    loading,
    createPlaylist,
    addSongToPlaylist,
    getPlaylistSongs,
    refetch: fetchPlaylists
  };
};