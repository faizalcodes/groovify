// const BASE_URL = 'https://songify-6k9c.onrender.com';
const BASE_URL = 'http://209.74.95.163:3000';

export interface Song {
  song_id: string;
  filename: string;
  track_name: string;
  artists_string: string;
  album_name?: string;
  duration_formatted?: string;
  playcount?: number;
  cover_art_url?: string;
  cover_art_filename?: string;
  playlists: string[];
  github_url: string;
}

export interface Playlist {
  name: string;
  total_tracks: number;
  successful_downloads: number;
  unique_song_count: number;
  source_url: string;
  timestamp: string;
  has_songs: boolean;
}

export interface SearchResult {
  query: string;
  total_results: number;
  results: Song[];
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PlaylistSongs {
  playlist: string;
  songs: Song[];
  total_songs: number;
  unique_songs: number;
  pagination: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface QuickSearchSuggestion {
  type: 'track' | 'artist';
  text: string;
  track_name?: string;
  artist?: string;
  song_id?: string;
}

export interface Stats {
  total_unique_songs: number;
  total_playlists: number;
  total_original_songs: number;
  duplicates_removed: number;
  space_saved_percentage: number;
  generated_at: string;
  github_base_url: string;
  cache_status: {
    cached: boolean;
    cache_age_minutes: number | null;
  };
}

class SongifyAPI {
  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Get all playlists
  async getPlaylists(): Promise<Record<string, Playlist>> {
    return this.fetchWithErrorHandling(`${BASE_URL}/playlists`);
  }

  // Get all songs with pagination
  async getAllSongs(page: number = 1, limit: number = 30): Promise<{ total_songs: number; songs: Song[]; pagination: any }> {
    return this.fetchWithErrorHandling(`${BASE_URL}/all-songs?page=${page}&limit=${limit}`);
  }

  // Get songs for a specific playlist
  async getPlaylistSongs(playlist: string, page: number = 1, limit: number = 30): Promise<PlaylistSongs> {
    return this.fetchWithErrorHandling(`${BASE_URL}/playlist/${encodeURIComponent(playlist)}/songs?page=${page}&limit=${limit}`);
  }

  // Search songs
  async searchSongs(query: string, page: number = 1, limit: number = 30): Promise<SearchResult> {
    return this.fetchWithErrorHandling(`${BASE_URL}/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  }

  // Quick search for suggestions
  async quickSearch(query: string, limit: number = 10): Promise<{ suggestions: QuickSearchSuggestion[]; query: string }> {
    return this.fetchWithErrorHandling(`${BASE_URL}/search/quick?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Advanced search with filters
  async advancedSearch(
    query: string,
    filter: 'all' | 'track' | 'artist' | 'album' = 'all',
    sortBy: 'relevance' | 'track_name' | 'artist' | 'album' | 'duration' = 'relevance',
    sortOrder: 'asc' | 'desc' = 'asc',
    page: number = 1,
    limit: number = 30
  ): Promise<SearchResult & { search_info: any }> {
    const params = new URLSearchParams({
      q: query,
      filter,
      sort: sortBy,
      order: sortOrder,
      page: page.toString(),
      limit: limit.toString()
    });
    return this.fetchWithErrorHandling(`${BASE_URL}/search/advanced?${params}`);
  }

  // Get random song IDs for shuffle
  async getRandomSongIds(count: number = 50, exclude: string[] = []): Promise<{ count: number; song_ids: string[]; total_available: number }> {
    const params = new URLSearchParams({
      count: count.toString(),
      ...(exclude.length > 0 && { exclude: exclude.join(',') })
    });
    return this.fetchWithErrorHandling(`${BASE_URL}/random-song-ids?${params}`);
  }

  // Get specific songs by IDs
  async getSongsByIds(songIds: string[]): Promise<{ requested_ids: string[]; found_songs: number; songs: Song[] }> {
    const params = new URLSearchParams({
      ids: songIds.join(',')
    });
    return this.fetchWithErrorHandling(`${BASE_URL}/songs-by-ids?${params}`);
  }

  // Get individual song by ID
  async getSong(songId: string): Promise<Song> {
    return this.fetchWithErrorHandling(`${BASE_URL}/song/${encodeURIComponent(songId)}`);
  }

  // Get stats
  async getStats(): Promise<Stats> {
    return this.fetchWithErrorHandling(`${BASE_URL}/stats`);
  }

  // Get unique field values for filters
  async getFieldValues(field: 'artists_string' | 'album_name' | 'playlists'): Promise<{ field: string; total_unique: number; values: string[] }> {
    return this.fetchWithErrorHandling(`${BASE_URL}/search/field-values/${field}`);
  }

  // Multi-field search
  async multiFieldSearch(
    trackQuery?: string,
    artistQuery?: string,
    albumQuery?: string,
    page: number = 1,
    limit: number = 30
  ): Promise<SearchResult & { queries: any }> {
    const params = new URLSearchParams({
      ...(trackQuery && { track: trackQuery }),
      ...(artistQuery && { artist: artistQuery }),
      ...(albumQuery && { album: albumQuery }),
      page: page.toString(),
      limit: limit.toString()
    });
    return this.fetchWithErrorHandling(`${BASE_URL}/search/multi?${params}`);
  }

  // Search by specific field
  async searchByField(
    field: 'track_name' | 'artists_string' | 'album_name',
    query: string,
    matchType: 'exact' | 'partial' | 'starts_with' = 'partial',
    page: number = 1,
    limit: number = 30
  ): Promise<SearchResult & { field: string; match_type: string }> {
    const params = new URLSearchParams({
      field,
      q: query,
      match: matchType,
      page: page.toString(),
      limit: limit.toString()
    });
    return this.fetchWithErrorHandling(`${BASE_URL}/search/by-field?${params}`);
  }

  // Health check
  async ping(): Promise<{ status: string; timestamp: string; message: string; cache_status: string }> {
    return this.fetchWithErrorHandling(`${BASE_URL}/ping`);
  }
}

export const songifyApi = new SongifyAPI();