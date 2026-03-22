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
import OnboardingTutorial, { checkTutorialCompleted } from '../src/components/OnboardingTutorial';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const fetchData = useCallback(async () => {
    try {
      const [catRes, citiesRes] = await Promise.all([
        api.get('/categories'),
        api.get('/cities'),
      ]);
      setCategories(catRes.data);
      setCities(citiesRes.data);
      // Carregar bairros iniciais (todas as cidades)
      const neighRes = await api.get('/neighborhoods');
      setNeighborhoods(neighRes.data);
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
      
      const response = await api.get('/providers', { params });
      setProviders(response.data);
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
  }, [fetchData, loadFavorites, loadUnreadCount]);

  // Refresh unread count when screen comes into focus (after returning from notifications)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadUnreadCount();
      }
    }, [isAuthenticated, loadUnreadCount])
  );

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

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
    const city = cities.find(c => c.id === cityId);
    return city?.name || cityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
            placeholder="Buscar serviço ou profissional..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Modern Filter Chips */}
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
        {user && !user.is_provider && (
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
        {user && user.is_provider && (
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

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categorias</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons name="apps" size={16} color={!selectedCategory ? '#0A0A0A' : '#10B981'} />
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
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
        </ScrollView>

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
});
