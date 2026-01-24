import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PaymentFailureScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={100} color="#EF4444" />
        </View>
        
        <Text style={styles.title}>Pagamento não aprovado</Text>
        <Text style={styles.subtitle}>
          Não foi possível processar seu pagamento.
        </Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Possíveis motivos:</Text>
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.infoText}>Saldo insuficiente</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.infoText}>Dados do cartão incorretos</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.infoText}>Cartão bloqueado ou vencido</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/provider/dashboard')}
        >
          <Ionicons name="refresh" size={20} color="#0A0A0A" />
          <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.secondaryButtonText}>Voltar para Início</Text>
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
    marginBottom: 32,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  infoText: {
    color: '#9CA3AF',
    fontSize: 14,
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
