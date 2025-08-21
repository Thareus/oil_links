
'use client';

import { AppBar, Toolbar, Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import HomeIcon from '@mui/icons-material/Home';
import { ToastProvider } from '@/contexts/ToastContext';

export default function MainLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const router = useRouter();
    return (
    <ToastProvider>
      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="contained" color="primary" onClick={() => router.push('/dashboard')}
            sx={{
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
              },
            }}>
            <HomeIcon/>
          </Button>
          <Typography variant="h6" component="div" fontWeight={600}>
            Oil Links — RSS Entries
          </Typography>
        </Toolbar>
      </AppBar>
      {children}
    </ToastProvider>
    );
  }
