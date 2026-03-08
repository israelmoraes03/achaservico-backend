import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

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
  categories: string[];  // Changed from category to categories (array)
  cities?: string[];  // Multiple cities
  neighborhood: string;
  description: string;
  profile_image?: string;
  service_photos?: string[];
  average_rating: number;
  total_reviews: number;
  is_active: boolean;
  subscription_status: string;
  subscription_expires_at?: string;
}

interface Subscription {
  subscription_id: string;
  amount: number;
  status: string;
  expires_at: string;
}

// Utility function to format phone for display
const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  } else if (cleaned.length >= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
  }
  return phone;
};

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { user, provider, isAuthenticated, refreshUser } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  // Edit form state - these are the LOCAL values that the user can edit
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editCities, setEditCities] = useState<string[]>([]);
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [photoIndexToDelete, setPhotoIndexToDelete] = useState<number | null>(null);

  const MAX_SERVICE_PHOTOS = 6;

  // Initialize form with provider data - this ONLY runs when starting to edit
  const initializeFormFromProvider = useCallback(() => {
    if (provider) {
      console.log('Initializing form from provider:', provider.name);
      setEditName(provider.name || '');
      setEditPhone(formatPhoneDisplay(provider.phone || ''));
      setEditCategories(provider.categories || []);
      setEditCities(provider.cities || ['tres_lagoas']);
      setEditNeighborhood(provider.neighborhood || '');
      setEditDescription(provider.description || '');
      setEditProfileImage(provider.profile_image || null);
      setServicePhotos(provider.service_photos || []);
    }
  }, [provider]);

  // When user clicks "Editar" - initialize form and enter edit mode
  const startEditing = useCallback(() => {
    initializeFormFromProvider();
    setIsEditing(true);
  }, [initializeFormFromProvider]);

  // Cancel editing - reset form to provider data
  const cancelEditing = useCallback(() => {
    initializeFormFromProvider();
    setIsEditing(false);
  }, [initializeFormFromProvider]);

  const toggleCategory = (categoryId: string) => {
    console.log('toggleCategory called with:', categoryId);
    console.log('Current editCategories before:', editCategories);
    console.log('isEditing:', isEditing);
    
    setEditCategories(prev => {
      const newCategories = prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId];
      console.log('New editCategories:', newCategories);
      return newCategories;
    });
  };

  const toggleCity = (cityId: string) => {
    console.log('toggleCity called with:', cityId);
    console.log('Current editCities before:', editCities);
    console.log('isEditing:', isEditing);
    
    setEditCities(prev => {
      const newCities = prev.includes(cityId) 
        ? prev.filter(c => c !== cityId)
        : [...prev, cityId];
      console.log('New editCities:', newCities);
      return newCities;
    });
  };

  const getCityName = (cityId: string) => {
    const city = cities.find(c => c.id === cityId);
    return city ? `${city.name} - ${city.state}` : cityId;
  };

  const getSelectedCitiesText = () => {
    if (editCities.length === 0) return 'Selecione as cidades';
    if (editCities.length === cities.length) return 'Todas as cidades';
    return `${editCities.length} cidade(s) selecionada(s)`;
  };

  const fetchData = useCallback(async () => {
    try {
      const [catRes, neighRes, citiesRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/neighborhoods'),
        api.get('/cities'),
        api.get('/subscriptions/status'),
      ]);
      setCategories(catRes.data);
      setNeighborhoods(neighRes.data);
      setCities(citiesRes.data);
      setSubscription(subRes.data.subscription);
      
      await refreshUser();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Use setTimeout to avoid navigation before mount
      const timer = setTimeout(() => {
        router.replace('/login');
      }, 100);
      return () => clearTimeout(timer);
    }
    
    fetchData();
  }, [isAuthenticated, fetchData]);

  // Initialize form data when provider loads (for display in non-edit mode)
  useEffect(() => {
    if (provider && !isEditing) {
      // Only update service photos for display (they are managed separately)
      setServicePhotos(provider.service_photos || []);
      setEditProfileImage(provider.profile_image || null);
    }
  }, [provider, isEditing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 2) {
      formatted = `(${cleaned.slice(0, 2)}`;
    }
    if (cleaned.length >= 3) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}`;
    }
    if (cleaned.length >= 7) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    setEditPhone(formatted);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditProfileImage(newImage);
      
      // Save profile image immediately
      await saveProfileImage(newImage);
    }
  };

  const saveProfileImage = async (imageBase64: string) => {
    if (!provider) return;
    
    try {
      setIsSaving(true);
      await api.put(`/providers/${provider.provider_id}`, {
        profile_image: imageBase64,
      });
      await refreshUser();
      Alert.alert('Sucesso', 'Foto de perfil atualizada!');
    } catch (error: any) {
      console.error('Error saving profile image:', error);
      Alert.alert('Erro', 'Erro ao salvar foto de perfil. Tente novamente.');
      // Revert to previous image
      setEditProfileImage(provider.profile_image || null);
    } finally {
      setIsSaving(false);
    }
  };

  const pickServicePhoto = async () => {
    if (servicePhotos.length >= MAX_SERVICE_PHOTOS) {
      Alert.alert('Limite Atingido', `Você pode adicionar no máximo ${MAX_SERVICE_PHOTOS} fotos de serviços.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newPhoto = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const updatedPhotos = [...servicePhotos, newPhoto];
      setServicePhotos(updatedPhotos);
      
      // Save immediately
      await saveServicePhotos(updatedPhotos);
    }
  };

  const removeServicePhoto = (index: number) => {
    setPhotoIndexToDelete(index);
    setShowDeletePhotoModal(true);
  };

  const confirmDeletePhoto = async () => {
    if (photoIndexToDelete === null) return;
    
    const updatedPhotos = servicePhotos.filter((_, i) => i !== photoIndexToDelete);
    setServicePhotos(updatedPhotos);
    setShowDeletePhotoModal(false);
    setPhotoIndexToDelete(null);
    await saveServicePhotos(updatedPhotos);
  };

  const saveServicePhotos = async (photos: string[]) => {
    if (!provider) return;
    
    try {
      setIsUploadingPhoto(true);
      await api.put(`/providers/${provider.provider_id}`, {
        service_photos: photos,
      });
      await refreshUser();
    } catch (error: any) {
      console.error('Error saving photos:', error);
      Alert.alert('Erro', 'Erro ao salvar fotos. Tente novamente.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!provider) return;
    
    try {
      setIsSaving(true);
      
      console.log('Saving provider data:', {
        categories: editCategories,
        cities: editCities,
      });
      
      const response = await api.put(`/providers/${provider.provider_id}`, {
        name: editName.trim(),
        phone: editPhone.replace(/\D/g, ''),
        categories: editCategories,
        cities: editCities,
        neighborhood: editNeighborhood,
        description: editDescription.trim(),
        profile_image: editProfileImage,
      });

      console.log('Update response:', response.data);
      
      // Exit edit mode
      setIsEditing(false);
      
      // Then refresh user data to get updated values
      await refreshUser();
      
      // Toast message instead of Alert
    } catch (error: any) {
      console.error('Save error:', error);
      const message = error.response?.data?.detail || 'Erro ao atualizar perfil.';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateSubscription = () => {
    // Show payment method choice modal
    setShowPaymentModal(true);
  };

  const handlePayWithPix = () => {
    setShowPaymentModal(false);
    router.push('/payment/pix');
  };

  const handlePayWithCard = async () => {
    setShowPaymentModal(false);
    setIsActivating(true);
    
    try {
      const response = await api.post('/stripe/create-checkout-session');
      const { checkout_url, session_id } = response.data;
      
      if (checkout_url) {
        // Open Stripe Checkout in browser
        await WebBrowser.openBrowserAsync(checkout_url);
        
        // After returning from browser, try to verify and activate payment
        // Use polling because payment might take a moment to complete
        if (session_id) {
          let attempts = 0;
          const maxAttempts = 5;
          const delayMs = 2000; // 2 seconds between attempts
          
          const checkAndActivate = async (): Promise<boolean> => {
            try {
              console.log(`Checking payment status, attempt ${attempts + 1}/${maxAttempts}`);
              const statusResponse = await api.get(`/stripe/payment-status/${session_id}`);
              console.log('Payment status:', statusResponse.data);
              
              if (statusResponse.data.completed) {
                // Payment was successful - manually activate subscription
                console.log('Payment completed, activating subscription...');
                try {
                  const activateResponse = await api.post('/stripe/activate-from-session', { session_id });
                  console.log('Activation response:', activateResponse.data);
                  return true;
                } catch (activateError: any) {
                  console.error('Activation error:', activateError.response?.status, activateError.response?.data);
                  // If 401, try to refresh auth and retry
                  if (activateError.response?.status === 401) {
                    console.log('Auth expired, refreshing...');
                    await refreshUser();
                    // Retry activation
                    const retryResponse = await api.post('/stripe/activate-from-session', { session_id });
                    console.log('Retry activation response:', retryResponse.data);
                    return true;
                  }
                  return false;
                }
              }
              return false;
            } catch (error) {
              console.log('Error checking payment:', error);
              return false;
            }
          };
          
          // Try immediately first
          let activated = await checkAndActivate();
          
          // If not activated, poll a few more times
          while (!activated && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            activated = await checkAndActivate();
          }
          
          if (activated) {
            console.log('Subscription activated successfully!');
          } else {
            console.log('Could not verify payment completion. Please refresh the page.');
          }
        }
        
        // Refresh data to check updated status
        await fetchData();
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      const message = error.response?.data?.detail || 'Erro ao processar pagamento. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setIsActivating(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // No provider profile - redirect to register
  if (!provider) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Painel do Prestador</Text>
          <View style={styles.backButton} />
        </View>
        
        <View style={styles.noProviderContainer}>
          <Ionicons name="briefcase-outline" size={64} color="#374151" />
          <Text style={styles.noProviderTitle}>Você ainda não é um prestador</Text>
          <Text style={styles.noProviderText}>
            Cadastre seu perfil para começar a receber contatos de clientes.
          </Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/provider/register')}
          >
            <Ionicons name="add-circle" size={20} color="#0A0A0A" />
            <Text style={styles.registerButtonText}>Cadastrar como Prestador</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Painel do Prestador</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : startEditing()}
          style={styles.editButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Text style={styles.editButtonText}>{isEditing ? 'Salvar' : 'Editar'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Pending Approval Banner - Show at top when pending */}
        {(subscription?.status === 'pending' || provider.subscription_status === 'pending') && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <View style={styles.pendingBannerContent}>
              <Text style={styles.pendingBannerTitle}>Aguardando Aprovação</Text>
              <Text style={styles.pendingBannerText}>
                Seu pagamento PIX está sendo verificado. A aprovação ocorre em até 24h.
              </Text>
            </View>
          </View>
        )}

        {/* Subscription Status */}
        <View style={[
          styles.subscriptionCard,
          provider.subscription_status === 'active' ? styles.subscriptionActive : 
          (subscription?.status === 'pending' || provider.subscription_status === 'pending') ? styles.subscriptionPending : styles.subscriptionInactive
        ]}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: provider.subscription_status === 'active' ? '#10B981' : 
                  (subscription?.status === 'pending' || provider.subscription_status === 'pending') ? '#F59E0B' : '#EF4444' }
              ]} />
              <Text style={styles.subscriptionStatusText}>
                {provider.subscription_status === 'active' ? 'Assinatura Ativa' : 
                 (subscription?.status === 'pending' || provider.subscription_status === 'pending') ? 'Aguardando Aprovação' : 'Assinatura Inativa'}
              </Text>
            </View>
            <Text style={styles.subscriptionPrice}>R$ 15,00/mês</Text>
          </View>
          
          {provider.subscription_status === 'active' && subscription ? (
            <Text style={styles.subscriptionExpiry}>
              Válida até {formatDate(subscription.expires_at)}
            </Text>
          ) : (subscription?.status === 'pending' || provider.subscription_status === 'pending') ? (
            <View>
              <Text style={styles.subscriptionPendingText}>
                Seu pagamento está sendo verificado pelo administrador
              </Text>
              <View style={styles.pendingInfoBox}>
                <Ionicons name="time" size={20} color="#F59E0B" />
                <Text style={styles.pendingInfoText}>
                  A ativação ocorre em até 24 horas após confirmação do PIX
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.subscriptionInactiveText}>
                Seu perfil não está visível para clientes
              </Text>
              <TouchableOpacity
                style={styles.activateButton}
                onPress={handleActivateSubscription}
                disabled={isActivating}
              >
                {isActivating ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <>
                    <Ionicons name="card" size={18} color="#0A0A0A" />
                    <Text style={styles.activateButtonText}>Ativar Assinatura</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.statValue}>{provider.average_rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles" size={24} color="#10B981" />
            <Text style={styles.statValue}>{provider.total_reviews}</Text>
            <Text style={styles.statLabel}>Avaliações</Text>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Perfil</Text>
          
          {/* Profile Image - Always clickable to change photo */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={pickImage}
            disabled={isSaving}
          >
            {editProfileImage || provider.profile_image ? (
              <Image
                source={{ uri: editProfileImage || provider.profile_image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#6B7280" />
              </View>
            )}
            <View style={styles.imageEditBadge}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Toque para alterar a foto</Text>

          {/* Form Fields */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nome</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editName}
                onChangeText={setEditName}
              />
            ) : (
              <Text style={styles.fieldValue}>{provider.name}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Telefone (WhatsApp)</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editPhone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            ) : (
              <Text style={styles.fieldValue}>{formatPhoneDisplay(provider.phone)}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categorias</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <Text style={styles.selectButtonText}>
                    {editCategories.length === 0 
                      ? 'Selecionar categorias' 
                      : `${editCategories.length} categoria(s) selecionada(s)`}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {/* Selected categories badges */}
                {editCategories.length > 0 && (
                  <View style={styles.selectedCategoriesContainer}>
                    {editCategories.map((catId) => (
                      <TouchableOpacity
                        key={catId}
                        style={styles.categoryBadge}
                        onPress={() => toggleCategory(catId)}
                      >
                        <Text style={styles.categoryBadgeText}>{getCategoryName(catId)}</Text>
                        <Ionicons name="close-circle" size={16} color="#10B981" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {showCategoryPicker && (
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.pickerItem, editCategories.includes(cat.id) && styles.pickerItemActive]}
                          onPress={() => toggleCategory(cat.id)}
                        >
                          <Ionicons 
                            name={editCategories.includes(cat.id) ? "checkbox" : "square-outline"} 
                            size={20} 
                            color={editCategories.includes(cat.id) ? '#10B981' : '#9CA3AF'} 
                          />
                          <Text style={[styles.pickerItemText, editCategories.includes(cat.id) && styles.pickerItemTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.categoriesDisplay}>
                {provider.categories && provider.categories.length > 0 ? (
                  provider.categories.map((catId) => (
                    <View key={catId} style={styles.categoryTagDisplay}>
                      <Text style={styles.categoryTagText}>{getCategoryName(catId)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.fieldValue}>Nenhuma categoria definida</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Cidades de Atuação</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowCityPicker(!showCityPicker)}
                >
                  <Text style={styles.selectButtonText}>
                    {getSelectedCitiesText()}
                  </Text>
                  <Ionicons name={showCityPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {/* Selected cities badges */}
                {editCities.length > 0 && (
                  <View style={styles.selectedCategoriesContainer}>
                    {editCities.map((cityId) => (
                      <TouchableOpacity
                        key={cityId}
                        style={styles.categoryBadge}
                        onPress={() => toggleCity(cityId)}
                      >
                        <Text style={styles.categoryBadgeText}>{getCityName(cityId)}</Text>
                        <Ionicons name="close-circle" size={16} color="#10B981" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {showCityPicker && (
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {cities.map((city) => (
                        <TouchableOpacity
                          key={city.id}
                          style={[styles.pickerItem, editCities.includes(city.id) && styles.pickerItemActive]}
                          onPress={() => toggleCity(city.id)}
                        >
                          <Ionicons 
                            name={editCities.includes(city.id) ? "checkbox" : "square-outline"} 
                            size={20} 
                            color={editCities.includes(city.id) ? '#10B981' : '#9CA3AF'} 
                          />
                          <Ionicons name="location" size={20} color={editCities.includes(city.id) ? '#10B981' : '#9CA3AF'} />
                          <Text style={[styles.pickerItemText, editCities.includes(city.id) && styles.pickerItemTextActive]}>
                            {city.name} - {city.state}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.categoriesDisplay}>
                {provider.cities && provider.cities.length > 0 ? (
                  provider.cities.map((cityId) => (
                    <View key={cityId} style={styles.categoryTagDisplay}>
                      <Text style={styles.categoryTagText}>{getCityName(cityId)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.fieldValue}>Nenhuma cidade definida</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bairro</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowNeighborhoodPicker(!showNeighborhoodPicker)}
                >
                  <Text style={styles.selectButtonText}>{editNeighborhood}</Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showNeighborhoodPicker && (
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {neighborhoods.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[styles.pickerItem, editNeighborhood === n && styles.pickerItemActive]}
                          onPress={() => { setEditNeighborhood(n); setShowNeighborhoodPicker(false); }}
                        >
                          <Text style={[styles.pickerItemText, editNeighborhood === n && styles.pickerItemTextActive]}>
                            {n}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.fieldValue}>{provider.neighborhood}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.fieldValue}>{provider.description}</Text>
            )}
          </View>
        </View>

        {/* View Profile Button */}
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => router.push(`/provider/${provider.provider_id}`)}
        >
          <Ionicons name="eye" size={20} color="#10B981" />
          <Text style={styles.viewProfileButtonText}>Ver Meu Perfil Público</Text>
        </TouchableOpacity>

        {/* Service Photos Gallery */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotos dos Serviços</Text>
            <Text style={styles.photoCount}>{servicePhotos.length}/{MAX_SERVICE_PHOTOS}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Mostre seus trabalhos para atrair mais clientes
          </Text>
          
          <View style={styles.photosGrid}>
            {servicePhotos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri: photo }} style={styles.servicePhoto} />
                <TouchableOpacity 
                  style={styles.removePhotoButton}
                  onPress={() => removeServicePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            
            {servicePhotos.length < MAX_SERVICE_PHOTOS && (
              <TouchableOpacity 
                style={styles.addPhotoButton} 
                onPress={pickServicePhoto}
                disabled={isUploadingPhoto}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <>
                    <Ionicons name="add" size={32} color="#10B981" />
                    <Text style={styles.addPhotoText}>Adicionar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {servicePhotos.length === 0 && (
            <View style={styles.noPhotosHint}>
              <Ionicons name="images-outline" size={24} color="#6B7280" />
              <Text style={styles.noPhotosHintText}>
                Adicione fotos dos seus serviços para mostrar a qualidade do seu trabalho
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Payment Method Selection Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha como pagar</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Assinatura Mensal - R$ 15,00</Text>
            
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={handlePayWithCard}
            >
              <View style={styles.paymentOptionIcon}>
                <Ionicons name="card" size={28} color="#10B981" />
              </View>
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Cartão de Crédito</Text>
                <Text style={styles.paymentOptionDescription}>Ativação instantânea após pagamento</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={handlePayWithPix}
            >
              <View style={styles.paymentOptionIcon}>
                <Ionicons name="qr-code" size={28} color="#10B981" />
              </View>
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>PIX</Text>
                <Text style={styles.paymentOptionDescription}>Ativação em até 24h após confirmação</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Photo Confirmation Modal */}
      <Modal
        visible={showDeletePhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeletePhotoModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="trash-outline" size={50} color="#EF4444" />
            <Text style={styles.deleteModalTitle}>Remover Foto?</Text>
            <Text style={styles.deleteModalText}>
              Deseja realmente remover esta foto do seu portfólio de serviços?
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalButtonCancel}
                onPress={() => {
                  setShowDeletePhotoModal(false);
                  setPhotoIndexToDelete(null);
                }}
              >
                <Text style={styles.deleteModalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalButtonConfirm}
                onPress={confirmDeletePhoto}
              >
                <Ionicons name="trash" size={18} color="#FFFFFF" />
                <Text style={styles.deleteModalButtonConfirmText}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  noProviderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noProviderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  noProviderText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  registerButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  subscriptionActive: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B98140',
  },
  subscriptionPending: {
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  subscriptionInactive: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  subscriptionPendingText: {
    color: '#F59E0B',
    fontSize: 14,
    marginBottom: 12,
  },
  pendingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B10',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  pendingInfoText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 18,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subscriptionStatusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionPrice: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  subscriptionExpiry: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  subscriptionInactiveText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activateButtonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '600',
  },
  // Pending Banner Styles
  pendingBanner: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    alignItems: 'flex-start',
    gap: 12,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  pendingBannerText: {
    color: '#FCD34D',
    fontSize: 13,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoHint: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  fieldValue: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
  categoriesDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTagDisplay: {
    backgroundColor: '#10B98130',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryTagText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  selectedCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  fieldInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 150,
  },
  pickerScroll: {
    padding: 8,
  },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerItemActive: {
    backgroundColor: '#10B98120',
  },
  pickerItemText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  pickerItemTextActive: {
    color: '#10B981',
    fontWeight: '500',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  viewProfileButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  photoCount: {
    color: '#6B7280',
    fontSize: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoWrapper: {
    position: 'relative',
  },
  servicePhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#2D2D2D',
    borderWidth: 2,
    borderColor: '#10B98140',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 4,
  },
  noPhotosHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginTop: 12,
  },
  noPhotosHintText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 32,
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D2D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  paymentOptionInfo: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  paymentOptionDescription: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  // Delete Photo Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  deleteModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteModalText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButtonCancel: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteModalButtonCancelText: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '500',
  },
  deleteModalButtonConfirm: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  deleteModalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
