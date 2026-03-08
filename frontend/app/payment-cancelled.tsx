import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function PaymentCancelledScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/provider/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✕</Text>
      <Text style={styles.text}>Pagamento cancelado</Text>
      <Text style={styles.subText}>Redirecionando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    padding: 20,
  },
  icon: {
    fontSize: 60,
    color: '#EF4444',
    marginBottom: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 10,
  },
});
