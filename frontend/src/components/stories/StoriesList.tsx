'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import storyService, { Story } from '@/services/storyService';
import { useToast } from '@/contexts/ToastContext';

export default function StoriesList() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [formData, setFormData] = useState({
    title: ''
  });
  const toast = useToast();

  const fetchStories = async () => {
    try {
      setLoading(true);
      const data = await storyService.getStories();
      
      // Ensure data is an array before setting it to state
      if (!Array.isArray(data)) {
        console.error('Expected array but received:', data);
        setError('Invalid data format received from server');
        setStories([]);
        return;
      }
      
      setStories(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stories. Please try again.');
      setStories([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleOpenDialog = (story: Story | null = null) => {
    if (story) {
      setEditingStory(story);
      setFormData({
        title: story.title
      });
    } else {
      setEditingStory(null);
      setFormData({
        title: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStory(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStory) {
        await storyService.updateStory(editingStory.id, formData);
        toast.success('Story updated');
      } else {
        await storyService.createStory(formData);
        // Optional: toast.success('Story created');
      }
      await fetchStories();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving story:', err);
      setError('Failed to save story. Please try again.');
      toast.error('Failed to save story');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      try {
        await storyService.deleteStory(id);
        await fetchStories();
        toast.success('Story deleted');
      } catch (err) {
        console.error('Error deleting story:', err);
        setError('Failed to delete story. Please try again.');
        toast.error('Failed to delete story');
      }
    }
  };

  const handleSetCurrent = async (id: number) => {
    try {
      await storyService.setCurrentStory(id);
      // Update local state to reflect the current story
      setStories(prevStories =>
        prevStories.map(story => ({
          ...story,
          is_current: story.id === id,
        }))
      );
    } catch (err) {
      console.error('Error setting current story:', err);
      setError('Failed to set current story. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>Stories</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            size="small"
          >
            New Story
          </Button>
        </Box>

        {error && (
          <Typography color="error" variant="body2" gutterBottom>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : stories.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" py={2}>
            No stories found. Create your first story to get started.
          </Typography>
        ) : (
          <List>
            {stories.map((story) => (
              <div key={story.id}>
                <ListItem>
                  <Box flexGrow={1}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Tooltip title={story.is_current ? 'Current story' : 'Set as current'}>
                        <IconButton
                          size="small"
                          onClick={() => !story.is_current && handleSetCurrent(story.id)}
                          color={story.is_current ? 'primary' : 'default'}
                        >
                          {story.is_current ? (
                            <CheckCircleIcon color="primary" />
                          ) : (
                            <RadioButtonUncheckedIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Link href={`/stories/${story.id}`} passHref>
                        <Typography 
                          variant="h6"
                          sx={{
                            color: 'primary.main',
                            textDecoration: 'none',
                            '&:hover': {
                              textDecoration: 'underline',
                              cursor: 'pointer',
                            },
                          }}
                        >
                          {story.title}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        Created: {formatDate(story.created_at)}
                        {story.updated_at !== story.created_at && ` • Updated: ${formatDate(story.updated_at)}`}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Tooltip title="Edit">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleOpenDialog(story)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleDelete(story.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
                <Divider/>
              </div>
            ))}
          </List>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingStory ? 'Edit Story' : 'Create New Story'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="title"
              label="Title"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingStory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
}
