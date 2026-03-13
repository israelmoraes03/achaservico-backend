import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/services/api';

// Admin credentials
const ADMIN_EMAIL = 'israel.moraes03@gmail.com';
const ADMIN_PASSWORD = 'Rael9661#';

// Backend URL for direct downloads
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://achaservico-backend.onrender.com';

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
  is_premium: boolean;
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
  const [isExporting, setIsExporting] = useState(false);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const exportUrl = `${BACKEND_URL}/api/admin/export-excel`;
      await Linking.openURL(exportUrl);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      Alert.alert('Erro', 'Não foi possível baixar o relatório');
    } finally {
      setIsExporting(false);
    }
  };

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
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchAllData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  const [loginError, setLoginError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const handleLogin = () => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Email ou senha incorretos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Provider actions
  const handleToggleProviderStatus = async (provider: Provider) => {
    try {
      await api.post(`/admin/toggle-provider/${provider.provider_id}`);
      fetchProviders();
      setActionMessage(`Prestador ${provider.is_active ? 'desativado' : 'ativado'}!`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao alterar status');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleTogglePremium = async (provider: Provider) => {
    try {
      await api.post(`/admin/toggle-premium/${provider.provider_id}`);
      fetchProviders();
      setActionMessage(`Prestador ${provider.is_premium ? 'removido do Premium' : 'marcado como Premium'}!`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao alterar status Premium');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleDeleteProvider = async (provider: Provider) => {
    // Confirm with a simple tap - no Alert needed
    try {
      await api.delete(`/admin/provider/${provider.provider_id}`);
      fetchProviders();
      fetchStats();
      setActionMessage('Prestador excluído!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao excluir');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Subscription actions
  const handleActivateSubscription = async (providerId: string, providerName: string) => {
    try {
      await api.post(`/admin/activate/${providerId}`);
      fetchSubscriptions();
      fetchProviders();
      fetchStats();
      setActionMessage('Assinatura ativada!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao ativar assinatura');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleCancelSubscription = async (providerId: string, providerName: string) => {
    try {
      await api.post(`/admin/cancel-subscription/${providerId}`);
      fetchSubscriptions();
      fetchProviders();
      fetchStats();
      setActionMessage('Assinatura cancelada!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao cancelar assinatura');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // Review actions
  const handleDeleteReview = async (review: Review) => {
    try {
      await api.delete(`/admin/review/${review.review_id}`);
      fetchReviews();
      fetchStats();
      setActionMessage('Avaliação excluída!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao excluir avaliação');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  // User actions
  const handleDeleteUser = async (user: User) => {
    try {
      await api.delete(`/admin/user/${user.user_id}`);
      fetchUsers();
      fetchProviders();
      fetchStats();
      setActionMessage('Usuário excluído!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao excluir usuário');
      setTimeout(() => setActionMessage(''), 3000);
    }
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
              onChangeText={(text) => { setEmail(text); setLoginError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#6B7280"
              secureTextEntry
              value={password}
              onChangeText={(text) => { setPassword(text); setLoginError(''); }}
              onSubmitEditing={handleLogin}
            />

            {loginError ? (
              <Text style={styles.errorText}>{loginError}</Text>
            ) : null}

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
      {/* Action Message Toast */}
      {actionMessage ? (
        <View style={styles.actionToast}>
          <Text style={styles.actionToastText}>{actionMessage}</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
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

                {/* Export Excel Button */}
                <TouchableOpacity 
                  style={styles.exportButton}
                  onPress={handleExportExcel}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                      <Text style={styles.exportButtonText}>Baixar Relatório Excel</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <View>
                <Text style={styles.sectionTitle}>
                  Todos os Prestadores ({providers.length})
                </Text>
                
                {/* Search Filter */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome, telefone ou bairro..."
                    placeholderTextColor="#6B7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {providers.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum prestador cadastrado</Text>
                ) : (
                  providers
                    .filter(provider => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        provider.name?.toLowerCase().includes(query) ||
                        provider.phone?.includes(query) ||
                        provider.neighborhood?.toLowerCase().includes(query) ||
                        provider.categories?.some(c => c.toLowerCase().includes(query))
                      );
                    })
                    .map((provider) => (
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
                          {provider.is_premium && (
                            <View style={[styles.statusBadge, { backgroundColor: '#FFD70030' }]}>
                              <Text style={[styles.statusText, { color: '#FFD700' }]}>👑 Premium</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: provider.is_premium ? '#FFD70020' : '#9333EA20' }]}
                          onPress={() => handleTogglePremium(provider)}
                        >
                          <Ionicons name="star" size={16} color={provider.is_premium ? '#FFD700' : '#9333EA'} />
                          <Text style={[styles.actionText, { color: provider.is_premium ? '#FFD700' : '#9333EA' }]}>
                            {provider.is_premium ? 'Remover' : 'Premium'}
                          </Text>
                        </TouchableOpacity>
                        {provider.subscription_status !== 'active' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10B98120' }]}
                            onPress={() => handleActivateSubscription(provider.provider_id, provider.name)}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={[styles.actionText, { color: '#10B981' }]}>Ativar Assinatura</Text>
                          </TouchableOpacity>
                        )}
                        {provider.subscription_status === 'active' && (
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#EF444420' }]}
                            onPress={() => handleCancelSubscription(provider.provider_id, provider.name)}
                          >
                            <Ionicons name="close-circle" size={16} color="#EF4444" />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Cancelar Assinatura</Text>
                          </TouchableOpacity>
                        )}
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
                
                {/* Search Filter */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nome ou email..."
                    placeholderTextColor="#6B7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {users.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
                ) : (
                  users
                    .filter(user => {
                      if (!searchQuery) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        user.name?.toLowerCase().includes(query) ||
                        user.email?.toLowerCase().includes(query)
                      );
                    })
                    .map((user) => (
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
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
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionToast: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  exportButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
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
