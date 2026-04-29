import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../services/api';

// Complete any pending auth sessions (MUST be at module level)
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '639805008201-nm0krq490hfu4uep97a3vl8p2ftssf73.apps.googleusercontent.com';

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
  const isMountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isCheckingBlockRef = useRef(false);

  // Function to register push notification token
  const registerPushToken = useCallback(async (isProvider: boolean) => {
    try {
      if (Platform.OS === 'web') return;
      
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('Push token:', token.data);

      const endpoint = isProvider ? '/providers/register-push-token' : '/users/register-push-token';
      await api.post(endpoint, { push_token: token.data });
      console.log('Push token registered successfully');
    } catch (error) {
      console.log('Error registering push token:', error);
    }
  }, []);

  const extractSessionId = (url: string): string | null => {
    try {
      const hashMatch = url.match(/#session_id=([^&]+)/);
      if (hashMatch) return hashMatch[1];
      
      const queryMatch = url.match(/[?&]session_id=([^&]+)/);
      if (queryMatch) return queryMatch[1];
    } catch (e) {
      console.error('Error extracting session ID:', e);
    }
    return null;
  };

  // Extract tokens from Google OAuth redirect URL
  const extractTokenFromUrl = (url: string): { idToken?: string; accessToken?: string } => {
    try {
      // Check URL fragment (hash) for implicit flow tokens
      const hashPart = url.split('#')[1] || '';
      const params = new URLSearchParams(hashPart);
      
      const idToken = params.get('id_token') || undefined;
      const accessToken = params.get('access_token') || undefined;
      
      if (idToken || accessToken) {
        return { idToken, accessToken };
      }
      
      // Also check query parameters
      const queryPart = url.split('?')[1]?.split('#')[0] || '';
      const qParams = new URLSearchParams(queryPart);
      
      return {
        idToken: qParams.get('id_token') || undefined,
        accessToken: qParams.get('access_token') || undefined,
      };
    } catch (e) {
      console.error('Error extracting token from URL:', e);
      return {};
    }
  };

  // Helper to safely show blocked alert
  const showBlockedAlert = useCallback(() => {
    try {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Conta Bloqueada',
          'Sua conta foi bloqueada por violação das políticas do AchaServiço. Entre em contato com o suporte: contato.achaservico@gmail.com',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.log('Could not show blocked alert:', e);
    }
  }, []);

  // Process Google ID token directly with our backend
  const processGoogleToken = useCallback(async (idToken: string) => {
    try {
      if (!isMountedRef.current) return;
      setIsLoading(true);
      console.log('Sending Google token to backend...');
      
      const resp = await api.post('/auth/google-signin', { id_token: idToken }, { timeout: 15000 });
      
      if (!isMountedRef.current) return;
      
      const userData = resp?.data?.user;
      const sessionToken = resp?.data?.session_token;
      
      if (!userData || !sessionToken) {
        console.log('Invalid response from google-signin');
        setIsLoading(false);
        return;
      }
      
      if (userData.blocked || userData.is_blocked) {
        showBlockedAlert();
        setIsLoading(false);
        return;
      }
      
      await AsyncStorage.setItem('session_token', sessionToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
      if (isMountedRef.current) setUser(userData);
      
      let isProviderUser = false;
      try {
        const meResponse = await api.get('/auth/me', { timeout: 10000 });
        if (isMountedRef.current && meResponse?.data?.provider) {
          setProvider(meResponse.data.provider);
          isProviderUser = true;
        }
      } catch (e) {
        console.log('No provider profile');
      }

      await registerPushToken(isProviderUser);
    } catch (error: any) {
      console.error('Google sign-in error:', error?.response?.data || error?.message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro no login', 'Não foi possível fazer login. Tente novamente.');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [showBlockedAlert, registerPushToken]);

  // Process Google access token as fallback
  const processGoogleAccessToken = useCallback(async (accessToken: string) => {
    try {
      if (!isMountedRef.current) return;
      setIsLoading(true);
      console.log('Sending Google access_token to backend...');
      
      const resp = await api.post('/auth/google-signin-token', { access_token: accessToken }, { timeout: 15000 });
      
      if (!isMountedRef.current) return;
      
      const userData = resp?.data?.user;
      const sessionToken = resp?.data?.session_token;
      
      if (!userData || !sessionToken) {
        console.log('Invalid response from google-signin-token');
        setIsLoading(false);
        return;
      }
      
      if (userData.blocked || userData.is_blocked) {
        showBlockedAlert();
        setIsLoading(false);
        return;
      }
      
      await AsyncStorage.setItem('session_token', sessionToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
      if (isMountedRef.current) setUser(userData);
      
      let isProviderUser = false;
      try {
        const meResponse = await api.get('/auth/me', { timeout: 10000 });
        if (isMountedRef.current && meResponse?.data?.provider) {
          setProvider(meResponse.data.provider);
          isProviderUser = true;
        }
      } catch (e) {
        console.log('No provider profile');
      }

      await registerPushToken(isProviderUser);
    } catch (error: any) {
      console.error('Google access token sign-in error:', error?.response?.data || error?.message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro no login', 'Não foi possível fazer login. Tente novamente.');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [showBlockedAlert, registerPushToken]);

  const processSessionId = useCallback(async (sessionId: string, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    try {
      if (!isMountedRef.current) return;
      setIsLoading(true);
      console.log(`Processing session ID... (attempt ${retryCount + 1})`);
      
      const resp = await api.post('/auth/session', {}, {
        headers: { 'X-Session-ID': sessionId },
        timeout: 15000
      });
      
      if (!isMountedRef.current) return;
      
      const userData = resp?.data?.user;
      const sessionToken = resp?.data?.session_token;
      
      if (!userData || !sessionToken) {
        console.log('Invalid session response - missing user or token');
        setIsLoading(false);
        return;
      }
      
      if (userData.blocked || userData.is_blocked) {
        showBlockedAlert();
        setIsLoading(false);
        return;
      }
      
      await AsyncStorage.setItem('session_token', sessionToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
      if (isMountedRef.current) setUser(userData);
      
      let isProviderUser = false;
      try {
        const meResponse = await api.get('/auth/me', { timeout: 10000 });
        if (isMountedRef.current && meResponse?.data?.provider) {
          setProvider(meResponse.data.provider);
          isProviderUser = true;
        }
      } catch (e) {
        console.log('No provider profile');
      }

      await registerPushToken(isProviderUser);
    } catch (error: any) {
      console.error('Error processing session:', error?.message || 'Unknown error');
      
      if (retryCount < maxRetries && (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout') || error?.message?.includes('Network'))) {
        console.log(`Server may be waking up, retrying in ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        if (isMountedRef.current) {
          return processSessionId(sessionId, retryCount + 1);
        }
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [showBlockedAlert, registerPushToken]);

  const checkExistingSession = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    try {
      if (!isMountedRef.current) return;
      console.log(`Checking existing session... (attempt ${retryCount + 1})`);
      const token = await AsyncStorage.getItem('session_token');
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const resp = await api.get('/auth/me', { timeout: 15000 });
        
        if (!isMountedRef.current) return;
        
        const userData = resp?.data?.user;
        const providerData = resp?.data?.provider;
        
        if (userData?.blocked || userData?.is_blocked) {
          showBlockedAlert();
          await AsyncStorage.removeItem('session_token');
          delete api.defaults.headers.common['Authorization'];
          return;
        }
        
        if (userData) {
          setUser(userData);
          setProvider(providerData || null);
          console.log('Session restored');
          
          const isProviderUser = !!providerData;
          await registerPushToken(isProviderUser);
        } else {
          console.log('Session response missing user data');
        }
      } else {
        console.log('No existing session');
      }
    } catch (error: any) {
      console.log('Session check failed:', error?.message || 'Unknown error');
      
      if (!isMountedRef.current) return;
      
      if (retryCount < maxRetries && (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout') || error?.message?.includes('Network'))) {
        console.log(`Server may be waking up, retrying in ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        if (isMountedRef.current) {
          return checkExistingSession(retryCount + 1);
        }
        return;
      }
      
      if (error?.response?.status === 401) {
        await AsyncStorage.removeItem('session_token');
        delete api.defaults.headers.common['Authorization'];
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [registerPushToken, showBlockedAlert]);

  useEffect(() => {
    const init = async () => {
      try {
        // Check for session_id in URL (web only)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash;
          const search = window.location.search;
          const sessionId = extractSessionId(hash || search);
          
          if (sessionId) {
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
    
    const timer = setTimeout(() => {
      init();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [processSessionId, checkExistingSession]);

  // Check block status when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      try {
        if (
          (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
          nextAppState === 'active' &&
          user &&
          !isCheckingBlockRef.current
        ) {
          isCheckingBlockRef.current = true;
          console.log('App returned to foreground, checking block status...');
          
          const token = await AsyncStorage.getItem('session_token');
          if (token && isMountedRef.current) {
            try {
              const resp = await api.get('/auth/me', { timeout: 10000 });
              const userData = resp?.data?.user;
              
              if (isMountedRef.current && (userData?.blocked || userData?.is_blocked)) {
                console.log('User is blocked, forcing logout...');
                showBlockedAlert();
                await AsyncStorage.removeItem('session_token');
                delete api.defaults.headers.common['Authorization'];
                setUser(null);
                setProvider(null);
              }
            } catch (apiError) {
              console.log('Block check API error (ignored):', (apiError as any)?.message);
            }
          }
          isCheckingBlockRef.current = false;
        }
      } catch (e) {
        console.log('AppState handler error (ignored):', e);
        isCheckingBlockRef.current = false;
      }
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, showBlockedAlert]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Heartbeat: ping backend every 2 minutes to track presence & access
  useEffect(() => {
    if (!user) return;
    
    const sendHeartbeat = async () => {
      try {
        await api.post('/heartbeat', {}, { timeout: 10000 });
      } catch (e) {
        // Silently ignore heartbeat failures
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async () => {
    try {
      setIsLoading(true);
      
      if (Platform.OS === 'web') {
        // Web: use auth.emergentagent.com flow (keeps web preview working)
        const redirectUrl = window.location.origin + '/';
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        window.location.href = authUrl;
        return;
      }
      
      // Mobile: Use auth.emergentagent.com with app scheme redirect
      // Uses root path to avoid "Unmatched Route" from Expo Router
      console.log('Starting Google Sign-In...');
      
      const returnUrl = Linking.createURL('/');
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(returnUrl)}`;
      
      console.log('Auth URL:', authUrl);
      console.log('Return URL:', returnUrl);
      
      // Set up a deep link listener as fallback for Samsung devices
      // where Chrome Custom Tab doesn't properly return the result
      let deepLinkHandled = false;
      const deepLinkSubscription = Linking.addEventListener('url', async (event) => {
        if (deepLinkHandled) return;
        console.log('Deep link received:', event.url);
        
        const sessionId = extractSessionId(event.url);
        if (sessionId) {
          deepLinkHandled = true;
          deepLinkSubscription.remove();
          await processSessionId(sessionId);
        }
        
        const { idToken, accessToken } = extractTokenFromUrl(event.url);
        if (idToken) {
          deepLinkHandled = true;
          deepLinkSubscription.remove();
          await processGoogleToken(idToken);
        } else if (accessToken) {
          deepLinkHandled = true;
          deepLinkSubscription.remove();
          await processGoogleAccessToken(accessToken);
        }
        
        // Check for session_token
        const tokenMatch = event.url.match(/[?&]session_token=([^&]+)/);
        if (tokenMatch) {
          deepLinkHandled = true;
          deepLinkSubscription.remove();
          const sessionToken = decodeURIComponent(tokenMatch[1]);
          await AsyncStorage.setItem('session_token', sessionToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
          try {
            const meResponse = await api.get('/auth/me', { timeout: 10000 });
            if (isMountedRef.current) {
              setUser(meResponse.data.user);
              setProvider(meResponse.data.provider || null);
              await registerPushToken(!!meResponse.data.provider);
            }
          } catch (e) {
            console.error('Error fetching user:', e);
          }
          if (isMountedRef.current) setIsLoading(false);
        }
      });
      
      // Open the auth session
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        returnUrl,
        { showInRecents: true }
      );
      
      console.log('Auth result type:', result.type);
      
      // Clean up deep link listener after a delay
      setTimeout(() => {
        if (!deepLinkHandled) {
          deepLinkSubscription.remove();
        }
      }, 5000);
      
      if (deepLinkHandled) {
        // Already handled by deep link listener
        return;
      }
      
      if (result.type === 'success' && result.url) {
        console.log('Auth redirect URL received via WebBrowser');
        const url = result.url;
        
        // Check for session_token
        const tokenMatch = url.match(/[?&]session_token=([^&]+)/);
        if (tokenMatch) {
          const sessionToken = decodeURIComponent(tokenMatch[1]);
          await AsyncStorage.setItem('session_token', sessionToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
          try {
            const meResponse = await api.get('/auth/me', { timeout: 10000 });
            if (isMountedRef.current) {
              setUser(meResponse.data.user);
              setProvider(meResponse.data.provider || null);
              await registerPushToken(!!meResponse.data.provider);
            }
          } catch (e) {
            console.error('Error fetching user:', e);
          }
          setIsLoading(false);
          return;
        }
        
        // Check for id_token
        const { idToken, accessToken } = extractTokenFromUrl(url);
        if (idToken) {
          await processGoogleToken(idToken);
          return;
        }
        if (accessToken) {
          await processGoogleAccessToken(accessToken);
          return;
        }
        
        // Check for session_id (auth.emergentagent.com flow)
        const sessionId = extractSessionId(url);
        if (sessionId) {
          await processSessionId(sessionId);
          return;
        }
        
        // Check for error
        const errorMatch = url.match(/[?&]error=([^&]+)/);
        if (errorMatch) {
          const error = decodeURIComponent(errorMatch[1]);
          console.error('Auth error:', error);
          Alert.alert('Erro no login', 'Não foi possível fazer login. Tente novamente.');
        } else {
          console.log('No recognizable token in URL:', url.substring(0, 100));
        }
        
        setIsLoading(false);
      } else {
        console.log('Auth dismissed or cancelled');
        setIsLoading(false);
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
    }
    
    try {
      await AsyncStorage.removeItem('session_token');
      await AsyncStorage.removeItem('user_data');
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
    
    delete api.defaults.headers.common['Authorization'];
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
        const resp = await api.get('/auth/me');
        setUser(resp.data.user);
        setProvider(resp.data.provider);
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
