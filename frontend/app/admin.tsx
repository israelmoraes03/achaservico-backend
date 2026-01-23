import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import api from '../src/services/api';

// Admin password - change this!
const ADMIN_PASSWORD = 'admin123';

interface PendingSubscription {
  subscription: {
    subscription_id: string;
    provider_id: string;
    user_id: string;
    status: string;
    created_at: string;
  };
  provider: {
    provider_id: string;
    name: string;
    phone: string;
    category: string;
    neighborhood: string;
  };
}

export default function AdminScreen() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const fetchPendingSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/pending-subscriptions');
      setPendingSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching pending subscriptions:', error);
      Alert.alert('Erro', 'Não foi possível carregar as assinaturas pendentes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingSubscriptions();
    }
  }, [isAuthenticated, fetchPendingSubscriptions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingSubscriptions();
    setRefreshing(false);
  }, [fetchPendingSubscriptions]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      Alert.alert('Erro', 'Senha incorreta');
    }
  };

  const handleActivate = async (providerId: string, providerName: string) => {
    Alert.alert(
      'Ativar Assinatura',
      `Confirma a ativação da assinatura de ${providerName}?\n\nIsso significa que você recebeu o PIX de R$ 15,00.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, Ativar',
          onPress: async () => {
            try {
              setActivatingId(providerId);
              await api.post(`/admin/activate/${providerId}`);
              Alert.alert('Sucesso', `Assinatura de ${providerName} ativada!`);
              fetchPendingSubscriptions();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Erro ao ativar assinatura';
              Alert.alert('Erro', message);
            } finally {
              setActivatingId(null);
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <Ionicons name="shield-checkmark" size={64} color="#10B981" />
            <Text style={styles.loginTitle}>Área Administrativa</Text>
            <Text style={styles.loginSubtitle}>Digite a senha para acessar</Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="Senha"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />
            
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Admin Dashboard
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin - Assinaturas</Text>
        <TouchableOpacity onPress={() => setIsAuthenticated(false)} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{pendingSubscriptions.length}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
      </View>

      {/* PIX Info */}
      <View style={styles.pixInfoCard}>
        <Text style={styles.pixInfoTitle}>Chave PIX para receber:</Text>
        <Text style={styles.pixInfoKey}>499.586.888-75</Text>
        <Text style={styles.pixInfoAmount}>Valor: R$ 15,00</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <Text style={styles.sectionTitle}>
          Assinaturas Pendentes ({pendingSubscriptions.length})
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : pendingSubscriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            <Text style={styles.emptyTitle}>Nenhuma pendência</Text>
            <Text style={styles.emptyText}>
              Todas as assinaturas estão em dia!
            </Text>
          </View>
        ) : (
          pendingSubscriptions.map((item) => (
            <View key={item.subscription.subscription_id} style={styles.subscriptionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{item.provider.name}</Text>
                  <Text style={styles.providerCategory}>{item.provider.category}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Pendente</Text>
                </View>
              </View>
              
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{formatPhone(item.provider.phone)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{item.provider.neighborhood}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Solicitado em {formatDate(item.subscription.created_at)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.activateButton,
                  activatingId === item.provider.provider_id && styles.activateButtonDisabled
                ]}
                onPress={() => handleActivate(item.provider.provider_id, item.provider.name)}
                disabled={activatingId === item.provider.provider_id}
              >
                {activatingId === item.provider.provider_id ? (
                  <ActivityIndicator color="#0A0A0A" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#0A0A0A" />
                    <Text style={styles.activateButtonText}>Recebi o PIX - Ativar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  passwordInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  pixInfoCard: {
    backgroundColor: '#10B98120',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  pixInfoTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  pixInfoKey: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  pixInfoAmount: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  subscriptionCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  providerCategory: {
    fontSize: 13,
    color: '#10B981',
    textTransform: 'capitalize',
  },
  statusBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  activateButtonDisabled: {
    opacity: 0.7,
  },
  activateButtonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});
