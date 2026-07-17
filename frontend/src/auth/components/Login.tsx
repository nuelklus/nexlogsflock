
"use client";
import React, { useState } from 'react';
import { useAuth } from '@/auth/context/AuthContext';
import { LoginFormInputs } from '@/auth/types';
import { Box, Button, TextField, Typography, Paper, IconButton, InputAdornment, Checkbox, FormControlLabel, Link, CircularProgress, Snackbar, Alert, Stack, Divider } from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import Image from 'next/image';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1E88E5', // Blue
    },
    secondary: {
      main: '#BA68C8', // Purple
    },
    background: {
      default: '#f5f5f5', // Soft white/light gray
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif', // Professional typography
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // Rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
        },
      },
    },
  },
});

const GradientOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'linear-gradient(45deg, rgba(30, 136, 229, 0.7) 30%, rgba(186, 104, 200, 0.7) 90%)',
  zIndex: 1,
  borderRadius: theme.shape.borderRadius,
}));

const Login = () => {
  const { loginUser } = useAuth();
  const [formData, setFormData] = useState<LoginFormInputs>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(formData);
      setSnackbarMessage('Login successful!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage('Login failed. Please check your credentials.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        '@media (max-width: 900px)': {
          flexDirection: 'column',
        },
      }}>
        {/* Left side - Image and Brand */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            overflow: 'hidden',
            borderRadius: '0 16px 16px 0',
            '@media (max-width: 900px)': {
              display: 'none', // Hide on mobile
            },
          }}
        >
          <Image
            src="/images/poultry-farm-hero.jpg"
            alt="Poultry Farm Management"
            layout="fill"
            objectFit="cover"
            quality={100}
            priority
          />
          <GradientOverlay />
          <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', p: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              NexlogsFlock
            </Typography>
            <Typography variant="h6" component="p">
              Smart poultry management made simple
            </Typography>
          </Box>
        </Box>

        {/* Right side - Login Form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            '@media (max-width: 900px)': {
              flex: 1,
              width: '100%',
              p: 2,
            },
          }}
        >
          <Paper elevation={8} sx={{
            p: 4,
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-5px)',
            },
            '@media (max-width: 600px)': {
              p: 3,
            },
          }}>
            <Typography variant="h4" component="h2" gutterBottom align="center">
              Welcome Back
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Sign in to continue to NexlogsFlock
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                size="medium"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControlLabel
                  control={<Checkbox value="remember" color="primary" />}
                  label="Remember me"
                />
                <Link href="#" variant="body2" sx={{ color: '#1E88E5', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Forgot password?
                </Link>
              </Box>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Typography variant="body2">
                  Don't have an account? {' '}
                  <Link href="#" variant="body2" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Register Now
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default Login;
