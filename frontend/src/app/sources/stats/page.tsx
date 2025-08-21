'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Divider,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import publisherService, { Publisher } from '@/services/publisherService';
import storyService, { Story } from '@/services/storyService';

type SavedCounts = Record<string, { count: number; ids: Set<number> }>; // key: publisher_name

export default function PublisherStatsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [pubs, sts] = await Promise.all([
          publisherService.getPublishers().catch(() => []),
          storyService.getStories().catch(() => []),
        ]);
        if (!alive) return;
        setPublishers(pubs || []);
        setStories(sts || []);
      } catch (e) {
        if (!alive) return;
        setError('Failed to load stats. Please try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const savedByPublisher: SavedCounts = useMemo(() => {
    const acc: SavedCounts = {};
    for (const s of stories) {
      const srcs = Array.isArray(s.sources) ? s.sources : [];
      for (const src of srcs) {
        const key = src.publisher_name || 'Unknown';
        if (!acc[key]) acc[key] = { count: 0, ids: new Set<number>() };
        // De-duplicate publications that appear in multiple stories
        if (!acc[key].ids.has(src.id)) {
          acc[key].ids.add(src.id);
          acc[key].count += 1;
        }
      }
    }
    return acc;
  }, [stories]);

  const rows = useMemo(() => {
    const items = publishers.map((p) => {
      const saved = savedByPublisher[p.name]?.count || 0;
      const total = p.publication_count ?? 0;
      return {
        name: p.name,
        total,
        saved: Math.min(saved, total),
        hidden: !!p.hidden,
      };
    });
    // Include any publishers that appear only via saved stories but might be hidden
    for (const name of Object.keys(savedByPublisher)) {
      if (!items.find((i) => i.name === name)) {
        const saved = savedByPublisher[name]?.count || 0;
        items.push({ name, total: saved, saved, hidden: false });
      }
    }
    // Sort by total desc
    return items.sort((a, b) => b.total - a.total);
  }, [publishers, savedByPublisher]);

  const maxTotal = useMemo(() => rows.reduce((m, r) => Math.max(m, r.total), 0) || 1, [rows]);
  const totals = useMemo(() => {
    const totalPubs = rows.reduce((s, r) => s + r.total, 0);
    const totalSaved = rows.reduce((s, r) => s + r.saved, 0);
    const pct = totalPubs ? Math.round((totalSaved / totalPubs) * 100) : 0;
    return { totalPubs, totalSaved, pct };
  }, [rows]);

  if (isLoading && !isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" component="h1" fontWeight={700} gutterBottom>
              Publisher Save Coverage
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Visualizes total publications per publisher and how many are saved across your stories.
            </Typography>
            <Divider sx={{ my: 2 }} />

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <>
                <Box display="flex" gap={2} alignItems="center" mb={2}>
                  <Box width={16} height={16} borderRadius={0.5} sx={{ bgcolor: theme.palette.primary.main }} />
                  <Typography variant="body2">Saved</Typography>
                  <Box width={16} height={16} borderRadius={0.5} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.12) }} />
                  <Typography variant="body2">Unsaved</Typography>
                </Box>

                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Overall: {totals.totalSaved} / {totals.totalPubs} saved ({totals.pct}%)
                </Typography>

                <Grid container spacing={2}>
                  {rows.map((r) => {
                    const savedPct = r.total ? (r.saved / r.total) : 0;
                    const widthPct = r.total ? Math.max((r.total / maxTotal) * 100, 2) : 0; // ensure minimal width
                    return (
                      <Grid item xs={12} key={r.name}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box minWidth={200} maxWidth={300} flexShrink={0}>
                            <Tooltip title={r.hidden ? 'Publisher is hidden' : ''}>
                              <Typography variant="body1" noWrap fontWeight={600} color={r.hidden ? 'text.disabled' : 'text.primary'}>
                                {r.name}
                              </Typography>
                            </Tooltip>
                          </Box>
                          <Box flex={1}>
                            <Box
                              sx={{
                                position: 'relative',
                                height: 24,
                                bgcolor: alpha(theme.palette.text.primary, 0.12),
                                borderRadius: 1,
                                overflow: 'hidden',
                                width: `${widthPct}%`,
                                minWidth: 80,
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  width: `${Math.min(100, Math.max(0, savedPct * 100))}%`,
                                  bgcolor: theme.palette.primary.main,
                                }}
                              />
                              <Box
                                sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', px: 1 }}
                              >
                                <Typography variant="caption" sx={{ color: theme.palette.getContrastText(theme.palette.primary.main) }}>
                                  {r.saved} / {r.total}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </ProtectedRoute>
  );
}

