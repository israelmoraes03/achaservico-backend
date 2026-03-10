import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Refresh user data to get updated subscription status
    refreshUser();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color="#10B981" />
        </View>
        
        <Text style={styles.title}>Pagamento Aprovado!</Text>
        <Text style={styles.subtitle}>
          Sua assinatura foi ativada com sucesso.
        </Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="card" size={20} color="#10B981" />
            <Text style={styles.infoText}>Assinatura Mensal</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash" size={20} color="#10B981" />
            <Text style={styles.infoText}>R$ 9,99/mês</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#10B981" />
            <Text style={styles.infoText}>Válida por 30 dias</Text>
          </View>
        </View>
        
        <Text style={styles.description}>
          Seu perfil agora está visível para clientes em Três Lagoas.
          Você começará a receber contatos pelo WhatsApp!
        </Text>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/provider/dashboard')}
        >
          <Ionicons name="briefcase" size={20} color="#0A0A0A" />
          <Text style={styles.primaryButtonText}>Ver Meu Painel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.secondaryButtonText}>Ir para Início</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
