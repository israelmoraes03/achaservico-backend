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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  blocked?: boolean;
  is_premium?: boolean;
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
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
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
  const [editNeighborhoods, setEditNeighborhoods] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch neighborhoods when selected cities change during editing
  useEffect(() => {
    const fetchNeighborhoodsForCities = async () => {
      if (!isEditing || editCities.length === 0) {
        return;
      }
      
      try {
        // Fetch neighborhoods for each selected city
        const neighborhoodPromises = editCities.map(cityId => 
          api.get(`/neighborhoods?city=${cityId}`)
        );
        const responses = await Promise.all(neighborhoodPromises);
        
        // Combine all neighborhoods from selected cities
        const allNeighborhoods: string[] = [];
        
        responses.forEach((res) => {
          const cityNeighborhoods = res.data || [];
          cityNeighborhoods.forEach((n: string) => {
            if (!allNeighborhoods.includes(n)) {
              allNeighborhoods.push(n);
            }
          });
        });
        
        setAvailableNeighborhoods(allNeighborhoods);
        
        // Clear selected neighborhoods that are no longer available
        setEditNeighborhoods(prev => 
          prev.filter(n => allNeighborhoods.includes(n))
        );
      } catch (error) {
        console.error('Error fetching neighborhoods:', error);
      }
    };
    
    fetchNeighborhoodsForCities();
  }, [editCities, isEditing]);
  
  // PIX Modal states
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [isCheckingPixPayment, setIsCheckingPixPayment] = useState(false);

  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [photoIndexToDelete, setPhotoIndexToDelete] = useState<number | null>(null);

  // Image Viewer Modal state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const MAX_SERVICE_PHOTOS = 6;

  // Initialize form with provider data - this ONLY runs when starting to edit
  const initializeFormFromProvider = useCallback(() => {
    if (provider) {
      console.log('Initializing form from provider:', provider.name);
      setEditName(provider.name || '');
      setEditPhone(formatPhoneDisplay(provider.phone || ''));
      setEditCategories(provider.categories || []);
      setEditCities(provider.cities || ['tres_lagoas']);
      // Support both old (string) and new (array) format
      const neighborhoodData = provider.neighborhood || provider.neighborhoods;
      if (Array.isArray(neighborhoodData)) {
        setEditNeighborhoods(neighborhoodData);
      } else if (neighborhoodData) {
        setEditNeighborhoods([neighborhoodData]);
      } else {
        setEditNeighborhoods([]);
      }
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

  const toggleNeighborhood = (neighborhood: string) => {
    setEditNeighborhoods(prev => {
      return prev.includes(neighborhood) 
        ? prev.filter(n => n !== neighborhood)
        : [...prev, neighborhood];
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
      const [catRes, citiesRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/cities'),
        api.get('/subscriptions/status'),
      ]);
      setCategories(catRes.data);
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

  // Register push notifications
  useEffect(() => {
    const registerForPushNotifications = async () => {
      try {
        if (Platform.OS === 'web') return;
        
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }
        
        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '333b989a-14ab-48fc-9378-62f4c9ea5145'
        });
        const pushToken = tokenData.data;
        console.log('Push token:', pushToken);
        
        // Register token with backend
        if (pushToken) {
          await api.post('/providers/register-push-token', { push_token: pushToken });
          console.log('Push token registered');
        }
      } catch (error) {
        console.log('Error registering push notifications:', error);
      }
    };
    
    if (provider) {
      registerForPushNotifications();
    }
  }, [provider]);

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

    // Calculate how many more photos can be added
    const remainingSlots = MAX_SERVICE_PHOTOS - servicePhotos.length;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsUploadingPhoto(true);
      
      const newPhotos: string[] = [];
      for (const asset of result.assets) {
        if (asset.base64) {
          newPhotos.push(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
      
      if (newPhotos.length > 0) {
        const updatedPhotos = [...servicePhotos, ...newPhotos];
        setServicePhotos(updatedPhotos);
        await saveServicePhotos(updatedPhotos);
      }
      
      setIsUploadingPhoto(false);
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
        neighborhoods: editNeighborhoods,
      });
      
      const response = await api.put(`/providers/${provider.provider_id}`, {
        name: editName.trim(),
        phone: editPhone.replace(/\D/g, ''),
        categories: editCategories,
        cities: editCities,
        neighborhoods: editNeighborhoods,
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

  const handlePayWithPix = async () => {
    setShowPaymentModal(false);
    setIsActivating(true);
    
    try {
      // Create Mercado Pago Checkout Pro preference
      const response = await api.post('/mercadopago/create-pix');
      const { checkout_url, preference_id } = response.data;
      
      if (checkout_url) {
        // Open Mercado Pago Checkout in browser (supports PIX, Card, etc.)
        await WebBrowser.openBrowserAsync(checkout_url);
        
        // After returning from browser, check if payment was completed
        console.log('Returned from Mercado Pago, checking payment status...');
        
        // Wait a moment for payment to process
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to manually verify and activate the payment
        let attempts = 0;
        const maxAttempts = 10;
        const delayMs = 3000;
        
        const checkAndActivate = async (): Promise<boolean> => {
          try {
            console.log(`Checking MP payment status, attempt ${attempts + 1}/${maxAttempts}`);
            
            // Try to activate from the preference
            const activateResponse = await api.post('/mercadopago/check-and-activate', {
              preference_id: preference_id
            });
            
            if (activateResponse.data.activated) {
              return true;
            }
            return false;
          } catch (error: any) {
            console.log('Error checking payment:', error.message);
            return false;
          }
        };
        
        let activated = await checkAndActivate();
        
        while (!activated && attempts < maxAttempts) {
          attempts++;
          console.log(`Retrying in ${delayMs/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          activated = await checkAndActivate();
        }
        
        if (activated) {
          Alert.alert('Sucesso!', 'Pagamento confirmado! Sua assinatura foi ativada.');
        }
        
        await fetchData();
      } else {
        Alert.alert('Erro', 'Não foi possível gerar o link de pagamento');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      const message = error.response?.data?.detail || 'Erro ao gerar pagamento. Tente novamente.';
      Alert.alert('Erro', message);
    } finally {
      setIsActivating(false);
    }
  };

  const checkPixPaymentStatus = async (paymentId: string) => {
    setIsCheckingPixPayment(true);
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes (60 * 5 seconds)
    const delayMs = 5000;
    
    const checkPayment = async (): Promise<boolean> => {
      try {
        const response = await api.get(`/mercadopago/payment-status/${paymentId}`);
        console.log('PIX payment status:', response.data);
        
        if (response.data.approved) {
          // Payment approved! Activate subscription
          try {
            await api.post('/mercadopago/activate-from-payment', { payment_id: paymentId });
            return true;
          } catch (activateError) {
            console.error('Error activating from PIX:', activateError);
            return false;
          }
        }
        return false;
      } catch (error) {
        console.log('Error checking PIX status:', error);
        return false;
      }
    };
    
    while (attempts < maxAttempts) {
      const approved = await checkPayment();
      
      if (approved) {
        setIsCheckingPixPayment(false);
        setShowPixModal(false);
        Alert.alert('Sucesso!', 'Pagamento PIX confirmado! Sua assinatura foi ativada.');
        await fetchData();
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Check if modal was closed
      if (!showPixModal) {
        setIsCheckingPixPayment(false);
        return;
      }
    }
    
    setIsCheckingPixPayment(false);
  };

  const copyPixCode = async () => {
    if (pixQrCode) {
      try {
        // Use Clipboard API
        if (Platform.OS === 'web') {
          await navigator.clipboard.writeText(pixQrCode);
        } else {
          const Clipboard = require('expo-clipboard');
          await Clipboard.setStringAsync(pixQrCode);
        }
        Alert.alert('Copiado!', 'Código PIX copiado para a área de transferência');
      } catch (error) {
        console.error('Error copying:', error);
      }
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

        {/* Premium Badge */}
        {provider.is_premium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumIcon}>👑</Text>
            <View style={styles.premiumTextContainer}>
              <Text style={styles.premiumTitle}>Você é Premium!</Text>
              <Text style={styles.premiumSubtitle}>Sua assinatura é vitalícia. Você não precisa renovar!</Text>
            </View>
          </View>
        )}

        {/* Status do Perfil */}
        {provider.blocked ? (
          <View style={[styles.subscriptionCard, { borderColor: '#EF444440' }]}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionStatus}>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.subscriptionStatusText, { color: '#EF4444' }]}>Conta Bloqueada</Text>
              </View>
              <View style={[styles.freeBadge, { backgroundColor: '#EF444420' }]}>
                <Text style={[styles.freeBadgeText, { color: '#EF4444' }]}>Bloqueado</Text>
              </View>
            </View>
            <Text style={[styles.freeInfoText, { color: '#9CA3AF' }]}>
              Sua conta foi bloqueada por má conduta dentro do App. Entre em contato com o suporte para mais informações.
            </Text>
            <TouchableOpacity 
              style={styles.blockedContactBtn}
              onPress={() => {
                const subject = encodeURIComponent('Perfil Bloqueado - Solicitação de Revisão');
                const body = encodeURIComponent(
                  `Olá,\n\nMeu perfil de prestador no AchaServiço foi bloqueado e gostaria de solicitar uma revisão.\n\nNome: ${provider.name}\nE-mail: ${user?.email || ''}\n\nAguardo retorno.\n\nAtenciosamente,\n${provider.name}`
                );
                Linking.openURL(`mailto:contato.achaservico@gmail.com?subject=${subject}&body=${body}`);
              }}
            >
              <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
              <Text style={styles.blockedContactText}>Entrar em Contato com Suporte</Text>
            </TouchableOpacity>
          </View>
        ) : !provider.is_premium && (
          <View style={[styles.subscriptionCard, styles.subscriptionActive]}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionStatus}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.subscriptionStatusText}>Perfil Ativo</Text>
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Gratuito</Text>
              </View>
            </View>
            <Text style={styles.freeInfoText}>
              Seu perfil está visível para todos os clientes!
            </Text>
          </View>
        )}

        {/* Visibilidade Toggle (only if not blocked) */}
        {!provider.blocked && (
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityHeader}>
              <View style={styles.availabilityInfo}>
                <Ionicons 
                  name={provider.is_active ? "eye" : "eye-off"} 
                  size={24} 
                  color={provider.is_active ? "#22C55E" : "#EF4444"} 
                />
                <View style={styles.availabilityTextContainer}>
                  <Text style={styles.availabilityTitle}>
                    {provider.is_active ? "Visível na Plataforma" : "Invisível na Plataforma"}
                  </Text>
                  <Text style={styles.availabilitySubtitle}>
                    {provider.is_active 
                      ? "Clientes podem encontrar seu perfil" 
                      : "Seu perfil não aparece nas buscas"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.availabilityToggle,
                  provider.is_active && styles.availabilityToggleActive
                ]}
                onPress={async () => {
                  try {
                    const response = await api.post(`/providers/${provider.provider_id}/toggle-availability`);
                    const newStatus = response.data?.is_active ?? !provider.is_active;
                    setProvider({...provider, is_active: newStatus});
                    Alert.alert(
                      'Sucesso!', 
                      newStatus 
                        ? 'Seu perfil agora está visível para os clientes!' 
                        : 'Seu perfil está oculto. Clientes não vão encontrá-lo nas buscas.'
                    );
                  } catch (error: any) {
                    const detail = error?.response?.data?.detail;
                    if (detail) {
                      Alert.alert('Erro', detail);
                    } else {
                      const newStatus = !provider.is_active;
                      setProvider({...provider, is_active: newStatus});
                      Alert.alert(
                        'Sucesso!', 
                        newStatus 
                          ? 'Seu perfil agora está visível para os clientes!' 
                          : 'Seu perfil está oculto. Clientes não vão encontrá-lo nas buscas.'
                      );
                    }
                  }
                }}
              >
                <View style={[
                  styles.toggleCircle,
                  provider.is_active && styles.toggleCircleActive
                ]} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles" size={24} color="#10B981" />
            <Text style={styles.statValue}>{provider.total_reviews}</Text>
            <Text style={styles.statLabel}>Avaliações</Text>
          </View>
          {provider.is_verified && (
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.statValue}>Sim</Text>
              <Text style={styles.statLabel}>Verificado</Text>
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações do Perfil</Text>
          
          {/* Profile Image - Click to change, long press to view full */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={pickImage}
            onLongPress={() => {
              if (editProfileImage || provider.profile_image) {
                setSelectedImage(editProfileImage || provider.profile_image || null);
                setShowImageViewer(true);
              }
            }}
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
          <Text style={styles.photoHint}>Toque para alterar • Segure para ver em tela cheia</Text>

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
                  style={styles.modernSelectButton}
                  onPress={() => setShowCategoryPicker(true)}
                >
                  <Ionicons name="list" size={18} color="#10B981" />
                  <Text style={styles.modernSelectButtonText}>
                    {editCategories.length === 0 
                      ? 'Selecionar categorias' 
                      : `${editCategories.length} categoria(s)`}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#10B981" />
                </TouchableOpacity>
                
                {/* Selected categories badges */}
                {editCategories.length > 0 && (
                  <View style={styles.selectedBadgesContainer}>
                    {editCategories.map((catId) => (
                      <TouchableOpacity
                        key={catId}
                        style={styles.modernBadge}
                        onPress={() => toggleCategory(catId)}
                      >
                        <Text style={styles.modernBadgeText}>{getCategoryName(catId)}</Text>
                        <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
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
                  style={styles.modernSelectButton}
                  onPress={() => setShowCityPicker(true)}
                >
                  <Ionicons name="business" size={18} color="#10B981" />
                  <Text style={styles.modernSelectButtonText}>
                    {getSelectedCitiesText()}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#10B981" />
                </TouchableOpacity>
                
                {/* Selected cities badges */}
                {editCities.length > 0 && (
                  <View style={styles.selectedBadgesContainer}>
                    {editCities.map((cityId) => (
                      <TouchableOpacity
                        key={cityId}
                        style={styles.modernBadge}
                        onPress={() => toggleCity(cityId)}
                      >
                        <Text style={styles.modernBadgeText}>{getCityName(cityId)}</Text>
                        <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
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
            <Text style={styles.fieldLabel}>Bairros de Atuação</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.modernSelectButton, editCities.length === 0 && styles.modernSelectButtonDisabled]}
                  onPress={() => editCities.length > 0 && setShowNeighborhoodPicker(true)}
                  disabled={editCities.length === 0}
                >
                  <Ionicons name="location" size={18} color={editCities.length > 0 ? "#10B981" : "#6B7280"} />
                  <Text style={[styles.modernSelectButtonText, editCities.length === 0 && styles.modernSelectButtonTextDisabled]}>
                    {editCities.length === 0 
                      ? 'Selecione uma cidade primeiro' 
                      : editNeighborhoods.length === 0 
                        ? 'Selecionar bairros' 
                        : `${editNeighborhoods.length} bairro(s)`}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={editCities.length > 0 ? "#10B981" : "#6B7280"} />
                </TouchableOpacity>
                
                {/* Selected neighborhoods badges */}
                {editNeighborhoods.length > 0 && (
                  <View style={styles.selectedBadgesContainer}>
                    {editNeighborhoods.map((neighborhood) => (
                      <TouchableOpacity
                        key={neighborhood}
                        style={styles.modernBadge}
                        onPress={() => toggleNeighborhood(neighborhood)}
                      >
                        <Text style={styles.modernBadgeText}>{neighborhood}</Text>
                        <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.categoriesDisplay}>
                {provider.neighborhoods && provider.neighborhoods.length > 0 ? (
                  provider.neighborhoods.map((neighborhood) => (
                    <View key={neighborhood} style={styles.categoryTagDisplay}>
                      <Text style={styles.categoryTagText}>{neighborhood}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.fieldValue}>Nenhum bairro definido</Text>
                )}
              </View>
            )}
          </View>

          {/* Bottom Sheet Modal for Categories */}
          <Modal
            visible={showCategoryPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <TouchableOpacity
              style={styles.bottomSheetOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={styles.bottomSheetContainer}>
                <View style={styles.bottomSheetHandle} />
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>📋 Selecione as Categorias</Text>
                  <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.bottomSheetOption, editCategories.includes(cat.id) && styles.bottomSheetOptionActive]}
                      onPress={() => toggleCategory(cat.id)}
                    >
                      <Ionicons 
                        name={editCategories.includes(cat.id) ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={editCategories.includes(cat.id) ? '#10B981' : '#9CA3AF'} 
                      />
                      <Text style={[styles.bottomSheetOptionText, editCategories.includes(cat.id) && styles.bottomSheetOptionTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.bottomSheetConfirmButton}
                  onPress={() => setShowCategoryPicker(false)}
                >
                  <Text style={styles.bottomSheetConfirmText}>Confirmar ({editCategories.length} selecionada(s))</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Bottom Sheet Modal for Cities */}
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
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>🏙️ Selecione as Cidades</Text>
                  <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                  {cities.map((city) => (
                    <TouchableOpacity
                      key={city.id}
                      style={[styles.bottomSheetOption, editCities.includes(city.id) && styles.bottomSheetOptionActive]}
                      onPress={() => toggleCity(city.id)}
                    >
                      <Ionicons 
                        name={editCities.includes(city.id) ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={editCities.includes(city.id) ? '#10B981' : '#9CA3AF'} 
                      />
                      <Text style={[styles.bottomSheetOptionText, editCities.includes(city.id) && styles.bottomSheetOptionTextActive]}>
                        {city.name} - {city.state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.bottomSheetConfirmButton}
                  onPress={() => setShowCityPicker(false)}
                >
                  <Text style={styles.bottomSheetConfirmText}>Confirmar ({editCities.length} selecionada(s))</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Bottom Sheet Modal for Neighborhoods */}
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
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>📍 Selecione os Bairros</Text>
                  <TouchableOpacity onPress={() => setShowNeighborhoodPicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.bottomSheetScroll} showsVerticalScrollIndicator={false}>
                  {availableNeighborhoods.length > 0 ? (
                    availableNeighborhoods.map((neighborhood) => (
                      <TouchableOpacity
                        key={neighborhood}
                        style={[styles.bottomSheetOption, editNeighborhoods.includes(neighborhood) && styles.bottomSheetOptionActive]}
                        onPress={() => toggleNeighborhood(neighborhood)}
                      >
                        <Ionicons 
                          name={editNeighborhoods.includes(neighborhood) ? "checkbox" : "square-outline"} 
                          size={22} 
                          color={editNeighborhoods.includes(neighborhood) ? '#10B981' : '#9CA3AF'} 
                        />
                        <Text style={[styles.bottomSheetOptionText, editNeighborhoods.includes(neighborhood) && styles.bottomSheetOptionTextActive]}>
                          {neighborhood}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyNeighborhoodsText}>Nenhum bairro disponível para as cidades selecionadas</Text>
                  )}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.bottomSheetConfirmButton}
                  onPress={() => setShowNeighborhoodPicker(false)}
                >
                  <Text style={styles.bottomSheetConfirmText}>Confirmar ({editNeighborhoods.length} selecionado(s))</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

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
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(photo);
                    setShowImageViewer(true);
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: photo }} style={styles.servicePhoto} />
                </TouchableOpacity>
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
                    <Ionicons name="images" size={32} color="#10B981" />
                    <Text style={styles.addPhotoText}>Selecionar Fotos</Text>
                    <Text style={styles.addPhotoSubtext}>Até {MAX_SERVICE_PHOTOS - servicePhotos.length} fotos</Text>
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
            
            <Text style={styles.modalSubtitle}>Assinatura Mensal - R$ 9,99</Text>
            
            <TouchableOpacity
              style={styles.paymentOption}
              onPress={handlePayWithPix}
            >
              <View style={styles.paymentOptionIcon}>
                <Ionicons name="wallet" size={28} color="#10B981" />
              </View>
              <View style={styles.paymentOptionInfo}>
                <Text style={styles.paymentOptionTitle}>Pagar Agora</Text>
                <Text style={styles.paymentOptionDescription}>PIX, Cartão ou Boleto - ativação automática</Text>
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

      {/* PIX QR Code Modal */}
      <Modal
        visible={showPixModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPixModal(false);
          setIsCheckingPixPayment(false);
        }}
      >
        <View style={styles.pixModalOverlay}>
          <View style={styles.pixModalContent}>
            <TouchableOpacity
              style={styles.pixModalCloseButton}
              onPress={() => {
                setShowPixModal(false);
                setIsCheckingPixPayment(false);
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.pixModalHeader}>
              <Ionicons name="qr-code" size={40} color="#10B981" />
              <Text style={styles.pixModalTitle}>Pague com PIX</Text>
              <Text style={styles.pixModalSubtitle}>Escaneie o QR Code ou copie o código</Text>
            </View>

            {pixQrCodeBase64 && (
              <View style={styles.pixQrCodeContainer}>
                <Image
                  source={{ uri: `data:image/png;base64,${pixQrCodeBase64}` }}
                  style={styles.pixQrCodeImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.pixAmountContainer}>
              <Text style={styles.pixAmountLabel}>Valor:</Text>
              <Text style={styles.pixAmountValue}>R$ 9,99</Text>
            </View>

            <TouchableOpacity
              style={styles.pixCopyButton}
              onPress={copyPixCode}
            >
              <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
              <Text style={styles.pixCopyButtonText}>Copiar Código PIX</Text>
            </TouchableOpacity>

            {isCheckingPixPayment && (
              <View style={styles.pixCheckingContainer}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.pixCheckingText}>Aguardando pagamento...</Text>
              </View>
            )}

            <Text style={styles.pixInstructions}>
              Após o pagamento, a assinatura será ativada automaticamente.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal - Full Screen */}
      <Modal
        visible={showImageViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageViewer(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerCloseButton}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
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
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  premiumIcon: {
    fontSize: 40,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  premiumSubtitle: {
    color: '#B8860B',
    fontSize: 14,
    marginTop: 4,
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
  freeBadge: {
    backgroundColor: '#10B98130',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  freeInfoText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  // Availability Card Styles
  availabilityCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  blockedCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  blockedIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  blockedTitle: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '700',
  },
  blockedText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  blockedContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
  },
  blockedContactText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  availabilityTextContainer: {
    flex: 1,
  },
  availabilityTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilitySubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  availabilityToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3A3A3A',
    padding: 2,
    justifyContent: 'center',
  },
  availabilityToggleActive: {
    backgroundColor: '#22C55E',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
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
  emptyNeighborhoods: {
    padding: 20,
    alignItems: 'center',
  },
  emptyNeighborhoodsText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
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
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  addPhotoSubtext: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
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
  pickerDoneButton: {
    backgroundColor: '#10B981',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
  // PIX Modal Styles
  pixModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pixModalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  pixModalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pixModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  pixModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  pixModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  pixQrCodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  pixQrCodeImage: {
    width: 200,
    height: 200,
  },
  pixAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  pixAmountLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  pixAmountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  pixCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  pixCopyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pixCheckingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#10B98120',
    borderRadius: 8,
  },
  pixCheckingText: {
    color: '#10B981',
    fontSize: 14,
  },
  pixInstructions: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  // Modern select button styles
  modernSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 10,
  },
  modernSelectButtonDisabled: {
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  modernSelectButtonText: {
    flex: 1,
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  modernSelectButtonTextDisabled: {
    color: '#6B7280',
  },
  selectedBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  modernBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  modernBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  // Bottom Sheet styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
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
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSheetScroll: {
    paddingHorizontal: 16,
    maxHeight: SCREEN_HEIGHT * 0.45,
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
  bottomSheetConfirmButton: {
    backgroundColor: '#10B981',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  bottomSheetConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyNeighborhoodsText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
