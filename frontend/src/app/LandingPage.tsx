"use client";
import React from 'react';
import Image from 'next/image';
import { Box, Button, Typography, Container, Link as MuiLink } from '@mui/material';
import Login from '@/auth/components/Login';
import { AuthProvider } from '@/auth/context/AuthContext';
import NextLink from 'next/link';
import { useState } from 'react';

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <AuthProvider>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to right, #f0f2f5, #e0e4e8)', // Light gradient background
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 8,
              overflow: 'hidden',
            }}
          >
            {/* Left Section: Text Content and Actions */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 4, md: 8 },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              {showLogin ? (
                <Box>
                  <Button onClick={() => setShowLogin(false)} sx={{ mb: 2 }}>
                    Back to Landing
                  </Button>
                  <Login />
                </Box>
              ) : (
                <>
                  <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    NexlogsFlock
                  </Typography>
                  <Typography variant="h2" component="h2" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
                    Smart Poultry Management Made Simple
                  </Typography>
                  <Typography variant="h6" component="p" color="text.secondary" sx={{ mt: 3 }}>
                    Manage farms, birds, eggs, harvest, inventory, sales, and analytics from one intelligent platform.
                  </Typography>
                  <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                    <Button variant="contained" size="large" onClick={() => setShowLogin(true)}>
                      Login
                    </Button>
                    <MuiLink component={NextLink} href="/register" passHref underline="none">
                      <Button variant="text" size="large">
                        Don't have an account? Register
                      </Button>
                    </MuiLink>
                  </Box>
                </>
              )}
            </Box>

            {/* Right Section: Image */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, md: 0 },
                bgcolor: '#e0e4e8', // Slightly darker background for image section
              }}
            >
              <Image
                src="/images/poultry-farm-hero.jpg" // Placeholder image
                alt="Modern poultry farm management"
                width={800}
                height={600}
                layout="responsive"
                objectFit="cover"
                style={{ borderRadius: '0 8px 8px 0' }}
              />
            </Box>
          </Box>
        </Container>
      </Box>
    </AuthProvider>
  );
};

export default LandingPage;
