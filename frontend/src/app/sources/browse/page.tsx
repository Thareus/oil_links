'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Typography,
  Container,
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel,
  OutlinedInput,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  CircularProgress,
  Tooltip,
  Link as MuiLink,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HideSourceIcon from '@mui/icons-material/HideSource';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import publicationService, { Publication } from '@/services/publicationService';
import publisherService from '@/services/publisherService';
import storyService from '@/services/storyService';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

type SortKey = 'published_at' | 'title' | 'publisher_name';
type SortDir = 'asc' | 'desc';

function parseISO(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(dateStr?: string | null): string {
  const d = parseISO(dateStr || null);
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function SourcesPage() {
  // Page state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Data state
  const [items, setItems] = useState<Publication[]>([]);
  const [publishers, setPublishers] = useState<string[]>([]);
  // Filters
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [start, setStart] = useState<string>(''); // yyyy-mm-dd
  const [end, setEnd] = useState<string>(''); // yyyy-mm-dd
  const [debouncedStart, setDebouncedStart] = useState<string>('');
  const [debouncedEnd, setDebouncedEnd] = useState<string>('');
  // Server-side pagination state
  const PAGE_SIZE = 100;
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('published_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Meta
  const [total, setTotal] = useState<number>(0);
  const [matchedCount, setMatchedCount] = useState<number>(0);
  const toast = useToast();

  // Updated label
  const mostRecentDate = useMemo(() => {
    const validTimes = items
      .map((e) => parseISO(e.published_at)?.getTime())
      .filter((t): t is number => typeof t === 'number');
    if (!validTimes.length) return null;
    return new Date(Math.max(...validTimes));
  }, [items]);

  const updatedLabel = useMemo(() => {
    if (!mostRecentDate) return 'No dates available';
    return mostRecentDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [mostRecentDate]);

  const makeOrdering = (key: SortKey, dir: SortDir) => {
    const field = key === 'publisher_name' ? 'publisher__name' : key;
    return `${dir === 'desc' ? '-' : ''}${field}`;
  };

  const fetchingRef = useRef(false);
  const fetchSeqRef = useRef(0); // sequence to ignore stale responses

  const fetchPage = async (nextOffset: number, replace = false) => {
    try {
      // Allow replacement fetches (filter/sort changes) to proceed even if one is in-flight
      if (fetchingRef.current && !replace) return;
      fetchingRef.current = true;
      const mySeq = ++fetchSeqRef.current;
      setLoading(true);
      setError(null);
      const res = await publicationService.listVisiblePublications({
        limit: PAGE_SIZE,
        offset: nextOffset,
        q: debouncedQ.trim() || undefined,
        start: debouncedStart || undefined,
        end: debouncedEnd || undefined,
        sources: selectedSources.length ? selectedSources : undefined,
        ordering: makeOrdering(sortKey, sortDir),
      });
      const newItems = res.results || [];
      // Ignore if a newer request has started since this one
      if (mySeq !== fetchSeqRef.current) return;
      setMatchedCount(typeof res.count === 'number' ? res.count : newItems.length);
      setItems((prev) => (replace ? newItems : [...prev, ...newItems]));
      setOffset(nextOffset + newItems.length);
      setHasMore(Boolean(res?.next) && newItems.length > 0);
    } catch (err) {
      console.error('Error fetching publications:', err);
      setError('Failed to load sources. Please try again.');
      if (replace) setItems([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Initial meta + publishers and first page
  useEffect(() => {
    (async () => {
      try {
        const [meta, pubs] = await Promise.all([
          publicationService.getMeta().catch(() => ({ latest_published: null, total: 0 })),
          publisherService.getPublishers().catch(() => []),
        ]);
        setTotal(meta?.total || 0);
        setPublishers(Array.isArray(pubs) ? pubs.map(p => p.name).sort() : []);
      } catch {
        // non-fatal for initial load
      } finally {
        // always fetch first page
        setItems([]);
        setOffset(0);
        setHasMore(true);
        fetchPage(0, true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the query input to avoid fetching on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 750);
    return () => clearTimeout(t);
  }, [q]);

  // Debounce start/end date inputs
  useEffect(() => {
    const t = setTimeout(() => setDebouncedStart(start), 750);
    return () => clearTimeout(t);
  }, [start]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEnd(end), 750);
    return () => clearTimeout(t);
  }, [end]);

  // When filters/sort change, reset and refetch first page
  const firstFiltersRun = useRef(true);
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    if (firstFiltersRun.current) {
      firstFiltersRun.current = false;
    } else {
      toast.info('Filters updated');
    }
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, debouncedStart, debouncedEnd, selectedSources, sortKey, sortDir]);

  // Reset scroll when filters/sort change
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [debouncedQ, debouncedStart, debouncedEnd, selectedSources, sortKey, sortDir]);

  // Infinite scroll: fetch next page when TableContainer is near bottom
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 120;
        if (nearBottom && hasMore && !loading) fetchPage(offset);
      });
    };
    el.addEventListener('scroll', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [hasMore, loading, offset]);

  const onHeaderClick = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir(key === 'title' ? 'asc' : 'desc');
      }
    },
    [sortKey]
  );

  const handleStoryAdd = async (id: string) => {
    try {
      const publicationId = parseInt(id, 10);
      if (Number.isNaN(publicationId)) return;

      // Find the current story
      const stories = await storyService.getStories();
      const current = stories.find((s) => s.is_current);
      if (!current) {
        console.warn('No current story found. Set a story as current first.');
        toast.warning('No current story set');
        return;
      }

      // Create the relation between current story and the publication
      await storyService.addSourceToStory(current.id, publicationId);
      toast.success('Added to current story');
    } catch (err) {
      console.error('Failed to add publication to current story:', err);
      toast.error('Failed to add to story');
    }
  };

  const handlePublicationHide = async (id: number, hidden: boolean) => {
    try {
      await publicationService.updatePublication(id, { hidden });
      // Remove the hidden item from the current table view
      setItems((prev) => prev.filter((p) => p.id !== id));
      setMatchedCount((c) => (typeof c === 'number' ? Math.max(0, c - 1) : c));
      // Adjust offset so we don't skip an item on next page fetch
      setOffset((o) => Math.max(0, o - 1));
      toast.success('Article hidden');
    } catch (err) {
      console.error('Failed to hide publication:', err);
      toast.error('Failed to hide article');
    }
  };

  const handlePublisherHide = async (id: number, hidden: boolean) => {
    try {
      await publisherService.updatePublisher(id, { hidden });
      // After hiding a publisher, refresh the list
      setItems([]);
      setOffset(0);
      setHasMore(true);
      fetchPage(0, true);
      toast.success('Publisher hidden');
    } catch (err) {
      console.error('Failed to hide publisher:', err);
      toast.error('Failed to hide publisher');
    }
  };

  return (
    <Box sx={{ minHeight: '90vh', bgcolor: 'background.default' }}>
      {loading && items.length === 0 ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Container maxWidth="lg" sx={{ height: '100%', my: 1 }}>
          <Paper
            elevation={1}
            sx={{
            p: { xs: 2, sm: 3 },
            mb: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" fontWeight={600} align="center" py={2}>
            Search for Sources
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 12, md: 6 }}>
              <InputLabel id="search-label" shrink sx={{ ml: 1 }}>Search keywords</InputLabel>
              <TextField
                fullWidth
                placeholder="Type to filter..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InputLabel id="start-date-label" shrink sx={{ ml: 1 }}>Start date (published)</InputLabel>
              <TextField
                fullWidth
                placeholder=""
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <InputLabel id="end-date-label" shrink sx={{ ml: 1 }}>End date (published)</InputLabel>
              <TextField
                fullWidth
                placeholder=""
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel id="sources-label">Source</InputLabel>
                <Select
                  labelId="sources-label"
                  multiple
                  value={selectedSources}
                  onChange={(e) => setSelectedSources(e.target.value as string[])}
                  input={<OutlinedInput label="Source" />}
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  {publishers.map((publisherName) => (
                    <MenuItem key={publisherName} value={publisherName}>
                      <Checkbox checked={selectedSources.includes(publisherName)} />
                      <ListItemText primary={publisherName} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>
          {matchedCount} matched of {total} total | Loaded {items.length} | Sort: {sortKey}{' '}
          {sortDir.toUpperCase()}
        </Typography>

        <TableContainer
          component={Paper}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'auto',
            maxHeight: '70vh',
          }}
          ref={tableContainerRef}
        >
          <Table stickyHeader size="small" aria-label="RSS sources table" sx={{ fontSize: 12, height: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell
                  onClick={() => onHeaderClick('published_at')}
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  Published
                </TableCell>
                <TableCell
                  onClick={() => onHeaderClick('title')}
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  Title
                </TableCell>
                <TableCell
                  onClick={() => onHeaderClick('publisher_name')}
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  Source
                </TableCell>
                <TableCell
                  sx={{ color: 'text.secondary', fontWeight: 600 }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => {
                const pub = fmtDate(r.published_at || null);
                const title = r.title || '';
                const url = r.link || '';
                return (
                  <TableRow key={r.id}>
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
                        title={r.publisher_name || ''}
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
                        {r.publisher_name || ''}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Grid sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Tooltip title="Add to story">
                          <AddCircleOutlineIcon
                            sx={{
                              color: 'success.main',
                              borderRadius: 999,
                              '&:hover': {
                                color: 'success.dark',
                                cursor: 'pointer',
                                bgcolor: '#CCC',
                              },
                            }}
                            onClick={() => handleStoryAdd(`${r.id}`)}
                          />
                        </Tooltip>
                        <Tooltip title="Hide this article">
                          <HideSourceIcon 
                            sx={{
                              color: 'warning.main',
                              borderRadius: 999,
                              '&:hover': {
                                color: 'warning.dark',
                                cursor: 'pointer',
                                bgcolor: '#CCC',
                              },
                            }}
                            onClick={() => handlePublicationHide(r.id, true)}
                          />
                        </Tooltip>
                        <Tooltip title="Hide all from Publisher">
                          <CancelPresentationIcon 
                            sx={{
                              color: 'error.main',
                              borderRadius: 999,
                              '&:hover': {
                                color: 'error.dark',
                                cursor: 'pointer',
                                bgcolor: '#CCC',
                              },
                            }}
                            onClick={() => handlePublisherHide(r.publisher, true)}
                          />
                        </Tooltip>
                      </Grid>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box component="footer" sx={{ py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 12 }}>
          And it's Liverpool asking all the questions
        </Box>
      </Container>
      )}
    </Box>
  );
}
