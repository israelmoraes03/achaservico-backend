import React, { useEffect, useState, useCallback } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Platform, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

// Configure notification handler - THIS MUST BE AT THE TOP LEVEL
// This enables notifications to show in the system notification bar
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState<{ active: boolean; message: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const checkMaintenance = useCallback(async () => {
    try {
      const response = await api.get('/maintenance/status', { timeout: 8000 });
      if (response?.data) {
        setMaintenance(response.data);
      }
    } catch (e) {
      // If check fails, allow access (don't block users due to network issues)
      setMaintenance({ active: false, message: '' });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkMaintenance();
    // Re-check every 60 seconds
    const interval = setInterval(checkMaintenance, 60000);
    return () => clearInterval(interval);
  }, [checkMaintenance]);

  // Admin route is always accessible
  const isAdminRoute = pathname === '/admin';

  if (checking) {
    return (
      <View style={maintenanceStyles.container}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (maintenance?.active && !isAdminRoute) {
    return (
      <View style={maintenanceStyles.container}>
        <View style={maintenanceStyles.iconContainer}>
          <Ionicons name="construct" size={80} color="#F59E0B" />
        </View>
        <Text style={maintenanceStyles.title}>Em Manutenção</Text>
        <Text style={maintenanceStyles.message}>
          {maintenance.message || 'Estamos realizando melhorias no app. Voltamos em breve!'}
        </Text>
        <View style={maintenanceStyles.divider} />
        <TouchableOpacity 
          style={maintenanceStyles.retryButton}
          onPress={() => {
            setChecking(true);
            checkMaintenance();
          }}
        >
          <Ionicons name="refresh" size={20} color="#10B981" />
          <Text style={maintenanceStyles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={maintenanceStyles.adminButton}
          onPress={() => {
            router.push('/admin');
          }}
        >
          <Ionicons name="shield-checkmark" size={18} color="#9CA3AF" />
          <Text style={maintenanceStyles.adminButtonText}>Acesso Admin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const maintenanceStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F59E0B15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#1F2937',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  retryText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  adminButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default function RootLayout() {
  // Setup Android notification channels only (permission will be requested after login)
  useEffect(() => {
    async function setupNotificationChannels() {
      // Setup Android notification channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'AchaServiço',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        
        // Also create a channel for broadcast messages
        await Notifications.setNotificationChannelAsync('broadcast', {
          name: 'Comunicados',
          description: 'Comunicados e avisos do AchaServiço',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }
      // Note: Permission request moved to AuthContext after successful login
    }
    
    setupNotificationChannels();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <MaintenanceGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0A0A0A' },
              animation: 'slide_from_right',
            }}
          />
        </MaintenanceGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
