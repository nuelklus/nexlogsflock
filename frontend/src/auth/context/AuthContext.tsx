
"use client";
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AuthTokens, User, LoginFormInputs, RegisterFormInputs } from '@/auth/types';
import { login, refreshToken, register } from '../api/index';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (data: LoginFormInputs) => Promise<void>;
  logoutUser: () => void;
  registerUser: (data: RegisterFormInputs) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedTokens = localStorage.getItem('authTokens');
        if (storedTokens) {
          const parsedTokens: AuthTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);
          setUser({
            id: parsedTokens.id,
            email: parsedTokens.email,
            first_name: parsedTokens.first_name,
            last_name: parsedTokens.last_name,
          });
        }
      } catch (error) {
        console.error('Failed to load user from storage', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const loginUser = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      const response = await login(data);
      setTokens(response);
      setUser({
        id: response.id,
        email: response.email,
        first_name: response.first_name,
        last_name: response.last_name,
      });
      localStorage.setItem('authTokens', JSON.stringify(response));
    } catch (error) {
      console.error('Login failed', error);
      logoutUser(); // Ensure no partial state is left
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: RegisterFormInputs) => {
    setIsLoading(true);
    try {
      const response = await register(data);
      setTokens(response);
      setUser({
        id: response.id,
        email: response.email,
        first_name: response.first_name,
        last_name: response.last_name,
      });
      localStorage.setItem('authTokens', JSON.stringify(response));
    } catch (error) {
      console.error('Registration failed', error);
      logoutUser();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    setTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');
    // Optionally redirect to login page
  };

  const isAuthenticated = !!tokens && !!user;

  const contextData: AuthContextType = {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    loginUser,
    logoutUser,
    registerUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
