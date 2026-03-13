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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated]);

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
  }, [fetchData]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchProviders()]);
    setRefreshing(false);
  }, [fetchData, fetchProviders]);

  const openWhatsApp = (phone: string, providerName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${providerName}! Encontrei seu perfil no AchaServiço e gostaria de solicitar um orçamento.`);
    const url = `https://wa.me/55${cleanPhone}?text=${message}`;
    Linking.openURL(url);
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
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

      {/* City Filter */}
      <TouchableOpacity
        style={styles.neighborhoodButton}
        onPress={() => setShowCityPicker(!showCityPicker)}
      >
        <Ionicons name="business" size={18} color="#10B981" />
        <Text style={styles.neighborhoodButtonText}>
          {selectedCity ? cities.find(c => c.id === selectedCity)?.name + ' - ' + cities.find(c => c.id === selectedCity)?.state : 'Todas as cidades'}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#10B981" />
      </TouchableOpacity>

      {showCityPicker && (
        <ScrollView style={styles.neighborhoodPicker} horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.neighborhoodChip, !selectedCity && styles.neighborhoodChipActive]}
            onPress={() => { setSelectedCity(null); setShowCityPicker(false); }}
          >
            <Text style={[styles.neighborhoodChipText, !selectedCity && styles.neighborhoodChipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          {cities.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={[styles.neighborhoodChip, selectedCity === city.id && styles.neighborhoodChipActive]}
              onPress={() => { setSelectedCity(city.id); setShowCityPicker(false); }}
            >
              <Text style={[styles.neighborhoodChipText, selectedCity === city.id && styles.neighborhoodChipTextActive]}>
                {city.name} - {city.state}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Neighborhood Filter */}
      <TouchableOpacity
        style={styles.neighborhoodButton}
        onPress={() => setShowNeighborhoodPicker(!showNeighborhoodPicker)}
      >
        <Ionicons name="location" size={18} color="#10B981" />
        <Text style={styles.neighborhoodButtonText}>
          {selectedNeighborhood || 'Todos os bairros'}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#10B981" />
      </TouchableOpacity>

      {showNeighborhoodPicker && (
        <ScrollView style={styles.neighborhoodPicker} horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.neighborhoodChip, !selectedNeighborhood && styles.neighborhoodChipActive]}
            onPress={() => { setSelectedNeighborhood(null); setShowNeighborhoodPicker(false); }}
          >
            <Text style={[styles.neighborhoodChipText, !selectedNeighborhood && styles.neighborhoodChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          {neighborhoods.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.neighborhoodChip, selectedNeighborhood === n && styles.neighborhoodChipActive]}
              onPress={() => { setSelectedNeighborhood(n); setShowNeighborhoodPicker(false); }}
            >
              <Text style={[styles.neighborhoodChipText, selectedNeighborhood === n && styles.neighborhoodChipTextActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        showsVerticalScrollIndicator={false}
      >
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
                    <Text style={styles.providerName}>{provider.name}</Text>
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
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="#6B7280" />
                    <Text style={styles.locationText}>{provider.neighborhood}</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.providerDescription} numberOfLines={2}>
                {provider.description}
              </Text>
              
              <View style={styles.providerFooter}>
                <View style={styles.ratingContainer}>
                  <View style={styles.starsRow}>{renderStars(provider.average_rating)}</View>
                  <Text style={styles.ratingText}>
                    {provider.average_rating.toFixed(1)} ({provider.total_reviews})
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.whatsappButton}
                  onPress={() => openWhatsApp(provider.phone, provider.name)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button for Providers */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/provider/dashboard')}
        >
          <Ionicons name="briefcase" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
});
