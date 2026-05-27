import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
  Share,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingTutorial, { checkTutorialCompleted } from '../src/components/OnboardingTutorial';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cache config
const CACHE_KEY_CATEGORIES = '@cache_categories';
const CACHE_KEY_CITIES = '@cache_cities';
const CACHE_KEY_NEIGHBORHOODS = '@cache_neighborhoods';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper: get cached data or fetch from API
async function getCachedOrFetch(cacheKey: string, apiPath: string, params?: any): Promise<any> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }
  } catch (e) {
    // Cache read failed, will fetch from API
  }
  
  const response = await api.get(apiPath, { params });
  const data = response.data;
  
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    // Cache write failed, data still available
  }
  
  return data;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface City {
  id: string;
  name: string;
  state: string;
}

interface Provider {
  provider_id: string;
  name: string;
  phone: string;
  categories?: string[];  // Multiple categories
  category?: string;  // Legacy single category
  cities?: string[];  // Multiple cities
  neighborhood: string;
  description: string;
  profile_image?: string;
  average_rating: number;
  total_reviews: number;
}

export default function HomeScreen() {
  const { user, isLoading: authLoading, login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [bannerData, setBannerData] = useState<{image: string; link?: string; active: boolean} | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  
  // Jobs tab state
  const [activeMainTab, setActiveMainTab] = useState<'services' | 'jobs'>('services');
  const [jobListings, setJobListings] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobCityFilter, setJobCityFilter] = useState<string | null>(null);
  const [jobAvailableCities, setJobAvailableCities] = useState<string[]>([]);
  const [jobAvailableCompanies, setJobAvailableCompanies] = useState<string[]>([]);
  const [showJobSubmitForm, setShowJobSubmitForm] = useState(false);
  const [jobSubmitting, setJobSubmitting] = useState(false);
  // Company state
  const [myCompany, setMyCompany] = useState<any>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [showCompanyRegForm, setShowCompanyRegForm] = useState(false);
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanyCnpj, setRegCompanyCnpj] = useState('');
  const [regCompanyEmail, setRegCompanyEmail] = useState('');
  const [regCompanyPhone, setRegCompanyPhone] = useState('');
  const [regCompanyCity, setRegCompanyCity] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  // Company jobs management
  const [myCompanyJobs, setMyCompanyJobs] = useState<any[]>([]);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobRequirements, setNewJobRequirements] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobCity, setNewJobCity] = useState('');
  const [newJobSubmitting, setNewJobSubmitting] = useState(false);

  // Check if tutorial should be shown
  useEffect(() => {
    async function checkTutorial() {
      const completed = await checkTutorialCompleted();
      if (!completed && isAuthenticated) {
        // Small delay to let the UI render first
        setTimeout(() => setShowTutorial(true), 500);
      }
    }
    if (!authLoading) {
      checkTutorial();
    }
  }, [authLoading, isAuthenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated]);

  // Load favorites
  const loadFavorites = useCallback(async () => {
    try {
      const response = await api.get('/users/favorites');
      setFavorites(response.data.map((p: Provider) => p.provider_id));
    } catch (error) {
      console.log('Error loading favorites:', error);
    }
  }, []);

  // Load unread notifications count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.log('Error loading unread count:', error);
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = async (providerId: string) => {
    try {
      const response = await api.post(`/users/favorites/${providerId}`);
      if (response.data.is_favorite) {
        setFavorites([...favorites, providerId]);
      } else {
        setFavorites(favorites.filter(id => id !== providerId));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar favoritos');
    }
  };

  // Share provider
  const shareProvider = async (provider: Provider) => {
    const categoryNames = (provider.categories || [provider.category])
      .filter(Boolean)
      .map(catId => getCategoryName(catId || ''))
      .join(', ');
    
    // Get location text - first city + count if more
    let locationText = '';
    if (provider.cities && provider.cities.length > 0) {
      const firstCity = getCityName(provider.cities[0]);
      locationText = provider.cities.length > 1 
        ? `${firstCity} +${provider.cities.length - 1}` 
        : firstCity;
    } else if (provider.neighborhoods && provider.neighborhoods.length > 0) {
      locationText = provider.neighborhoods[0];
      if (provider.neighborhoods.length > 1) {
        locationText += ` +${provider.neighborhoods.length - 1}`;
      }
    } else if (provider.neighborhood) {
      locationText = provider.neighborhood;
    } else {
      locationText = 'Três Lagoas - MS';
    }
    
    const message = `🔧 *${provider.name}*\n\n` +
      `📋 ${categoryNames}\n` +
      `📍 ${locationText}\n` +
      `📞 ${provider.phone}\n\n` +
      `Encontre este e outros profissionais no AchaServiço!`;
    
    try {
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  // Fetch job listings
  const fetchJobListings = useCallback(async () => {
    try {
      setIsLoadingJobs(true);
      const params: any = {};
      if (jobCityFilter) params.city = jobCityFilter;
      if (jobSearchQuery) params.search = jobSearchQuery;
      const [jobsRes, filtersRes] = await Promise.all([
        api.get('/jobs', { params }),
        api.get('/jobs/filters'),
      ]);
      setJobListings(jobsRes.data || []);
      setJobAvailableCities(filtersRes.data?.cities || []);
      setJobAvailableCompanies(filtersRes.data?.companies || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [jobCityFilter, jobSearchQuery]);

  // Fetch jobs when tab switches or filters change
  useEffect(() => {
    if (activeMainTab === 'jobs') {
      fetchJobListings();
    }
  }, [activeMainTab, fetchJobListings]);

  const getJobTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
    return `${Math.floor(diffDays / 30)} mês(es) atrás`;
  };

  const handleSubmitJob = async () => {
    if (!newJobTitle.trim() || !newJobRequirements.trim() || !newJobDescription.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      setNewJobSubmitting(true);
      await api.post('/jobs/submit', {
        company_name: myCompany?.company?.company_name || '',
        job_title: newJobTitle.trim(),
        email: myCompany?.company?.email || '',
        phone: myCompany?.company?.phone || null,
        requirements: newJobRequirements.trim(),
        description: newJobDescription.trim(),
        city: newJobCity.trim() || myCompany?.company?.city || '',
      });
      Alert.alert('Sucesso!', 'Vaga publicada com sucesso!');
      setShowNewJobForm(false);
      setNewJobTitle('');
      setNewJobRequirements('');
      setNewJobDescription('');
      setNewJobCity('');
      fetchMyCompanyJobs();
      fetchJobListings();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.detail || 'Erro ao publicar vaga');
    } finally {
      setNewJobSubmitting(false);
    }
  };

  const handleRegisterCompany = async () => {
    if (!regCompanyName.trim() || !regCompanyEmail.trim() || !regCompanyPhone.trim()) {
      Alert.alert('Erro', 'Preencha pelo menos: Nome, Email e Telefone');
      return;
    }
    try {
      setRegSubmitting(true);
      await api.post('/companies/register', {
        company_name: regCompanyName.trim(),
        cnpj: regCompanyCnpj.trim() || null,
        email: regCompanyEmail.trim(),
        phone: regCompanyPhone.trim(),
        city: regCompanyCity.trim(),
      });
      Alert.alert('Sucesso!', 'Empresa cadastrada! Aguarde a aprovação do administrador.');
      setShowCompanyRegForm(false);
      fetchMyCompany();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.detail || 'Erro ao cadastrar empresa');
    } finally {
      setRegSubmitting(false);
    }
  };

  const fetchMyCompany = async () => {
    try {
      setCompanyLoading(true);
      const response = await api.get('/companies/my');
      setMyCompany(response.data);
    } catch (error) {
      console.log('No company found');
    } finally {
      setCompanyLoading(false);
    }
  };

  const fetchMyCompanyJobs = async () => {
    try {
      const response = await api.get('/companies/my-jobs');
      setMyCompanyJobs(response.data || []);
    } catch (error) {
      console.log('Error fetching company jobs');
    }
  };

  const handleDeleteMyJob = (job: any) => {
    Alert.alert('Excluir Vaga', `Deseja excluir a vaga "${job.job_title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/companies/jobs/${job.job_id}`);
            fetchMyCompanyJobs();
            fetchJobListings();
            Alert.alert('Sucesso', 'Vaga excluída!');
          } catch (error) {
            Alert.alert('Erro', 'Erro ao excluir vaga');
          }
        }
      }
    ]);
  };

  // Fetch company data when jobs tab is active
  useEffect(() => {
    if (activeMainTab === 'jobs' && user) {
      fetchMyCompany();
    }
  }, [activeMainTab, user]);

  const fetchData = useCallback(async () => {
    try {
      const [catData, citiesData, neighData] = await Promise.all([
        getCachedOrFetch(CACHE_KEY_CATEGORIES, '/categories'),
        getCachedOrFetch(CACHE_KEY_CITIES, '/cities'),
        getCachedOrFetch(CACHE_KEY_NEIGHBORHOODS, '/neighborhoods'),
      ]);
      setCategories(catData);
      setCities(citiesData);
      setNeighborhoods(neighData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  // Buscar bairros quando a cidade muda
  const fetchNeighborhoods = useCallback(async (cityId: string | null) => {
    try {
      const params: any = {};
      if (cityId) {
        params.city = cityId;
      }
      const response = await api.get('/neighborhoods', { params });
      setNeighborhoods(response.data);
      // Resetar bairro selecionado quando cidade muda
      setSelectedNeighborhood(null);
    } catch (error) {
      console.error('Error fetching neighborhoods:', error);
    }
  }, []);

  // Quando cidade muda, buscar bairros correspondentes
  useEffect(() => {
    fetchNeighborhoods(selectedCity);
  }, [selectedCity, fetchNeighborhoods]);

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (selectedCity) params.city = selectedCity;
      if (selectedNeighborhood) params.neighborhood = selectedNeighborhood;
      if (searchQuery) params.search = searchQuery;
      params.limit = 50; // Load up to 50 providers
      
      const response = await api.get('/providers', { params });
      // Support both paginated response {providers: [...]} and legacy array response
      const data = response.data;
      if (Array.isArray(data)) {
        setProviders(data);
      } else if (data?.providers) {
        setProviders(data.providers);
      } else {
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedCity, selectedNeighborhood, searchQuery]);

  useEffect(() => {
    fetchData();
    loadFavorites();
    loadUnreadCount();
    // Check for active banner
    api.get('/banner').then(res => {
      if (res.data && res.data.active && res.data.image) {
        setBannerData(res.data);
        setShowBanner(true);
      }
    }).catch(() => {});
  }, [fetchData, loadFavorites, loadUnreadCount]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadUnreadCount();
        loadFavorites();
      }
      // Always refresh providers/jobs when screen gains focus
      fetchProviders();
    }, [isAuthenticated, loadUnreadCount, loadFavorites, fetchProviders])
  );

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Auto-refresh notification count every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadUnreadCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchProviders()]);
    setRefreshing(false);
  }, [fetchData, fetchProviders]);

  const openWhatsApp = async (phone: string, providerName: string, providerId: string) => {
    // Register contact before opening WhatsApp
    try {
      await api.post(`/providers/${providerId}/contact`);
    } catch (error) {
      // Silently fail - user can still contact
      console.log('Could not register contact:', error);
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${providerName}! Encontrei seu perfil no AchaServiço e gostaria de solicitar um orçamento.`);
    const url = `https://wa.me/55${cleanPhone}?text=${message}`;
    Linking.openURL(url);
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getCityName = (cityId: string) => {
    if (!cityId) return '';
    const city = cities.find(c => c.id === cityId);
    if (city?.name) return city.name;
    return cityId
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - rating < 1 ? 'star-half' : 'star-outline'}
          size={14}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AchaServiço</Text>
          <Text style={styles.headerSubtitle}>Encontre profissionais de confiança</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
            data-testid="notification-bell-btn"
          >
            <Ionicons name="notifications-outline" size={26} color="#10B981" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Profile Button */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => user ? router.push('/profile') : login()}
          >
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.profileImage} />
            ) : (
              <Ionicons name="person-circle-outline" size={36} color="#10B981" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeMainTab === 'jobs' ? "Buscar vaga ou empresa..." : "Buscar serviço ou profissional..."}
            placeholderTextColor="#6B7280"
            value={activeMainTab === 'jobs' ? jobSearchQuery : searchQuery}
            onChangeText={activeMainTab === 'jobs' ? setJobSearchQuery : setSearchQuery}
          />
          {(activeMainTab === 'jobs' ? jobSearchQuery : searchQuery) ? (
            <TouchableOpacity onPress={() => activeMainTab === 'jobs' ? setJobSearchQuery('') : setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Tab Toggle: Serviços | Vagas */}
      <View style={styles.mainTabToggle}>
        <TouchableOpacity
          style={[styles.mainTabButton, activeMainTab === 'services' && styles.mainTabButtonActive]}
          onPress={() => setActiveMainTab('services')}
        >
          <Ionicons name="construct" size={18} color={activeMainTab === 'services' ? '#FFFFFF' : '#10B981'} />
          <Text style={[styles.mainTabText, activeMainTab === 'services' && styles.mainTabTextActive]}>
            Serviços
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTabButton, activeMainTab === 'jobs' && styles.mainTabButtonActive]}
          onPress={() => setActiveMainTab('jobs')}
        >
          <Ionicons name="briefcase" size={18} color={activeMainTab === 'jobs' ? '#FFFFFF' : '#10B981'} />
          <Text style={[styles.mainTabText, activeMainTab === 'jobs' && styles.mainTabTextActive]}>
            Vagas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modern Filter Chips - Only show for services */}
      {activeMainTab === 'services' && (
      <View style={styles.filterChipsContainer}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCity && styles.filterChipActive]}
          onPress={() => setShowCityPicker(true)}
        >
          <Ionicons name="location" size={16} color={selectedCity ? '#FFFFFF' : '#10B981'} />
          <Text style={[styles.filterChipText, selectedCity && styles.filterChipTextActive]} numberOfLines={1}>
            {selectedCity ? cities.find(c => c.id === selectedCity)?.name : 'Cidade'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={selectedCity ? '#FFFFFF' : '#10B981'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedNeighborhood && styles.filterChipActive]}
          onPress={() => setShowNeighborhoodPicker(true)}
          disabled={!selectedCity}
        >
          <Ionicons name="map" size={16} color={selectedNeighborhood ? '#FFFFFF' : selectedCity ? '#10B981' : '#6B7280'} />
          <Text style={[styles.filterChipText, selectedNeighborhood && styles.filterChipTextActive, !selectedCity && styles.filterChipTextDisabled]} numberOfLines={1}>
            {selectedNeighborhood || 'Bairro'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={selectedNeighborhood ? '#FFFFFF' : selectedCity ? '#10B981' : '#6B7280'} />
        </TouchableOpacity>

        {(selectedCity || selectedNeighborhood || selectedCategory) && (
          <TouchableOpacity
            style={styles.clearFiltersChip}
            onPress={() => {
              setSelectedCity(null);
              setSelectedNeighborhood(null);
              setSelectedCategory(null);
            }}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.clearFiltersText}>Limpar</Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* City Bottom Sheet Modal */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowCityPicker(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>📍 Selecione a Cidade</Text>
            
            <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.bottomSheetOption, !selectedCity && styles.bottomSheetOptionActive]}
                onPress={() => { setSelectedCity(null); setSelectedNeighborhood(null); setShowCityPicker(false); }}
              >
                <Ionicons name="globe-outline" size={20} color={!selectedCity ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.bottomSheetOptionText, !selectedCity && styles.bottomSheetOptionTextActive]}>
                  Todas as cidades
                </Text>
                {!selectedCity && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
              </TouchableOpacity>
              
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.bottomSheetOption, selectedCity === city.id && styles.bottomSheetOptionActive]}
                  onPress={() => { setSelectedCity(city.id); setSelectedNeighborhood(null); setShowCityPicker(false); }}
                >
                  <Ionicons name="business-outline" size={20} color={selectedCity === city.id ? '#10B981' : '#9CA3AF'} />
                  <Text style={[styles.bottomSheetOptionText, selectedCity === city.id && styles.bottomSheetOptionTextActive]}>
                    {city.name} - {city.state}
                  </Text>
                  {selectedCity === city.id && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Neighborhood Bottom Sheet Modal */}
      <Modal
        visible={showNeighborhoodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNeighborhoodPicker(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowNeighborhoodPicker(false)}
        >
          <View style={styles.bottomSheetContainer}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>🏘️ Selecione o Bairro</Text>
            
            <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.bottomSheetOption, !selectedNeighborhood && styles.bottomSheetOptionActive]}
                onPress={() => { setSelectedNeighborhood(null); setShowNeighborhoodPicker(false); }}
              >
                <Ionicons name="layers-outline" size={20} color={!selectedNeighborhood ? '#10B981' : '#9CA3AF'} />
                <Text style={[styles.bottomSheetOptionText, !selectedNeighborhood && styles.bottomSheetOptionTextActive]}>
                  Todos os bairros
                </Text>
                {!selectedNeighborhood && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
              </TouchableOpacity>
              
              {neighborhoods.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.bottomSheetOption, selectedNeighborhood === n && styles.bottomSheetOptionActive]}
                  onPress={() => { setSelectedNeighborhood(n); setShowNeighborhoodPicker(false); }}
                >
                  <Ionicons name="navigate-outline" size={20} color={selectedNeighborhood === n ? '#10B981' : '#9CA3AF'} />
                  <Text style={[styles.bottomSheetOptionText, selectedNeighborhood === n && styles.bottomSheetOptionTextActive]}>
                    {n}
                  </Text>
                  {selectedNeighborhood === n && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner - Seja um Prestador */}
        {activeMainTab === 'services' && user && !user.is_provider && (
          <TouchableOpacity
            style={styles.providerBanner}
            onPress={() => router.push('/provider/register')}
            activeOpacity={0.9}
          >
            <View style={styles.providerBannerContent}>
              <View style={styles.providerBannerIcon}>
                <Ionicons name="briefcase" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.providerBannerText}>
                <Text style={styles.providerBannerTitle}>Seja um Prestador!</Text>
                <Text style={styles.providerBannerSubtitle}>Cadastre-se grátis e divulgue seus serviços</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Banner - Acessar Dashboard (para prestadores) */}
        {activeMainTab === 'services' && user && user.is_provider && (
          <TouchableOpacity
            style={styles.providerDashboardBanner}
            onPress={() => router.push('/provider/dashboard')}
            activeOpacity={0.9}
          >
            <View style={styles.providerBannerContent}>
              <View style={styles.providerDashboardIcon}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.providerBannerText}>
                <Text style={styles.providerDashboardTitle}>Meu Painel</Text>
                <Text style={styles.providerDashboardSubtitle}>Gerencie seu perfil de prestador</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* Categories - Only show for services */}
        {activeMainTab === 'services' && (
        <>
        <Text style={styles.sectionTitle}>Categorias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="apps" size={16} color={!selectedCategory ? '#0A0A0A' : '#10B981'} />
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.slice(0, 8).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={16}
                color={selectedCategory === cat.id ? '#0A0A0A' : '#10B981'}
              />
              <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          {selectedCategory && !categories.slice(0, 8).find(c => c.id === selectedCategory) && (
            <TouchableOpacity
              style={[styles.categoryChip, styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Ionicons
                name={(categories.find(c => c.id === selectedCategory)?.icon || 'briefcase') as any}
                size={16}
                color="#0A0A0A"
              />
              <Text style={[styles.categoryChipText, styles.categoryChipTextActive]}>
                {categories.find(c => c.id === selectedCategory)?.name}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.categoryChipMore}
            onPress={() => { setCategorySearchText(''); setShowCategoryModal(true); }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#10B981" />
            <Text style={styles.categoryChipMoreText}>Mais ({categories.length})</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Banner Popup */}
        <Modal
          visible={showBanner}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowBanner(false)}
        >
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContainer}>
              <TouchableOpacity 
                style={styles.bannerCloseBtn}
                onPress={() => setShowBanner(false)}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              {bannerData?.image && (
                <TouchableOpacity 
                  activeOpacity={bannerData.link ? 0.8 : 1}
                  onPress={() => {
                    if (bannerData.link) {
                      Linking.openURL(bannerData.link);
                    }
                    setShowBanner(false);
                  }}
                >
                  <Image 
                    source={{ uri: bannerData.image }} 
                    style={styles.bannerImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        {/* Category Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.catModalOverlay}>
            <TouchableOpacity style={{ flex: 0.2 }} activeOpacity={1} onPress={() => setShowCategoryModal(false)} />
            <View style={styles.catModalContent}>
              <View style={styles.catModalHeader}>
                <Text style={styles.catModalTitle}>Todas as Categorias</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={styles.catModalSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.catModalSearchInput}
                  placeholder="Buscar categoria..."
                  placeholderTextColor="#6B7280"
                  value={categorySearchText}
                  onChangeText={setCategorySearchText}
                  autoFocus
                />
                {categorySearchText.length > 0 && (
                  <TouchableOpacity onPress={() => setCategorySearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.catModalList} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={[styles.catModalItem, !selectedCategory && styles.catModalItemActive]}
                  onPress={() => { setSelectedCategory(null); setShowCategoryModal(false); }}
                >
                  <Ionicons name="apps" size={22} color={!selectedCategory ? '#0A0A0A' : '#10B981'} />
                  <Text style={[styles.catModalItemText, !selectedCategory && styles.catModalItemTextActive]}>Todas as Categorias</Text>
                  {!selectedCategory && <Ionicons name="checkmark" size={20} color="#0A0A0A" />}
                </TouchableOpacity>
                {categories
                  .filter(cat => cat.name.toLowerCase().includes(categorySearchText.toLowerCase()))
                  .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catModalItem, selectedCategory === cat.id && styles.catModalItemActive]}
                    onPress={() => { setSelectedCategory(cat.id); setShowCategoryModal(false); }}
                  >
                    <Ionicons name={cat.icon as any} size={22} color={selectedCategory === cat.id ? '#0A0A0A' : '#10B981'} />
                    <Text style={[styles.catModalItemText, selectedCategory === cat.id && styles.catModalItemTextActive]}>
                      {cat.name}
                    </Text>
                    {selectedCategory === cat.id && <Ionicons name="checkmark" size={20} color="#0A0A0A" />}
                  </TouchableOpacity>
                ))}
                {categories.filter(cat => cat.name.toLowerCase().includes(categorySearchText.toLowerCase())).length === 0 && (
                  <Text style={styles.catModalEmpty}>Nenhuma categoria encontrada</Text>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Providers List */}
        <Text style={styles.sectionTitle}>
          Profissionais {providers.length > 0 && `(${providers.length})`}
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
        ) : providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#374151" />
            <Text style={styles.emptyTitle}>Nenhum profissional encontrado</Text>
            <Text style={styles.emptyText}>
              Tente ajustar os filtros ou buscar por outro termo
            </Text>
          </View>
        ) : (
          providers.map((provider) => (
            <TouchableOpacity
              key={provider.provider_id}
              style={styles.providerCard}
              onPress={() => router.push(`/provider/${provider.provider_id}`)}
            >
              <View style={styles.providerHeader}>
                {provider.profile_image ? (
                  <Image
                    source={{ uri: provider.profile_image }}
                    style={styles.providerImage}
                  />
                ) : (
                  <View style={styles.providerImagePlaceholder}>
                    <Ionicons name="person" size={32} color="#6B7280" />
                  </View>
                )}
                <View style={styles.providerInfo}>
                  <View style={styles.providerNameRow}>
                    <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
                    {provider.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.verifiedText}>Verificado</Text>
                      </View>
                    )}
                    {provider.is_premium && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumText}>👑 Premium</Text>
                      </View>
                    )}
                  </View>
                  
                  {/* 1. Services/Categories - First */}
                  <View style={styles.categoriesRow}>
                    {(provider.categories || [provider.category]).filter(Boolean).slice(0, 2).map((catId, index) => (
                      <View key={index} style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{getCategoryName(catId || '')}</Text>
                      </View>
                    ))}
                    {(provider.categories?.length || 0) > 2 && (
                      <Text style={styles.moreCategoriesText}>+{(provider.categories?.length || 0) - 2}</Text>
                    )}
                  </View>
                  
                  {/* 2. Cities - Second */}
                  {provider.cities && provider.cities.length > 0 && (
                    <View style={styles.citiesRow}>
                      <Ionicons name="business" size={12} color="#10B981" />
                      <Text style={styles.citiesInlineText} numberOfLines={1}>
                        {provider.cities.slice(0, 2).map(c => getCityName(c)).join(', ')}
                        {provider.cities.length > 2 ? ` +${provider.cities.length - 2}` : ''}
                      </Text>
                    </View>
                  )}
                  
                  {/* 3. Neighborhoods - Third */}
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#6B7280" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {provider.neighborhoods && provider.neighborhoods.length > 0 
                        ? provider.neighborhoods.slice(0, 2).join(', ') + (provider.neighborhoods.length > 2 ? ` +${provider.neighborhoods.length - 2}` : '')
                        : provider.neighborhood || 'Não informado'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.providerDescription} numberOfLines={2}>
                {provider.description}
              </Text>
              
              <View style={styles.providerFooter}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="chatbubbles" size={16} color="#10B981" />
                  <Text style={styles.ratingText}>
                    {provider.total_reviews} {provider.total_reviews === 1 ? 'avaliação' : 'avaliações'}
                  </Text>
                </View>
                
                <View style={styles.actionButtons}>
                  {/* Favorite Button */}
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => toggleFavorite(provider.provider_id)}
                  >
                    <Ionicons 
                      name={favorites.includes(provider.provider_id) ? "heart" : "heart-outline"} 
                      size={22} 
                      color={favorites.includes(provider.provider_id) ? "#EF4444" : "#6B7280"} 
                    />
                  </TouchableOpacity>
                  
                  {/* Share Button */}
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => shareProvider(provider)}
                  >
                    <Ionicons name="share-social-outline" size={22} color="#6B7280" />
                  </TouchableOpacity>
                  
                  {/* WhatsApp Button */}
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => openWhatsApp(provider.phone, provider.name, provider.provider_id)}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={styles.whatsappButtonText}>Orçamento</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        </>
        )}

        {/* ========== JOBS TAB CONTENT ========== */}
        {activeMainTab === 'jobs' && (
          <>
            {/* Job City Filter Chips */}
            {jobAvailableCities.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.mainTabButton, !jobCityFilter && styles.mainTabButtonActive, { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: !jobCityFilter ? '#10B981' : '#1F2937', marginRight: 8 }]}
                  onPress={() => setJobCityFilter(null)}
                >
                  <Text style={{ color: !jobCityFilter ? '#FFF' : '#9CA3AF', fontSize: 13, fontWeight: '600' }}>Todas</Text>
                </TouchableOpacity>
                {jobAvailableCities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: jobCityFilter === city ? '#10B981' : '#1F2937', marginRight: 8 }]}
                    onPress={() => setJobCityFilter(jobCityFilter === city ? null : city)}
                  >
                    <Text style={{ color: jobCityFilter === city ? '#FFF' : '#9CA3AF', fontSize: 13, fontWeight: '600' }}>
                      {getCityName(city)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Company Section - Registration or Management */}
            {user && (
              <View style={{ marginBottom: 16 }}>
                {companyLoading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : !myCompany?.has_company ? (
                  /* No company - Show registration CTA */
                  <View>
                    {!showCompanyRegForm ? (
                      <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 20, alignItems: 'center' }}>
                        <Ionicons name="business-outline" size={40} color="#8B5CF6" />
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginTop: 12, textAlign: 'center' }}>Quer anunciar vagas?</Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 16 }}>
                          Cadastre sua empresa para publicar vagas no AchaServiço. É rápido e fácil!
                        </Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 }}
                          onPress={() => setShowCompanyRegForm(true)}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Cadastrar Minha Empresa</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* Company Registration Form */
                      <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#8B5CF6' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>Cadastro da Empresa</Text>
                        <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 12 }}>Após o cadastro, o administrador irá analisar e aprovar sua empresa.</Text>
                        <TextInput style={styles.jobFormInput} placeholder="Nome da Empresa *" placeholderTextColor="#6B7280" value={regCompanyName} onChangeText={setRegCompanyName} />
                        <TextInput style={styles.jobFormInput} placeholder="CNPJ (opcional)" placeholderTextColor="#6B7280" value={regCompanyCnpj} onChangeText={setRegCompanyCnpj} />
                        <TextInput style={styles.jobFormInput} placeholder="Email Corporativo *" placeholderTextColor="#6B7280" value={regCompanyEmail} onChangeText={setRegCompanyEmail} keyboardType="email-address" autoCapitalize="none" />
                        <TextInput style={styles.jobFormInput} placeholder="Telefone/WhatsApp *" placeholderTextColor="#6B7280" value={regCompanyPhone} onChangeText={setRegCompanyPhone} keyboardType="phone-pad" />
                        <TextInput style={styles.jobFormInput} placeholder="Cidade" placeholderTextColor="#6B7280" value={regCompanyCity} onChangeText={setRegCompanyCity} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#374151', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                            onPress={() => setShowCompanyRegForm(false)}
                          >
                            <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#8B5CF6', paddingVertical: 12, borderRadius: 8, alignItems: 'center', opacity: regSubmitting ? 0.6 : 1 }}
                            onPress={handleRegisterCompany}
                            disabled={regSubmitting}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{regSubmitting ? 'Enviando...' : 'Cadastrar'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ) : myCompany?.company?.status === 'pending' ? (
                  /* Company pending approval */
                  <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B40' }}>
                    <Ionicons name="hourglass-outline" size={36} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>Empresa em Análise</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                      Sua empresa "{myCompany.company.company_name}" está sendo analisada pelo administrador. Você será notificado quando for aprovada.
                    </Text>
                  </View>
                ) : myCompany?.company?.status === 'approved' ? (
                  /* Company approved - Navigate to Dashboard */
                  <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#10B98140' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="business" size={22} color="#10B981" />
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>{myCompany.company.company_name}</Text>
                      </View>
                      <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>Aprovada</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={{ backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      onPress={() => router.push('/company/dashboard')}
                    >
                      <Ionicons name="briefcase" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Gerenciar Minhas Vagas</Text>
                    </TouchableOpacity>
                  </View>
                ) : myCompany?.company?.status === 'blocked' ? (
                  /* Company blocked */
                  <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}>
                    <Ionicons name="ban" size={36} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>Empresa Bloqueada</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                      Sua empresa foi bloqueada. Entre em contato com o administrador.
                    </Text>
                  </View>
                ) : (
                  /* Company rejected */
                  <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}>
                    <Ionicons name="close-circle" size={36} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: 'bold', marginTop: 10 }}>Cadastro Recusado</Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                      O cadastro da sua empresa foi recusado. Entre em contato com o administrador para mais informações.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>
              Vagas Disponíveis {jobListings.length > 0 && `(${jobListings.length})`}
            </Text>

            {isLoadingJobs ? (
              <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
            ) : jobListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color="#374151" />
                <Text style={styles.emptyTitle}>Nenhuma vaga disponível</Text>
                <Text style={styles.emptyText}>
                  No momento não há vagas publicadas. Volte em breve!
                </Text>
              </View>
            ) : (
              jobListings.map((job: any) => (
                <TouchableOpacity
                  key={job.job_id}
                  style={styles.jobCard}
                  onPress={() => router.push(`/jobs/${job.job_id}`)}
                >
                  <View style={styles.jobCardHeader}>
                    {job.company_logo ? (
                      <Image source={{ uri: job.company_logo }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#111827' }} />
                    ) : (
                      <View style={styles.jobIconContainer}>
                        <Ionicons name="business" size={24} color="#10B981" />
                      </View>
                    )}
                    <View style={styles.jobCardInfo}>
                      <Text style={styles.jobCompanyName}>{job.company_name}</Text>
                      <Text style={styles.jobTitle}>{job.job_title}</Text>
                      <View style={styles.jobMeta}>
                        {job.city && (
                          <View style={styles.jobMetaItem}>
                            <Ionicons name="location" size={12} color="#6B7280" />
                            <Text style={styles.jobMetaText}>
                              {getCityName(job.city)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.jobMetaItem}>
                          <Ionicons name="time" size={12} color="#6B7280" />
                          <Text style={styles.jobMetaText}>{getJobTimeAgo(job.created_at)}</Text>
                        </View>
                        {job.attachment_url && (
                          <View style={styles.jobMetaItem}>
                            <Ionicons name="attach" size={12} color="#8B5CF6" />
                            <Text style={[styles.jobMetaText, { color: '#8B5CF6' }]}>Anexo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Onboarding Tutorial */}
      {showTutorial && (
        <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  neighborhoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  neighborhoodButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  neighborhoodPicker: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 40,
  },
  neighborhoodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 8,
  },
  neighborhoodChipActive: {
    backgroundColor: '#10B981',
  },
  neighborhoodChipText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  neighborhoodChipTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryChipMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    marginRight: 8,
  },
  categoryChipMoreText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  catModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  catModalContent: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  catModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  catModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catModalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  catModalSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  catModalList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  catModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    gap: 12,
  },
  catModalItemActive: {
    backgroundColor: '#10B981',
  },
  catModalItemText: {
    flex: 1,
    fontSize: 15,
    color: '#D1D5DB',
  },
  catModalItemTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  catModalEmpty: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  // Banner styles
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bannerContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 0.65,
    borderRadius: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
  },
  categoryChipText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#0A0A0A',
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  providerCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  providerImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  providerImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  citiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  citiesInlineText: {
    color: '#9CA3AF',
    fontSize: 12,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  availableText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#FFD70030',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  moreCategoriesText: {
    color: '#6B7280',
    fontSize: 12,
    alignSelf: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#6B7280',
    fontSize: 13,
  },
  providerDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  providerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
  },
  ratingText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  bottomSpacer: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Banner - Seja um Prestador (para novos usuários)
  providerBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  providerBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  providerBannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  providerBannerText: {
    flex: 1,
  },
  providerBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  providerBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Banner - Dashboard (para prestadores existentes)
  providerDashboardBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  providerDashboardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerDashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  providerDashboardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Modern Filter Chips Styles
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B981',
    maxWidth: 140,
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterChipTextDisabled: {
    color: '#6B7280',
  },
  clearFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  clearFiltersText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: 30,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bottomSheetScroll: {
    paddingHorizontal: 16,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
    gap: 12,
  },
  bottomSheetOptionActive: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  bottomSheetOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#D1D5DB',
  },
  bottomSheetOptionTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  // Main Tab Toggle (Serviços | Vagas)
  mainTabToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
  },
  mainTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mainTabButtonActive: {
    backgroundColor: '#10B981',
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  mainTabTextActive: {
    color: '#FFFFFF',
  },
  // Job Cards
  jobCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jobCardInfo: {
    flex: 1,
  },
  jobCompanyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 6,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  jobMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jobMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobFormInput: {
    backgroundColor: '#111827',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
});
