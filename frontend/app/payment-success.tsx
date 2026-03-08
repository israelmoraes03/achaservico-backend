import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { session_id, provider_id } = useLocalSearchParams<{ session_id: string; provider_id: string }>();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando pagamento...');

  useEffect(() => {
    const activateSubscription = async () => {
      if (!session_id) {
        setStatus('error');
        setMessage('Sessão de pagamento não encontrada');
        return;
      }

      try {
        // Try to activate subscription
        const response = await api.post('/stripe/activate-from-session', { session_id });
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.already_active 
            ? 'Sua assinatura já está ativa!' 
            : 'Assinatura ativada com sucesso!');
          
          // Refresh user data
          await refreshUser();
          
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.replace('/provider/dashboard');
          }, 2000);
        }
      } catch (error: any) {
        console.error('Error activating subscription:', error);
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Erro ao ativar assinatura');
        
        // Redirect to dashboard anyway after 3 seconds
        setTimeout(() => {
          router.replace('/provider/dashboard');
        }, 3000);
      }
    };

    activateSubscription();
  }, [session_id]);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.text}>{message}</Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>{message}</Text>
          <Text style={styles.subText}>Redirecionando...</Text>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorText}>{message}</Text>
          <Text style={styles.subText}>Redirecionando...</Text>
        </>
      )}
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
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 60,
    color: '#10B981',
    marginBottom: 20,
  },
  successText: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 60,
    color: '#EF4444',
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 20,
    textAlign: 'center',
  },
  subText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 10,
  },
});
