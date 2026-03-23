import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'slide_from_right',
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
