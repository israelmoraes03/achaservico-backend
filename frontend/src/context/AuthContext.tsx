import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from '../services/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  phone?: string;
  is_provider: boolean;
}

interface Provider {
  provider_id: string;
  user_id: string;
  name: string;
  phone: string;
  category: string;
  neighborhood: string;
  description: string;
  profile_image?: string;
  average_rating: number;
  total_reviews: number;
  is_active: boolean;
  subscription_status: string;
  subscription_expires_at?: string;
}

interface AuthContextType {
  user: User | null;
  provider: Provider | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/session', {}, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const { user: userData, session_token } = response.data;
      
      await AsyncStorage.setItem('session_token', session_token);
      setUser(userData);
      
      // Check if user has provider profile
      await refreshUser();
    } catch (error) {
      console.error('Error processing session:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const extractSessionId = (url: string): string | null => {
    // Try hash first
    const hashMatch = url.match(/#session_id=([^&]+)/);
    if (hashMatch) return hashMatch[1];
    
    // Try query string
    const queryMatch = url.match(/[?&]session_id=([^&]+)/);
    if (queryMatch) return queryMatch[1];
    
    return null;
  };

  const checkExistingSession = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setProvider(response.data.provider);
      }
    } catch (error) {
      console.error('Session check error:', error);
      await AsyncStorage.removeItem('session_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // Check for session_id in URL (web)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        const sessionId = extractSessionId(hash || window.location.search);
        if (sessionId) {
          window.history.replaceState(null, '', window.location.pathname);
          await processSessionId(sessionId);
          return;
        }
      }
      
      // Check for cold start deep link (mobile)
      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const sessionId = extractSessionId(initialUrl);
          if (sessionId) {
            await processSessionId(sessionId);
            return;
          }
        }
      }
      
      // Check existing session
      await checkExistingSession();
    };
    
    init();
  }, [processSessionId, checkExistingSession]);

  const login = async () => {
    try {
      setIsLoading(true);
      
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + '/'
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionId = extractSessionId(result.url);
          if (sessionId) {
            await processSessionId(sessionId);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setProvider(null);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setProvider(response.data.provider);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        provider,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
