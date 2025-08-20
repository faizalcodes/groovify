-- To run migration visit here 
-- https://supabase.com/dashboard/project/zmgsjnxkvigvyabxwebm/sql/afc7ab37-3ecf-43bd-81a2-fd5ba9acc580
-- Add missing columns to playlist_songs table
ALTER TABLE public.playlist_songs 
ADD COLUMN cover_art_url TEXT,
ADD COLUMN album_name TEXT,
ADD COLUMN duration_formatted TEXT;
