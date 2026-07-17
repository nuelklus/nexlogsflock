"use client";
import LandingPage from './LandingPage';
import { AuthProvider } from '@/auth/context/AuthContext';

export default function Home() {
  return (
    <AuthProvider>
      <div>
        <LandingPage />
      </div>
    </AuthProvider>
  );
}
