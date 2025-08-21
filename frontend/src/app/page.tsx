"use client";

import { Container, Typography, Button, Box, Paper, CircularProgress, Link } from '@mui/material';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
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
    <Container maxWidth="lg">
      <Box
        sx={{
          my: 4,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 600,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            color="primary"
            sx={{
              fontWeight: 700,
              mb: 3,
            }}
          >
            Welcome to Oil Links
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 3 }}>
            Your gateway to oil industry connections
          </Typography>
          
          <Box sx={{ mt: 3, '& > *': { m: 1 } }}>
            <Link component={Link} href="/login">
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
              >
                Sign In
              </Button>
            </Link>
            <Link component={Link} href="/register">
              <Button
                variant="outlined"
                color="primary"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  ml: 2,
                }}
              >
                Create Account
              </Button>
            </Link>
            <Link component={Link} href="/about">
              <Button
                variant="outlined"
                color="primary"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                fontSize: '1.1rem',
                ml: 2,
              }}
            >
              Learn More
            </Button>
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
