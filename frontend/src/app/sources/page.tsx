'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  Box,
  Container,
  CircularProgress,
} from '@mui/material';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import dynamic from 'next/dynamic';


// Dynamically import StoriesList with no SSR to avoid hydration issues
const SourcesList = dynamic(
  () => import('@/components/sources/SourcesList'),
  { ssr: false }
);

const SourcesPage = () => {
  const { user, isAuthenticated, isLoading, logout, refreshAccessToken } = useAuth();

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
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
        <SourcesList />
      </Container>
    </ProtectedRoute>
  );
};

export default SourcesPage;