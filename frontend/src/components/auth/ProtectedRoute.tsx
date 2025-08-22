'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'user';
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  requiredRole = 'user',
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // If not authenticated, redirect to login
        router.push(redirectTo);
      } else if (requiredRole === 'admin' && !user?.is_staff) {
        // If admin access required but user is not admin
        router.push('/unauthorized');
      } else {
        // User is authorized
        setIsAuthorized(true);
      }
    }
  }, [isAuthenticated, isLoading, requiredRole, router, redirectTo, user]);

  if (isLoading || !isAuthenticated || (requiredRole === 'admin' && !user?.is_staff)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
