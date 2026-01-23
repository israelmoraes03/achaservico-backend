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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/services/api';

// Admin credentials
const ADMIN_EMAIL = 'israel.moraes03@gmail.com';
const ADMIN_PASSWORD = 'Rael9661#';

type TabType = 'dashboard' | 'providers' | 'users' | 'subscriptions' | 'reviews';

interface Stats {
  total_users: number;
  total_providers: number;
  active_subscriptions: number;
  pending_subscriptions: number;
  expired_subscriptions: number;
  total_reviews: number;
}

interface Provider {
  provider_id: string;
  user_id: string;
  name: string;
  phone: string;
  categories: string[];
  neighborhood: string;
  description: string;
  average_rating: number;
  total_reviews: number;
  is_active: boolean;
  subscription_status: string;
  created_at: string;
}

interface User {
  user_id: string;
  email: string;
  name: string;
  is_provider: boolean;
  created_at: string;
}

interface Subscription {
  subscription_id: string;
  provider_id: string;
  user_id: string;
  status: string;
  created_at: string;
  expires_at?: string;
}

interface Review {
  review_id: string;
  provider_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await api.get('/admin/all-providers');
      setProviders(response.data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/all-users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/admin/all-subscriptions');
      setSubscriptions(response.data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('/admin/all-reviews');
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchProviders(),
      fetchUsers(),
      fetchSubscriptions(),
      fetchReviews(),
    ]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const handleLogin = () => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      Alert.alert('Erro', 'Email ou senha incorretos');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair do painel admin?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => setIsAuthenticated(false) },
    ]);
  };

  // Provider actions
  const handleToggleProviderStatus = async (provider: Provider) => {
    const action = provider.is_active ? 'desativar' : 'ativar';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Prestador`,
      `Deseja ${action} o prestador ${provider.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.post(`/admin/toggle-provider/${provider.provider_id}`);
              fetchProviders();
              Alert.alert('Sucesso', `Prestador ${action === 'ativar' ? 'ativado' : 'desativado'}!`);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível alterar o status');
            }
          },
        },
      ]
    );
  };

  const handleDeleteProvider = async (provider: Provider) => {
    Alert.alert(
      'Excluir Prestador',
      `Tem certeza que deseja EXCLUIR permanentemente ${provider.name}?\n\nEsta ação não pode ser desfeita!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'EXCLUIR',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/provider/${provider.provider_id}`);
              fetchProviders();
              fetchStats();
              Alert.alert('Sucesso', 'Prestador excluído!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  // Subscription actions
  const handleActivateSubscription = async (providerId: string, providerName: string) => {
    Alert.alert(
      'Ativar Assinatura',
      `Ativar assinatura de ${providerName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ativar',
          onPress: async () => {
            try {
              await api.post(`/admin/activate/${providerId}`);
              fetchSubscriptions();
              fetchProviders();
              fetchStats();
              Alert.alert('Sucesso', 'Assinatura ativada!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível ativar');
            }
          },
        },
      ]
    );
  };

  const handleCancelSubscription = async (providerId: string, providerName: string) => {
    Alert.alert(
      'Cancelar Assinatura',
      `Cancelar assinatura de ${providerName}?\n\nO perfil ficará invisível para clientes.`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar Assinatura',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/cancel-subscription/${providerId}`);
              fetchSubscriptions();
              fetchProviders();
              fetchStats();
              Alert.alert('Sucesso', 'Assinatura cancelada!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível cancelar');
            }
          },
        },
      ]
    );
  };

  // Review actions
  const handleDeleteReview = async (review: Review) => {
    Alert.alert(
      'Excluir Avaliação',
      `Excluir avaliação de ${review.user_name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/review/${review.review_id}`);
              fetchReviews();
              fetchStats();
              Alert.alert('Sucesso', 'Avaliação excluída!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
        },
      ]
    );
  };

  // User actions
  const handleDeleteUser = async (user: User) => {
    Alert.alert(
      'Excluir Usuário',
      `Excluir usuário ${user.name}?\n\n${user.is_provider ? 'Isso também excluirá o perfil de prestador!' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/user/${user.user_id}`);
              fetchUsers();
              fetchProviders();
              fetchStats();
              Alert.alert('Sucesso', 'Usuário excluído!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir');
            }
          },
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
    });
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone?.replace(/\D/g, '') || '';
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
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={64} color="#10B981" />
            </View>
            <Text style={styles.loginTitle}>Painel Administrativo</Text>
            <Text style={styles.loginSubtitle}>AchaServiço</Text>

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Ionicons name="log-in" size={20} color="#0A0A0A" />
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Voltar ao app</Text>
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
        <Text style={styles.headerTitle}>Admin</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
          { id: 'providers', label: 'Prestadores', icon: 'briefcase' },
          { id: 'users', label: 'Usuários', icon: 'people' },
          { id: 'subscriptions', label: 'Assinaturas', icon: 'card' },
          { id: 'reviews', label: 'Avaliações', icon: 'star' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id as TabType)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? '#0A0A0A' : '#9CA3AF'}
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <View>
                <Text style={styles.sectionTitle}>Estatísticas Gerais</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="people" size={28} color="#3B82F6" />
                    <Text style={styles.statValue}>{stats?.total_users || 0}</Text>
                    <Text style={styles.statLabel}>Usuários</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="briefcase" size={28} color="#10B981" />
                    <Text style={styles.statValue}>{stats?.total_providers || 0}</Text>
                    <Text style={styles.statLabel}>Prestadores</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                    <Text style={styles.statValue}>{stats?.active_subscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Ativos</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="time" size={28} color="#F59E0B" />
                    <Text style={styles.statValue}>{stats?.pending_subscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Pendentes</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="alert-circle" size={28} color="#EF4444" />
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats?.expired_subscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Expiradas</Text>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Ionicons name="star" size={28} color="#FFD700" />
                    <Text style={styles.statValue}>{stats?.total_reviews || 0}</Text>
                    <Text style={styles.statLabel}>Avaliações</Text>
                  </View>
                </View>

                <View style={styles.pixInfoCard}>
                  <Text style={styles.pixInfoTitle}>Chave PIX para receber:</Text>
                  <Text style={styles.pixInfoKey}>499.586.888-75</Text>
                  <Text style={styles.pixInfoAmount}>Assinatura: R$ 15,00/mês</Text>
                </View>
              </View>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <View>
                <Text style={styles.sectionTitle}>
                  Todos os Prestadores ({providers.length})
                </Text>
                {providers.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum prestador cadastrado</Text>
                ) : (
                  providers.map((provider) => (
                    <View key={provider.provider_id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{provider.name}</Text>
                          <Text style={styles.cardSubtitle}>
                            {provider.categories?.join(', ') || 'Sem categoria'}
                          </Text>
                          <Text style={styles.cardDetail}>{formatPhone(provider.phone)}</Text>
                          <Text style={styles.cardDetail}>{provider.neighborhood}</Text>
                        </View>
                        <View style={styles.cardBadges}>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: provider.is_active ? '#10B98120' : '#EF444420' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: provider.is_active ? '#10B981' : '#EF4444' }
                            ]}>
                              {provider.is_active ? 'Ativo' : 'Inativo'}
                            </Text>
                          </View>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: provider.subscription_status === 'active' ? '#10B98120' : '#F59E0B20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: provider.subscription_status === 'active' ? '#10B981' : '#F59E0B' }
                            ]}>
                              {provider.subscription_status === 'active' ? 'Pago' : 'Pendente'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionToggle]}
                          onPress={() => handleToggleProviderStatus(provider)}
                        >
                          <Ionicons
                            name={provider.is_active ? 'eye-off' : 'eye'}
                            size={16}
                            color="#F59E0B"
                          />
                          <Text style={[styles.actionText, { color: '#F59E0B' }]}>
                            {provider.is_active ? 'Desativar' : 'Ativar'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionDelete]}
                          onPress={() => handleDeleteProvider(provider)}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                          <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <View>
                <Text style={styles.sectionTitle}>Todos os Usuários ({users.length})</Text>
                {users.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
                ) : (
                  users.map((user) => (
                    <View key={user.user_id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{user.name}</Text>
                          <Text style={styles.cardSubtitle}>{user.email}</Text>
                          <Text style={styles.cardDetail}>
                            Cadastro: {formatDate(user.created_at)}
                          </Text>
                        </View>
                        {user.is_provider && (
                          <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                            <Text style={[styles.statusText, { color: '#10B981' }]}>Prestador</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionDelete]}
                          onPress={() => handleDeleteUser(user)}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                          <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <View>
                <Text style={styles.sectionTitle}>Assinaturas ({subscriptions.length})</Text>
                {subscriptions.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhuma assinatura</Text>
                ) : (
                  subscriptions.map((item, index) => (
                    <View key={index} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>
                            {item.provider?.name || 'Prestador não encontrado'}
                          </Text>
                          <Text style={styles.cardSubtitle}>
                            {formatPhone(item.provider?.phone || '')}
                          </Text>
                          <Text style={styles.cardDetail}>
                            Status: {item.subscription?.status || 'N/A'}
                          </Text>
                          {item.subscription?.expires_at && (
                            <Text style={styles.cardDetail}>
                              Expira: {formatDate(item.subscription.expires_at)}
                            </Text>
                          )}
                        </View>
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: item.subscription?.status === 'active'
                              ? '#10B98120'
                              : item.subscription?.status === 'pending'
                                ? '#F59E0B20'
                                : '#EF444420'
                          }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            {
                              color: item.subscription?.status === 'active'
                                ? '#10B981'
                                : item.subscription?.status === 'pending'
                                  ? '#F59E0B'
                                  : '#EF4444'
                            }
                          ]}>
                            {item.subscription?.status === 'active' ? 'Ativo' :
                              item.subscription?.status === 'pending' ? 'Pendente' : 'Cancelado'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        {item.subscription?.status !== 'active' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                            onPress={() => handleActivateSubscription(
                              item.provider?.provider_id,
                              item.provider?.name
                            )}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={[styles.actionText, { color: '#10B981' }]}>Ativar</Text>
                          </TouchableOpacity>
                        )}
                        {item.subscription?.status === 'active' && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.actionDelete]}
                            onPress={() => handleCancelSubscription(
                              item.provider?.provider_id,
                              item.provider?.name
                            )}
                          >
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Cancelar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <View>
                <Text style={styles.sectionTitle}>Todas as Avaliações ({reviews.length})</Text>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhuma avaliação</Text>
                ) : (
                  reviews.map((review) => (
                    <View key={review.review_id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{review.user_name}</Text>
                          <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.rating ? 'star' : 'star-outline'}
                                size={16}
                                color="#FFD700"
                              />
                            ))}
                          </View>
                          {review.comment && (
                            <Text style={styles.cardDetail}>"{review.comment}"</Text>
                          )}
                          <Text style={styles.cardDetail}>
                            {formatDate(review.created_at)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionDelete]}
                          onPress={() => handleDeleteReview(review)}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                          <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
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
  logoContainer: {
    marginBottom: 16,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    marginTop: 20,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  logoutButton: {
    padding: 8,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
    maxHeight: 50,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginHorizontal: 4,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loader: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    flexGrow: 1,
  },
  statValue: {
    fontSize: 28,
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
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
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#10B981',
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardBadges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionToggle: {
    backgroundColor: '#F59E0B20',
  },
  actionDelete: {
    backgroundColor: '#EF444420',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
