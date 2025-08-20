import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Playlist {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    display_name: string;
  }[] | null;
}

export interface PlaylistSong {
  id: string;
  song_id: string;
  track_name: string;
  artists_string: string;
  github_url: string;
  cover_art_url?: string;
  album_name?: string;
  duration_formatted?: string;
  position: number;
  added_at: string;
}

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      // First get all public playlists
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (playlistsError) {
        console.error('Error fetching playlists:', playlistsError);
        setPlaylists([]);
        return;
      }

      // Then fetch profiles for each playlist
      const playlistsWithProfiles = await Promise.all((playlistsData || []).map(async (playlist) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', playlist.user_id)
          .single();

        return {
          ...playlist,
          profiles: profileData ? [{ display_name: profileData.display_name }] : null
        };
      }));

      setPlaylists(playlistsWithProfiles);
    } catch (error) {
      console.error('Error in fetchPlaylists:', error);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
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

  const getUserPlaylists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: userPlaylists, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user playlists:', error);
        return [];
      }

      return userPlaylists || [];
    } catch (error) {
      console.error('Error in getUserPlaylists:', error);
      return [];
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId);

      if (error) {
        console.error('Error removing song from playlist:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in removeSongFromPlaylist:', error);
      return { error };
    }
  };

  const addSongToPlaylist = async (playlistId: string, song: any) => {
    try {
      // First check if the song is already in the playlist
      const { data: existingSong } = await supabase
        .from('playlist_songs')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('song_id', song.song_id)
        .single();

      if (existingSong) {
        return { error: new Error('Song is already in this playlist') };
      }

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
          cover_art_url: song.cover_art_url || null,
          album_name: song.album_name || null,
          duration_formatted: song.duration_formatted || null,
          position: nextPosition,
          added_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding song to playlist:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in addSongToPlaylist:', error);
      return { error };
    }
  };

  const getPlaylistSongs = async (playlistId: string) => {
    try {
      const { data, error } = await supabase
        .from('playlist_songs')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Error fetching playlist songs:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getPlaylistSongs:', error);
      return { data: [], error };
    }
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
    getUserPlaylists,
    removeSongFromPlaylist,
    refetch: fetchPlaylists
  };
};