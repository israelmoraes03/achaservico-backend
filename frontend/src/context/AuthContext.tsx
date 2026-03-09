import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import api from '../services/api';

// Warm up browser for faster auth on Android
WebBrowser.maybeCompleteAuthSession();

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

  const extractSessionId = (url: string): string | null => {
    try {
      // Try hash first
      const hashMatch = url.match(/#session_id=([^&]+)/);
      if (hashMatch) return hashMatch[1];
      
      // Try query string
      const queryMatch = url.match(/[?&]session_id=([^&]+)/);
      if (queryMatch) return queryMatch[1];
    } catch (e) {
      console.error('Error extracting session ID:', e);
    }
    return null;
  };

  const processSessionId = useCallback(async (sessionId: string, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    try {
      setIsLoading(true);
      console.log(`Processing session ID... (attempt ${retryCount + 1})`);
      
      const response = await api.post('/auth/session', {}, {
        headers: { 'X-Session-ID': sessionId },
        timeout: 15000
      });
      
      const { user: userData, session_token } = response.data;
      
      await AsyncStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      setUser(userData);
      
      // Check if user has provider profile
      try {
        const meResponse = await api.get('/auth/me', { timeout: 10000 });
        setProvider(meResponse.data.provider);
      } catch (e) {
        console.log('No provider profile');
      }
    } catch (error: any) {
      console.error('Error processing session:', error.message);
      
      // Retry if server is waking up
      if (retryCount < maxRetries && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network'))) {
        console.log(`Server may be waking up, retrying in ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return processSessionId(sessionId, retryCount + 1);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkExistingSession = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    try {
      console.log(`Checking existing session... (attempt ${retryCount + 1})`);
      const token = await AsyncStorage.getItem('session_token');
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('/auth/me', { timeout: 15000 }); // 15 second timeout
        setUser(response.data.user);
        setProvider(response.data.provider);
        console.log('Session restored');
      } else {
        console.log('No existing session');
      }
    } catch (error: any) {
      console.log('Session check failed:', error.message);
      
      // If server is waking up (timeout or network error), retry
      if (retryCount < maxRetries && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Network'))) {
        console.log(`Server may be waking up, retrying in ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return checkExistingSession(retryCount + 1);
      }
      
      // Clear token only if it's an auth error (401), not a network error
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('session_token');
        delete api.defaults.headers.common['Authorization'];
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Check for session_id in URL (web only)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash;
          const search = window.location.search;
          const sessionId = extractSessionId(hash || search);
          
          if (sessionId) {
            // Clean URL
            window.history.replaceState(null, '', window.location.pathname);
            await processSessionId(sessionId);
            return;
          }
        }
        
        // Check for cold start deep link (mobile)
        if (Platform.OS !== 'web') {
          try {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              const sessionId = extractSessionId(initialUrl);
              if (sessionId) {
                await processSessionId(sessionId);
                return;
              }
            }
          } catch (e) {
            console.log('No initial URL');
          }
        }
        
        // Check existing session
        await checkExistingSession();
      } catch (error) {
        console.error('Auth init error:', error);
        setIsLoading(false);
      }
    };
    
    // Small delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      init();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [processSessionId, checkExistingSession]);

  const login = async () => {
    try {
      setIsLoading(true);
      
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + '/'
        : Linking.createURL('/');
      
      console.log('Redirect URL:', redirectUrl);
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        console.log('Auth result:', result.type);
        
        if (result.type === 'success' && result.url) {
          const sessionId = extractSessionId(result.url);
          if (sessionId) {
            await processSessionId(sessionId);
          }
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local cleanup even if API fails
    }
    
    // Clear all local state
    try {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user_data');
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
    
    // Clear API headers
    delete api.defaults.headers.common['Authorization'];
    
    // Reset state
    setUser(null);
    setProvider(null);
    
    console.log('Logout completed');
    return Promise.resolve();
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
