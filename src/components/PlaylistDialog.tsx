import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlaylists } from '@/hooks/usePlaylists';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, ListPlus } from 'lucide-react';

interface PlaylistDialogProps {
  song?: any;
  variant?: 'create' | 'add';
}

const PlaylistDialog = ({ song, variant = 'create' }: PlaylistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylists();

  if (!user) return null;

  const userPlaylists = playlists.filter(p => p.user_id === user.id);

  const handleCreatePlaylist = async () => {
    if (!title.trim()) {
      toast.error('Please enter a playlist title');
      return;
    }

    setLoading(true);
    const { error } = await createPlaylist(title, description);
    
    if (error) {
      toast.error('Error creating playlist');
    } else {
      toast.success('Playlist created successfully!');
      setTitle('');
      setDescription('');
      setOpen(false);
    }
    setLoading(false);
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylistId) {
      toast.error('Please select a playlist');
      return;
    }

    setLoading(true);
    const { error } = await addSongToPlaylist(selectedPlaylistId, song);
    
    if (error) {
      toast.error('Error adding song to playlist');
    } else {
      toast.success('Song added to playlist!');
      setSelectedPlaylistId('');
      setOpen(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={variant === 'add' ? 'sm' : 'default'}>
          {variant === 'create' ? (
            <>
              <Plus className="h-4 w-4 mr-2" />
              New Playlist
            </>
          ) : (
            <>
              <ListPlus className="h-4 w-4 mr-2" />
              Add to Playlist
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {variant === 'create' ? 'Create New Playlist' : 'Add to Playlist'}
          </DialogTitle>
          <DialogDescription>
            {variant === 'create' 
              ? 'Create a new public playlist that others can discover and enjoy.'
              : 'Add this song to one of your existing playlists.'
            }
          </DialogDescription>
        </DialogHeader>
        
        {variant === 'create' ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Amazing Playlist"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your playlist..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="playlist">Select Playlist</Label>
              <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a playlist" />
                </SelectTrigger>
                <SelectContent>
                  {userPlaylists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userPlaylists.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You don't have any playlists yet. Create one first!
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button 
            onClick={variant === 'create' ? handleCreatePlaylist : handleAddToPlaylist} 
            disabled={loading || (variant === 'add' && userPlaylists.length === 0)}
          >
            {loading ? 'Loading...' : variant === 'create' ? 'Create Playlist' : 'Add Song'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistDialog;