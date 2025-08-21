import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2c6dad', // #2c6dad
      light: '#4e91c7', // #4e91c7
      dark: '#335b8a', // #335b8a
      contrastText: '#fff', // #fff
    },
    secondary: {
      main: '#9c27b0', // #9c27b0
      light: '#ba68c8', // #ba68c8
      dark: '#7b1fa2', // #7b1fa2
      contrastText: '#fff', // #fff
    },
    error: {
      main: '#d32f2f', // #d32f2f
    },
    warning: {
      main: '#ed6c02', // #ed6c02
    },
    info: {
      main: '#0288d1', // #0288d1
    },
    success: {
      main: '#2e7d32', // #2e7d32
    },
    background: {
      default: '#f5f5f5', // #f5f5f5
      paper: '#ffffff', // #ffffff
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
