'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Link from 'next/link';
import storyService, { Story } from '@/services/storyService';
import { useToast } from '@/contexts/ToastContext';

// Define Publication interface
interface StoryPublication {
  id: number;
  title: string;
  link: string;
  publisher_name: string;
  published_at: string;
}

// Extend the Story type to include sources
interface StoryWithSources extends Story {
  sources?: StoryPublication[];
}

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function StoryDetailPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [story, setStory] = useState<StoryWithSources | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        const storyData = await storyService.getStory(parseInt(id));
        setStory(storyData);
        setNotes(storyData.notes || '');
        setError(null);
      } catch (err) {
        console.error('Error fetching story:', err);
        setError('Failed to load story. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchStory();
    } else {
      setLoading(false);
      setError('No story ID provided');
    }
  }, [id]);

  const handleSaveNotes = async () => {
    if (!story) return;
    
    try {
      setSaving(true);
      await storyService.updateStory(story.id, { notes });
      setIsEditing(false);
      // Refresh the story data
      const updatedStory = await storyService.getStory(parseInt(id));
      setStory(updatedStory as StoryWithSources);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSource = async (sourceId: number) => {
    if (!story) return;
    try {
      await storyService.removeSourceFromStory(story.id, sourceId);
      setStory((prev) =>
        prev
          ? { ...prev, sources: (prev.sources || []).filter((s) => s.id !== sourceId) }
          : prev
      );
      toast.success('Removed from story');
    } catch (err) {
      console.error('Error removing source from story:', err);
      toast.error('Failed to remove from story');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!story) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Story not found.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" my={1}>
        <Tooltip title="Back to dashboard">
          <IconButton component={Link} href="/dashboard" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography color="primary.dark" variant="h4" component="h1" sx={{ ml: 1 }}>
          {story.title}
        </Typography>
      </Box>

      <Box display="flex" gap={3} flexDirection="column" my={1}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="h2">
                Story Details
              </Typography>
              <Box>
                {isEditing ? (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveNotes}
                    disabled={saving}
                  >
                    Save
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Notes
                  </Button>
                )}
              </Box>
            </Box>
            <Box mb={1}>
              <Typography variant="subtitle2" color="textSecondary">
                Created: {new Date(story.created_at).toLocaleDateString()}
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                Last Updated: {new Date(story.updated_at).toLocaleDateString()}
              </Typography>
            </Box>

            <Box>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  variant="outlined"
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              ) : (
                <Paper variant="outlined" sx={{ p: 2, minHeight: 200, whiteSpace: 'pre-wrap' }}>
                  {story.notes || 'No notes yet. Click "Edit Notes" to add some.'}
                </Paper>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box>
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Saved Articles : {story.sources?.length || 0}
            </Typography>
            <Divider />
              {story.sources && story.sources.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Published At</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Publisher</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                    {story.sources.map((s) => {
                      const pub = new Date(s.published_at).toLocaleDateString() || null;
                      const title = s.title || '';
                      const url = s.link || '';
                      return (
                      <TableRow key={s.id}>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{pub}</TableCell>
                        <TableCell>
                            <MuiLink
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              underline="none"
                              sx={(theme) => ({
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                borderRadius: 999,
                                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                                color: theme.palette.text.primary,
                                fontSize: 12,
                              })}
                            >
                            {title || url}
                            </MuiLink>
                          </TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            title={s.publisher_name || ''}
                            sx={(theme) => ({
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 999,
                              backgroundColor: alpha(theme.palette.primary.main, 0.12),
                              color: theme.palette.text.primary,
                                fontSize: 12,
                              })}
                            >
                              {s.publisher_name || ''}
                            </Box>
                          </TableCell>
                          <TableCell width={80} align="right">
                            <Tooltip title="Remove from story">
                              <IconButton color="error" size="small" onClick={() => handleRemoveSource(s.id)}>
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                      </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No publications linked to this story yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
  );
}
