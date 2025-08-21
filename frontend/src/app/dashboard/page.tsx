'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Typography,
  Button,
  Container,
  Avatar,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Link,
  Divider,
} from '@mui/material';

import LogoutIcon from '@mui/icons-material/Logout';
import AutoAwesomeMotionOutlinedIcon from '@mui/icons-material/AutoAwesomeMotionOutlined';
import { useTheme } from '@mui/material/styles';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import dynamic from 'next/dynamic';
import { ToastProvider } from '@/contexts/ToastContext';

// Dynamically import StoriesList with no SSR to avoid hydration issues
const StoriesList = dynamic(
  () => import('@/components/stories/StoriesList'),
  { ssr: false }
);

const DashboardPage = () => {
  const { user, isAuthenticated, isLoading, logout, refreshAccessToken } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const displayName = useMemo(() => {
    const first = (user as any)?.firstName || (user as any)?.first_name || '';
    const name = `${first}`.trim();
    return name || 'User';
  }, [user]);

  const initials = useMemo(() => {
    const first = (user as any)?.firstName || (user as any)?.first_name || '';
    const last = (user as any)?.lastName || (user as any)?.last_name || '';
    const letters = `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
    return letters || user?.email?.charAt(0).toUpperCase() || 'U';
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }, [logout, router]);

  if (isLoading && !isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ToastProvider>
      <ProtectedRoute>
        <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
          <Grid container spacing={4}>
            <Grid sx={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center" p={2}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        fontSize: 40,
                        mb: 2,
                        bgcolor: theme.palette.primary.main,
                      }}
                    >
                      {initials}
                    </Avatar>
                    <Typography component="h1" variant="h4" fontWeight={600} gutterBottom>
                      {greeting}, {displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Welcome to your dashboard
                    </Typography>
                    <Box display="flex" gap={2} mt={2}>
                      <Button
                        variant="outlined"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        size="small"
                      >
                        Logout
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
        <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
          <StoriesList />
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>Quick Links</Typography>
              <Divider/>
              <Box display="flex" flexDirection="column" justifyContent="flex-start" alignItems="flex-start" gap={1} my={2}>
                <Link href="/sources">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AutoAwesomeMotionOutlinedIcon />}
                    size="small"
                  >
                    View Publishers
                  </Button>
                </Link>
                <Link href="/sources/browse">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AutoAwesomeMotionOutlinedIcon />}
                    size="small"
                  >
                    View Sources
                  </Button>
                </Link>
                <Link href="/sources/stats">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AutoAwesomeMotionOutlinedIcon />}
                    size="small"
                  >
                    Publisher Stats
                  </Button>
                </Link>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </ProtectedRoute>
    </ToastProvider>
  );
};

export default DashboardPage;
