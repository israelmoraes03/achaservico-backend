import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/services/api';

// Admin credentials
const ADMIN_EMAIL = 'israel.moraes03@gmail.com';
const ADMIN_PASSWORD = 'Rael9661#';

// Backend URL for direct downloads
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://achaservico-backend.onrender.com';

type TabType = 'dashboard' | 'providers' | 'users' | 'subscriptions' | 'reviews' | 'reports';

interface Stats {
  total_users: number;
  total_providers: number;
  active_subscriptions: number;
  pending_subscriptions: number;
  expired_subscriptions: number;
  total_reviews: number;
  pending_reports: number;
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

interface AdminReport {
  report_id: string;
  provider_id: string;
  provider_name: string;
  reporter_email?: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerLink, setBannerLink] = useState('');
  const [currentBanner, setCurrentBanner] = useState<any>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');

  // Broadcast notification states
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'providers' | 'users' | 'all'>('providers');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Keyboard listener for auto-scroll
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  // Send broadcast notification
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Erro', 'Preencha o título e a mensagem');
      return;
    }

    const targetLabels = {
      providers: 'prestadores',
      users: 'clientes',
      all: 'todos (prestadores e clientes)'
    };

    Alert.alert(
      'Confirmar Envio',
      `Enviar notificação para ${targetLabels[broadcastTarget]}?\n\nTítulo: ${broadcastTitle}\nMensagem: ${broadcastMessage}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setIsSendingBroadcast(true);
            try {
              const response = await api.post('/admin/broadcast-notification', {
                title: broadcastTitle,
                message: broadcastMessage,
                target: broadcastTarget,
              });
              Alert.alert('Sucesso!', response.data.message);
              setBroadcastTitle('');
              setBroadcastMessage('');
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.detail || 'Falha ao enviar notificação');
            } finally {
              setIsSendingBroadcast(false);
            }
          },
        },
      ]
    );
  };

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

  const fetchReports = async () => {
    try {
      const response = await api.get('/admin/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchBanner = async () => {
    try {
      const response = await api.get('/banner');
      if (response.data && response.data.active) {
        setCurrentBanner(response.data);
      } else {
        setCurrentBanner(null);
      }
    } catch (error) {
      console.error('Error fetching banner:', error);
    }
  };

  const pickBannerImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setBannerImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerImage && !currentBanner?.image) {
      Alert.alert('Erro', 'Selecione uma imagem para o banner');
      return;
    }
    try {
      setUploadingBanner(true);
      await api.post('/admin/banner', {
        image: bannerImage || currentBanner?.image,
        link: bannerLink,
      });
      setBannerImage(null);
      setBannerLink('');
      fetchBanner();
      setActionMessage('Banner atualizado!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao salvar banner');
      setTimeout(() => setActionMessage(''), 3000);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    Alert.alert('Remover Banner', 'Deseja remover o banner? Ele não aparecerá mais para os usuários.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/admin/banner');
            setCurrentBanner(null);
            setBannerImage(null);
            setBannerLink('');
            setActionMessage('Banner removido!');
            setTimeout(() => setActionMessage(''), 3000);
          } catch (error) {
            setActionMessage('Erro ao remover banner');
            setTimeout(() => setActionMessage(''), 3000);
          }
        }
      },
    ]);
  };

  const handleAcceptReport = async (report: AdminReport) => {
    try {
      await api.put(`/admin/reports/${report.report_id}/accept`);
      fetchReports();
      fetchStats();
      setActionMessage('Denúncia aceita!');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao aceitar denúncia');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleDiscardReport = async (report: AdminReport) => {
    try {
      await api.put(`/admin/reports/${report.report_id}/discard`);
      fetchReports();
      fetchStats();
      setActionMessage('Denúncia descartada');
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      setActionMessage('Erro ao descartar denúncia');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleDeleteReport = async (report: AdminReport) => {
    Alert.alert(
      'Excluir Denúncia',
      `Deseja excluir permanentemente esta denúncia?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/reports/${report.report_id}`);
              fetchReports();
              fetchStats();
              setActionMessage('Denúncia excluída!');
              setTimeout(() => setActionMessage(''), 3000);
            } catch (error) {
              setActionMessage('Erro ao excluir denúncia');
              setTimeout(() => setActionMessage(''), 3000);
            }
          }
        },
      ]
    );
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      inappropriate_content: 'Conteúdo inadequado',
      false_info: 'Informações falsas',
      bad_behavior: 'Comportamento impróprio',
      spam: 'Spam ou propaganda',
      other: 'Outro motivo',
    };
    return labels[reason] || reason;
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchProviders(),
      fetchUsers(),
      fetchSubscriptions(),
      fetchReviews(),
      fetchReports(),
      fetchBanner(),
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
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
          { id: 'reports', label: 'Denúncias', icon: 'flag' },
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
        ref={scrollViewRef}
        style={styles.content}
        keyboardShouldPersistTaps="handled"
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
                {/* Main Stats Grid */}
                <Text style={styles.sectionTitle}>Visão Geral</Text>
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
                    <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                    <Text style={styles.statValue}>{stats?.active_providers || 0}</Text>
                    <Text style={styles.statLabel}>Ativos</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="close-circle" size={28} color="#EF4444" />
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats?.inactive_providers || 0}</Text>
                    <Text style={styles.statLabel}>Inativos</Text>
                  </View>
                </View>

                {/* Engagement Stats */}
                <Text style={styles.sectionTitle}>Engajamento</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                    <Text style={styles.statValue}>{stats?.total_contacts || 0}</Text>
                    <Text style={styles.statLabel}>Contatos</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="heart" size={28} color="#EC4899" />
                    <Text style={styles.statValue}>{stats?.total_favorites || 0}</Text>
                    <Text style={styles.statLabel}>Favoritos</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="star" size={28} color="#FFD700" />
                    <Text style={styles.statValue}>{stats?.total_reviews || 0}</Text>
                    <Text style={styles.statLabel}>Avaliações</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="trending-up" size={28} color="#8B5CF6" />
                    <Text style={styles.statValue}>{stats?.avg_rating || 0}</Text>
                    <Text style={styles.statLabel}>Nota Média</Text>
                  </View>
                </View>

                {/* Alerts */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="flag" size={28} color="#EF4444" />
                    <Text style={[styles.statValue, { color: (stats?.pending_reports || 0) > 0 ? '#EF4444' : '#FFFFFF' }]}>{stats?.pending_reports || 0}</Text>
                    <Text style={styles.statLabel}>Denúncias</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="notifications" size={28} color="#3B82F6" />
                    <Text style={styles.statValue}>{(stats?.notification_reach?.users || 0) + (stats?.notification_reach?.providers || 0)}</Text>
                    <Text style={styles.statLabel}>Alcance Push</Text>
                  </View>
                </View>

                {/* Top Rated Providers */}
                {stats?.top_providers && stats.top_providers.length > 0 && (
                  <View style={styles.dashSection}>
                    <Text style={styles.sectionTitle}>Top Prestadores</Text>
                    {stats.top_providers.map((p: any, i: number) => (
                      <View key={i} style={styles.dashListItem}>
                        <View style={styles.dashRankBadge}>
                          <Text style={styles.dashRankText}>{i + 1}º</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dashListName}>{p.name}</Text>
                          <Text style={styles.dashListSub}>
                            {(p.categories || []).slice(0, 2).join(', ')}
                          </Text>
                        </View>
                        <View style={styles.dashRatingBox}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.dashRatingText}>{p.average_rating?.toFixed(1)}</Text>
                          <Text style={styles.dashRatingCount}>({p.total_reviews})</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Category Distribution */}
                {stats?.category_distribution && stats.category_distribution.length > 0 && (
                  <View style={styles.dashSection}>
                    <Text style={styles.sectionTitle}>Categorias Populares</Text>
                    {stats.category_distribution.map((cat: any, i: number) => (
                      <View key={i} style={styles.dashBarItem}>
                        <View style={styles.dashBarLabel}>
                          <Text style={styles.dashBarName} numberOfLines={1}>{cat.name}</Text>
                          <Text style={styles.dashBarCount}>{cat.count}</Text>
                        </View>
                        <View style={styles.dashBarTrack}>
                          <View style={[styles.dashBarFill, { 
                            width: `${Math.max(5, (cat.count / (stats.category_distribution[0]?.count || 1)) * 100)}%`,
                            backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'][i % 8]
                          }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* City Distribution */}
                {stats?.city_distribution && stats.city_distribution.length > 0 && (
                  <View style={styles.dashSection}>
                    <Text style={styles.sectionTitle}>Cidades</Text>
                    {stats.city_distribution.map((city: any, i: number) => (
                      <View key={i} style={styles.dashBarItem}>
                        <View style={styles.dashBarLabel}>
                          <Text style={styles.dashBarName}>{city.name?.replace(/_/g, ' ')}</Text>
                          <Text style={styles.dashBarCount}>{city.count} prestadores</Text>
                        </View>
                        <View style={styles.dashBarTrack}>
                          <View style={[styles.dashBarFill, { 
                            width: `${Math.max(5, (city.count / (stats.city_distribution[0]?.count || 1)) * 100)}%`,
                            backgroundColor: '#3B82F6'
                          }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Activity */}
                {stats?.recent_providers && stats.recent_providers.length > 0 && (
                  <View style={styles.dashSection}>
                    <Text style={styles.sectionTitle}>Últimos Cadastros</Text>
                    {stats.recent_providers.map((p: any, i: number) => (
                      <View key={i} style={styles.dashListItem}>
                        <View style={[styles.dashDot, { backgroundColor: '#10B981' }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dashListName}>{p.name}</Text>
                          <Text style={styles.dashListSub}>
                            {(p.categories || []).slice(0, 2).join(', ')} • {(p.cities || []).slice(0, 1).join('')?.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={styles.dashTimeText}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Reviews */}
                {stats?.recent_reviews && stats.recent_reviews.length > 0 && (
                  <View style={styles.dashSection}>
                    <Text style={styles.sectionTitle}>Últimas Avaliações</Text>
                    {stats.recent_reviews.map((r: any, i: number) => (
                      <View key={i} style={styles.dashListItem}>
                        <View style={styles.dashStarsSmall}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color="#FFD700" />
                          ))}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dashListName}>{r.provider_name}</Text>
                          <Text style={styles.dashListSub} numberOfLines={1}>
                            {r.comment || 'Sem comentário'} — por {r.user_name}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Banner Management */}
                <View style={styles.dashSection}>
                  <Text style={styles.sectionTitle}>📢 Banner / Propaganda</Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>
                    {currentBanner ? 'Banner ativo — aparece para todos os usuários ao abrir o app' : 'Nenhum banner ativo — adicione uma imagem para exibir ao abrir o app'}
                  </Text>
                  
                  {/* Current banner preview */}
                  {currentBanner?.image && !bannerImage && (
                    <View style={styles.bannerPreviewBox}>
                      <Image source={{ uri: currentBanner.image }} style={styles.bannerPreviewImg} resizeMode="cover" />
                      <View style={styles.bannerActiveBadge}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                        <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '600' }}>Ativo</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* New banner preview */}
                  {bannerImage && (
                    <View style={styles.bannerPreviewBox}>
                      <Image source={{ uri: bannerImage }} style={styles.bannerPreviewImg} resizeMode="cover" />
                      <View style={styles.bannerActiveBadge}>
                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '600' }}>Nova imagem</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Actions */}
                  <TouchableOpacity style={styles.bannerPickBtn} onPress={pickBannerImage}>
                    <Ionicons name="image-outline" size={20} color="#10B981" />
                    <Text style={styles.bannerPickText}>
                      {currentBanner?.image || bannerImage ? 'Trocar Imagem' : 'Selecionar Imagem'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.bannerLinkInput}
                    placeholder="Link ao clicar no banner (opcional)"
                    placeholderTextColor="#6B7280"
                    value={bannerLink}
                    onChangeText={setBannerLink}
                  />
                  
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity 
                      style={[styles.bannerSaveBtn, (!bannerImage && !currentBanner) && { opacity: 0.4 }]}
                      onPress={handleSaveBanner}
                      disabled={(!bannerImage && !currentBanner) || uploadingBanner}
                    >
                      {uploadingBanner ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.bannerSaveText}>Salvar Banner</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    
                    {currentBanner && (
                      <TouchableOpacity style={styles.bannerRemoveBtn} onPress={handleRemoveBanner}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={styles.bannerRemoveText}>Remover</Text>
                      </TouchableOpacity>
                    )}
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

            {/* Broadcast Notification Section */}
            {activeTab === 'dashboard' && (
              <View style={styles.broadcastSection}>
                <Text style={styles.sectionTitle}>Enviar Comunicado</Text>
                <Text style={styles.broadcastSubtitle}>
                  Envie uma notificação push para seus usuários
                </Text>

                {/* Target Selector */}
                <Text style={styles.targetLabel}>Enviar para:</Text>
                <View style={styles.targetSelector}>
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      broadcastTarget === 'providers' && styles.targetButtonActive
                    ]}
                    onPress={() => setBroadcastTarget('providers')}
                  >
                    <Ionicons 
                      name="briefcase" 
                      size={18} 
                      color={broadcastTarget === 'providers' ? '#FFFFFF' : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.targetButtonText,
                      broadcastTarget === 'providers' && styles.targetButtonTextActive
                    ]}>Prestadores</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      broadcastTarget === 'users' && styles.targetButtonActive
                    ]}
                    onPress={() => setBroadcastTarget('users')}
                  >
                    <Ionicons 
                      name="people" 
                      size={18} 
                      color={broadcastTarget === 'users' ? '#FFFFFF' : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.targetButtonText,
                      broadcastTarget === 'users' && styles.targetButtonTextActive
                    ]}>Clientes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      broadcastTarget === 'all' && styles.targetButtonActive
                    ]}
                    onPress={() => setBroadcastTarget('all')}
                  >
                    <Ionicons 
                      name="globe" 
                      size={18} 
                      color={broadcastTarget === 'all' ? '#FFFFFF' : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.targetButtonText,
                      broadcastTarget === 'all' && styles.targetButtonTextActive
                    ]}>Todos</Text>
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.broadcastInput}
                  placeholder="Título do comunicado"
                  placeholderTextColor="#6B7280"
                  value={broadcastTitle}
                  onChangeText={setBroadcastTitle}
                  maxLength={50}
                />
                
                <TextInput
                  style={[styles.broadcastInput, styles.broadcastTextArea]}
                  placeholder="Mensagem do comunicado..."
                  placeholderTextColor="#6B7280"
                  value={broadcastMessage}
                  onChangeText={setBroadcastMessage}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                
                <TouchableOpacity
                  style={[styles.broadcastButton, isSendingBroadcast && styles.broadcastButtonDisabled]}
                  onPress={handleSendBroadcast}
                  disabled={isSendingBroadcast}
                >
                  {isSendingBroadcast ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="megaphone" size={20} color="#FFFFFF" />
                      <Text style={styles.broadcastButtonText}>
                        Enviar para {broadcastTarget === 'providers' ? 'Prestadores' : broadcastTarget === 'users' ? 'Clientes' : 'Todos'}
                      </Text>
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

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <View>
                <Text style={styles.sectionTitle}>
                  Denúncias ({reports.filter(r => r.status === 'pending').length} pendentes)
                </Text>
                {reports.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhuma denúncia registrada</Text>
                ) : (
                  reports.map((report) => (
                    <View key={report.report_id} style={[styles.card, report.status === 'pending' && styles.reportCardPending]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                          <TouchableOpacity onPress={() => router.push(`/provider/${report.provider_id}`)}>
                            <Text style={[styles.cardTitle, { color: '#10B981', textDecorationLine: 'underline' }]}>
                              {report.provider_name || 'Prestador'} →
                            </Text>
                          </TouchableOpacity>
                          <View style={styles.reportReasonBadge}>
                            <Ionicons name="flag" size={12} color="#EF4444" />
                            <Text style={styles.reportReasonText}>{getReasonLabel(report.reason)}</Text>
                          </View>
                          {report.description && (
                            <Text style={styles.cardDetail}>"{report.description}"</Text>
                          )}
                          <Text style={styles.cardDetail}>
                            Denunciado em: {formatDate(report.created_at)}
                          </Text>
                          {report.reporter_email && (
                            <Text style={styles.cardDetail}>
                              Por: {report.reporter_email}
                            </Text>
                          )}
                        </View>
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: report.status === 'pending'
                              ? '#F59E0B20'
                              : report.status === 'accepted'
                                ? '#EF444420'
                                : '#6B728020'
                          }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            {
                              color: report.status === 'pending'
                                ? '#F59E0B'
                                : report.status === 'accepted'
                                  ? '#EF4444'
                                  : '#6B7280'
                            }
                          ]}>
                            {report.status === 'pending' ? 'Pendente' :
                              report.status === 'accepted' ? 'Aceita' : 'Descartada'}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Action buttons for pending reports */}
                      {report.status === 'pending' && (
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#EF444420', flex: 1 }]}
                            onPress={() => {
                              Alert.alert(
                                'Aceitar e Bloquear',
                                `Deseja aceitar esta denúncia e BLOQUEAR o prestador "${report.provider_name}"?\n\nO perfil será desativado e o prestador receberá uma notificação.`,
                                [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { 
                                    text: 'Bloquear', 
                                    onPress: async () => {
                                      await handleAcceptReport(report);
                                      fetchProviders();
                                    },
                                    style: 'destructive'
                                  },
                                ]
                              );
                            }}
                          >
                            <Ionicons name="ban" size={16} color="#EF4444" />
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Aceitar e Bloquear</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#6B728020', flex: 1 }]}
                            onPress={() => handleDiscardReport(report)}
                          >
                            <Ionicons name="close-circle" size={16} color="#6B7280" />
                            <Text style={[styles.actionText, { color: '#6B7280' }]}>Descartar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {/* Bottom actions: View profile + Delete */}
                      <View style={styles.reportBottomActions}>
                        <TouchableOpacity 
                          style={styles.reportViewProfileLink}
                          onPress={() => router.push(`/provider/${report.provider_id}`)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#10B981" />
                          <Text style={styles.reportViewProfileText}>Ver perfil completo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.reportDeleteLink}
                          onPress={() => handleDeleteReport(report)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          <Text style={styles.reportDeleteText}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* Extra space when keyboard is visible */}
        <View style={[styles.bottomSpacer, keyboardVisible && styles.keyboardSpacer]} />
      </ScrollView>
      </KeyboardAvoidingView>
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
  statsRow: {
    flexDirection: 'row',
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
  keyboardSpacer: {
    height: 350,
  },
  // Broadcast styles
  broadcastSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  broadcastSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 16,
  },
  broadcastInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  broadcastTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  broadcastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  broadcastButtonDisabled: {
    opacity: 0.6,
  },
  broadcastButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Target selector styles
  targetLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  targetSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  targetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#2D2D2D',
    gap: 6,
  },
  targetButtonActive: {
    backgroundColor: '#10B981',
  },
  targetButtonText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  targetButtonTextActive: {
    color: '#FFFFFF',
  },
  // Report styles
  reportCardPending: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  reportReasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  reportReasonText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  reportViewProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportViewProfileText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  reportBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
  },
  reportDeleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  // Dashboard Section styles
  dashSection: {
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
  },
  dashListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    gap: 10,
  },
  dashRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashRankText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  dashListName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dashListSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  dashRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFD70015',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dashRatingText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },
  dashRatingCount: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  dashBarItem: {
    marginBottom: 12,
  },
  dashBarLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dashBarName: {
    color: '#D1D5DB',
    fontSize: 13,
    flex: 1,
  },
  dashBarCount: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  dashBarTrack: {
    height: 6,
    backgroundColor: '#2D2D2D',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dashBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dashDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashTimeText: {
    color: '#6B7280',
    fontSize: 12,
  },
  dashStarsSmall: {
    flexDirection: 'row',
    gap: 1,
  },
  // Banner admin styles
  bannerPreviewBox: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerPreviewImg: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  bannerActiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2D2D2D',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  bannerPickText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  bannerLinkInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  bannerSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 10,
  },
  bannerSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF444420',
    padding: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  bannerRemoveText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
