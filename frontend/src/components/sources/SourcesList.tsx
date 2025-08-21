'use client';

import { useEffect, useRef, useState } from 'react';
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
  Chip,
  ListSubheader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link as MuiLink,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import publisherService, { Publisher } from '@/services/publisherService';
import { useToast } from '@/contexts/ToastContext';

export default function SourcesList() {
  const PAGE_SIZE = 100;
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [offset, setOffset] = useState<number>(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const fetchSeqRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(null);
  const [formData, setFormData] = useState({
    name: ''
  });
  const [filter, setFilter] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState<'all' | 'hidden' | 'visible'>('all');
  const toast = useToast();

  const fetchPublishers = async (nextOffset: number, replace = false) => {
    try {
      // Allow replacement fetches (e.g., filter change) to interrupt ongoing non-replace fetches
      if (fetchingRef.current && !replace) return;
      fetchingRef.current = true;
      const mySeq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);
      const res = await publisherService.listPublishers({
        limit: PAGE_SIZE,
        offset: nextOffset,
        q: debouncedFilter.trim() || undefined,
        hidden: hiddenFilter === 'all' ? undefined : hiddenFilter === 'hidden',
        ordering: 'name',
      });
      const newItems = res.results || [];
      // Ignore stale responses
      if (mySeq !== fetchSeqRef.current) return;
      setPublishers((prev) => (replace ? newItems : [...prev, ...newItems]));
      setOffset(nextOffset + newItems.length);
      setHasMore(Boolean(res?.next) && newItems.length > 0);
    } catch (err) {
      console.error('Error fetching publishers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load publishers. Please try again.');
      if (replace) setPublishers([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // initial page
    setPublishers([]);
    setOffset(0);
    setHasMore(true);
    fetchPublishers(0, true);
  }, []);

  // Debounce the name filter to avoid filtering on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter), 350);
    return () => clearTimeout(t);
  }, [filter]);

  // Refetch when filters change
  useEffect(() => {
    setPublishers([]);
    setOffset(0);
    setHasMore(true);
    fetchPublishers(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilter, hiddenFilter]);

  // Infinite scroll
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
      if (nearBottom && hasMore && !loading) fetchPublishers(offset);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMore, loading, offset]);

  const handleOpenDialog = (publisher: Publisher | null = null) => {
    if (publisher) {
      setEditingPublisher(publisher);
      setFormData({
        name: publisher.name
      });
    } else {
      setEditingPublisher(null);
      setFormData({
        name: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPublisher) {
        const updated = await publisherService.updatePublisher(editingPublisher.id, formData);
        // Optimistically update local list without refetching
        setPublishers((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        toast.success('Publisher updated');
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Error updating publisher:', err);
      setError('Failed to update publisher. Please try again.');
      toast.error('Failed to update publisher');
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPublisher(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleHide = async (id: number, hidden: boolean) => {
    try {
      await publisherService.updatePublisher(id, { hidden });
      setPublishers((prev) => prev.map((p) => (p.id === id ? { ...p, hidden } : p)));
      toast.success(hidden ? 'Publisher hidden' : 'Publisher unhidden');
    } catch (err) {
      console.error('Error hiding publisher:', err);
      setError('Failed to update hidden status. Please try again.');
      toast.error('Failed to update hidden status');
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
        <Typography variant="h3" fontWeight={600} mb={2} gutterBottom>
          Publishers
        </Typography>
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="Filter by name"
            placeholder="Type to filter publishers"
            size="small"
            fullWidth
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="hidden-filter-label">Hidden</InputLabel>
            <Select
              labelId="hidden-filter-label"
              label="Hidden"
              value={hiddenFilter}
              onChange={(e) => setHiddenFilter(e.target.value as 'all' | 'hidden' | 'visible')}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="hidden">Hidden</MenuItem>
              <MenuItem value="visible">Visible</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {error && (
          <Typography color="error" variant="body2" gutterBottom>
            {error}
          </Typography>
        )}

        {loading && publishers.length === 0 ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : publishers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" py={2}>
            No publishers found.
          </Typography>
        ) : (
          <List
            subheader={
              <ListSubheader
                component="div"
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Box display="flex" alignItems="center" px={1}>
                  <Typography variant="overline" sx={{ flex: 2 }}>Name</Typography>
                  <Typography variant="overline" sx={{ flex: 1 }}>Created</Typography>
                  <Typography variant="overline" sx={{ flex: 1 }}>Hidden (click to change)</Typography>
                  <Typography variant="overline" sx={{ width: 140, textAlign: 'right' }}>Actions</Typography>
                </Box>
              </ListSubheader>
            }
          >
            <Box ref={listContainerRef} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
            {publishers.map((publisher: Publisher) => (
                <div key={publisher.id}>
                <ListItem>
                  <Box display="flex" alignItems="center" width="100%">
                    <Box sx={{ flex: 2 }}>
                      <MuiLink
                        href={publisher.website.startsWith('http') ? publisher.website : `https://${publisher.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ fontSize: '0.95rem', fontWeight: 500 }}
                      >
                        {publisher.name}
                      </MuiLink>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(publisher.created_at)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Chip
                        size="small"
                        label={publisher.hidden ? 'Hidden' : 'Visible'}
                        color={publisher.hidden ? 'error' : 'success'}
                        variant={publisher.hidden ? 'filled' : 'outlined'}
                        clickable
                        onClick={() => handleHide(publisher.id, !publisher.hidden)}
                      />
                    </Box>
                    <Box sx={{ width: 140, display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton
                        aria-label="Edit publisher"
                        edge="end"
                        size="small"
                        onClick={() => handleOpenDialog(publisher)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
                <Divider component="li" />
              </div>
            ))}
            {loading && publishers.length > 0 && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={20} />
              </Box>
            )}
            </Box>
          </List>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingPublisher ? 'Edit Publisher' : 'Create New Publisher'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingPublisher ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Card>
  );
}
