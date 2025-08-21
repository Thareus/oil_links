'use client';

import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Link,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import { TextField } from '../ui/TextField';
import { useAuth } from '@/contexts/AuthContext';

const RegisterForm = () => {
  const theme = useTheme();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { email, firstName, lastName, password, confirmPassword } = formData;
    
    if (!email || !firstName || !lastName || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const result = await register(formData);
      if (result.success) {
        router.push('/dashboard');
      } else {
        const errorMessage = result.error || 'Registration failed. Please try again.';
        setError(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 500,
          borderRadius: 2,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join us today and start your journey
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              id="firstName"
              name="firstName"
              label="First Name"
              autoComplete="given-name"
              fullWidth
              value={formData.firstName}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              id="lastName"
              name="lastName"
              label="Last Name"
              autoComplete="family-name"
              fullWidth
              value={formData.lastName}
              onChange={handleChange}
              margin="normal"
              required
            />
          </Box>

          <TextField
            id="email"
            name="email"
            label="Email Address"
            type="email"
            autoComplete="email"
            fullWidth
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            helperText="Password must be at least 8 characters long"
          />

          <TextField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              mt: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Account'
            )}
          </Button>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link href="/login" color="primary" underline="hover">
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterForm;
