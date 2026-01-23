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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Provider {
  provider_id: string;
  name: string;
  phone: string;
  category: string;
  neighborhood: string;
  description: string;
  profile_image?: string;
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

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { user, provider, isAuthenticated, refreshUser } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProfileImage, setEditProfileImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);

  const MAX_SERVICE_PHOTOS = 6;

  const fetchData = useCallback(async () => {
    try {
      const [catRes, neighRes, subRes] = await Promise.all([
        api.get('/categories'),
        api.get('/neighborhoods'),
        api.get('/subscriptions/status'),
      ]);
      setCategories(catRes.data);
      setNeighborhoods(neighRes.data);
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

  useEffect(() => {
    if (provider) {
      setEditName(provider.name);
      setEditPhone(formatPhoneDisplay(provider.phone));
      setEditCategory(provider.category);
      setEditNeighborhood(provider.neighborhood);
      setEditDescription(provider.description);
      setEditProfileImage(provider.profile_image || null);
      setServicePhotos(provider.service_photos || []);
    }
  }, [provider]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    return phone;
  };

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

  const removeServicePhoto = async (index: number) => {
    Alert.alert(
      'Remover Foto',
      'Deseja remover esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const updatedPhotos = servicePhotos.filter((_, i) => i !== index);
            setServicePhotos(updatedPhotos);
            await saveServicePhotos(updatedPhotos);
          }
        }
      ]
    );
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
      
      await api.put(`/providers/${provider.provider_id}`, {
        name: editName.trim(),
        phone: editPhone.replace(/\D/g, ''),
        category: editCategory,
        neighborhood: editNeighborhood,
        description: editDescription.trim(),
        profile_image: editProfileImage,
      });

      await refreshUser();
      setIsEditing(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao atualizar perfil.';
      Alert.alert('Erro', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivateSubscription = async () => {
    Alert.alert(
      'Ativar Assinatura',
      'Valor: R$ 15,00/mês\n\nVocê será direcionado para a tela de pagamento PIX.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => {
            router.push('/payment/pix');
          }
        },
      ]
    );
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
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
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
        {/* Subscription Status */}
        <View style={[
          styles.subscriptionCard,
          provider.subscription_status === 'active' ? styles.subscriptionActive : styles.subscriptionInactive
        ]}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionStatus}>
              <View style={[
                styles.statusDot,
                { backgroundColor: provider.subscription_status === 'active' ? '#10B981' : '#EF4444' }
              ]} />
              <Text style={styles.subscriptionStatusText}>
                {provider.subscription_status === 'active' ? 'Assinatura Ativa' : 'Assinatura Inativa'}
              </Text>
            </View>
            <Text style={styles.subscriptionPrice}>R$ 15,00/mês</Text>
          </View>
          
          {provider.subscription_status === 'active' && subscription ? (
            <Text style={styles.subscriptionExpiry}>
              Válida até {formatDate(subscription.expires_at)}
            </Text>
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
          
          {/* Profile Image */}
          <TouchableOpacity
            style={styles.imageContainer}
            onPress={isEditing ? pickImage : undefined}
            disabled={!isEditing}
          >
            {(isEditing ? editProfileImage : provider.profile_image) ? (
              <Image
                source={{ uri: isEditing ? editProfileImage! : provider.profile_image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#6B7280" />
              </View>
            )}
            {isEditing && (
              <View style={styles.imageEditBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

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
            <Text style={styles.fieldLabel}>Categoria</Text>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                >
                  <Text style={styles.selectButtonText}>{getCategoryName(editCategory)}</Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                {showCategoryPicker && (
                  <View style={styles.pickerContainer}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.pickerItem, editCategory === cat.id && styles.pickerItemActive]}
                          onPress={() => { setEditCategory(cat.id); setShowCategoryPicker(false); }}
                        >
                          <Text style={[styles.pickerItemText, editCategory === cat.id && styles.pickerItemTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.fieldValue}>{getCategoryName(provider.category)}</Text>
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
  subscriptionInactive: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444440',
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
});
