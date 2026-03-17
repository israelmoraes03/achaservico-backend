import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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

export default function ProviderRegisterScreen() {
  const router = useRouter();
  const { user, isAuthenticated, login, refreshUser } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>(['tres_lagoas']);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(c => c !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const toggleNeighborhood = (neighborhoodName: string) => {
    setSelectedNeighborhoods(prev => {
      if (prev.includes(neighborhoodName)) {
        return prev.filter(n => n !== neighborhoodName);
      } else {
        return [...prev, neighborhoodName];
      }
    });
  };

  const getSelectedNeighborhoodsText = () => {
    if (selectedNeighborhoods.length === 0) return 'Selecionar áreas de atuação';
    if (selectedNeighborhoods.length === 1) return selectedNeighborhoods[0];
    return `${selectedNeighborhoods.length} área(s) selecionada(s)`;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para se cadastrar como prestador.',
        [
          { text: 'Cancelar', onPress: () => router.back() },
          { text: 'Fazer Login', onPress: login },
        ]
      );
    }
  }, [isAuthenticated]);

  // Check if user is already a provider
  useEffect(() => {
    if (user?.is_provider) {
      Alert.alert(
        'Perfil Existente',
        'Você já possui um perfil de prestador.',
        [{ text: 'Ver Meu Painel', onPress: () => router.replace('/provider/dashboard') }]
      );
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, neighRes, citiesRes] = await Promise.all([
          api.get('/categories'),
          api.get('/neighborhoods'),
          api.get('/cities'),
        ]);
        setCategories(catRes.data);
        setNeighborhoods(neighRes.data);
        setCities(citiesRes.data);
        
        // Pre-fill name from user
        if (user?.name) {
          setName(user.name);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

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
      setProfileImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
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
    
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu nome.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Erro', 'Por favor, informe um telefone válido.');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Erro', 'Por favor, selecione pelo menos uma categoria.');
      return;
    }
    if (selectedNeighborhoods.length === 0) {
      Alert.alert('Erro', 'Por favor, selecione pelo menos uma área de atuação.');
      return;
    }
    if (!description.trim() || description.length < 20) {
      Alert.alert('Erro', 'Por favor, escreva uma descrição com pelo menos 20 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await api.post('/providers', {
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        categories: selectedCategories,
        cities: selectedCities,
        neighborhoods: selectedNeighborhoods,
        description: description.trim(),
        profile_image: profileImage,
      });

      await refreshUser();
      
      // Go to dashboard where user can choose payment method (PIX or Card)
      router.replace('/provider/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao criar perfil. Tente novamente.';
      
      // Handle specific error cases
      if (message.includes('já possui')) {
        // Go to dashboard if already has profile
        router.replace('/provider/dashboard');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [errorMessage, setErrorMessage] = React.useState('');

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : categoryId;
  };

  const getCityName = (cityId: string) => {
    const city = cities.find(c => c.id === cityId);
    return city ? `${city.name} - ${city.state}` : cityId;
  };

  const toggleCity = (cityId: string) => {
    setSelectedCities(prev => {
      if (prev.includes(cityId)) {
        return prev.filter(c => c !== cityId);
      } else {
        return [...prev, cityId];
      }
    });
  };

  const getSelectedCitiesText = () => {
    if (selectedCities.length === 0) return 'Selecione as cidades de atuação';
    if (selectedCities.length === cities.length) return 'Todas as cidades';
    return `${selectedCities.length} cidade(s) selecionada(s)`;
  };

  const getSelectedCategoriesText = () => {
    if (selectedCategories.length === 0) return 'Selecionar categorias';
    if (selectedCategories.length === 1) return getCategoryName(selectedCategories[0]);
    return `${selectedCategories.length} categorias selecionadas`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cadastro de Prestador</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Image */}
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={32} color="#6B7280" />
                <Text style={styles.imagePlaceholderText}>Adicionar Foto</Text>
              </View>
            )}
            <View style={styles.imageEditBadge}>
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor="#6B7280"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone (WhatsApp) *</Text>
              <TextInput
                style={styles.input}
                placeholder="(67) 99999-9999"
                placeholderTextColor="#6B7280"
                value={phone}
                onChangeText={formatPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categorias de Serviço * (selecione uma ou mais)</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={[styles.selectButtonText, selectedCategories.length > 0 && styles.selectButtonTextActive]}>
                  {getSelectedCategoriesText()}
                </Text>
                <Ionicons name={showCategoryPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {/* Selected categories badges */}
              {selectedCategories.length > 0 && (
                <View style={styles.selectedCategoriesContainer}>
                  {selectedCategories.map((catId) => (
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
                        style={[
                          styles.pickerItem,
                          selectedCategories.includes(cat.id) && styles.pickerItemActive
                        ]}
                        onPress={() => toggleCategory(cat.id)}
                      >
                        <Ionicons 
                          name={selectedCategories.includes(cat.id) ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={selectedCategories.includes(cat.id) ? '#10B981' : '#9CA3AF'} 
                        />
                        <Ionicons name={cat.icon as any} size={20} color={selectedCategories.includes(cat.id) ? '#10B981' : '#9CA3AF'} />
                        <Text style={[
                          styles.pickerItemText,
                          selectedCategories.includes(cat.id) && styles.pickerItemTextActive
                        ]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cidades de Atuação * (selecione uma ou mais)</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowCityPicker(!showCityPicker)}
              >
                <Text style={[styles.selectButtonText, selectedCities.length > 0 && styles.selectButtonTextActive]}>
                  {getSelectedCitiesText()}
                </Text>
                <Ionicons name={showCityPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {/* Selected cities badges */}
              {selectedCities.length > 0 && (
                <View style={styles.selectedCategoriesContainer}>
                  {selectedCities.map((cityId) => (
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
                        style={[
                          styles.pickerItem,
                          selectedCities.includes(city.id) && styles.pickerItemActive
                        ]}
                        onPress={() => toggleCity(city.id)}
                      >
                        <Ionicons 
                          name={selectedCities.includes(city.id) ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={selectedCities.includes(city.id) ? '#10B981' : '#9CA3AF'} 
                        />
                        <Ionicons name="location" size={20} color={selectedCities.includes(city.id) ? '#10B981' : '#9CA3AF'} />
                        <Text style={[
                          styles.pickerItemText,
                          selectedCities.includes(city.id) && styles.pickerItemTextActive
                        ]}>
                          {city.name} - {city.state}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Neighborhood */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Áreas de Atuação * (selecione uma ou mais)</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowNeighborhoodPicker(!showNeighborhoodPicker)}
              >
                <Text style={[styles.selectButtonText, selectedNeighborhoods.length > 0 && styles.selectButtonTextActive]}>
                  {getSelectedNeighborhoodsText()}
                </Text>
                <Ionicons name={showNeighborhoodPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {/* Selected neighborhoods badges */}
              {selectedNeighborhoods.length > 0 && (
                <View style={styles.selectedCategoriesContainer}>
                  {selectedNeighborhoods.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={styles.categoryBadge}
                      onPress={() => toggleNeighborhood(n)}
                    >
                      <Text style={styles.categoryBadgeText}>{n}</Text>
                      <Ionicons name="close-circle" size={16} color="#10B981" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {showNeighborhoodPicker && (
                <View style={styles.pickerContainer}>
                  <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                    {neighborhoods.map((n, index) => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.pickerItem,
                          selectedNeighborhoods.includes(n) && styles.pickerItemActive,
                          index === 0 && styles.allNeighborhoodsItem
                        ]}
                        onPress={() => toggleNeighborhood(n)}
                      >
                        <Ionicons 
                          name={selectedNeighborhoods.includes(n) ? "checkbox" : "square-outline"} 
                          size={20} 
                          color={selectedNeighborhoods.includes(n) ? '#10B981' : (index === 0 ? '#F59E0B' : '#9CA3AF')} 
                        />
                        <Ionicons 
                          name={index === 0 ? "globe" : "location"} 
                          size={20} 
                          color={selectedNeighborhoods.includes(n) ? '#10B981' : (index === 0 ? '#F59E0B' : '#9CA3AF')} 
                        />
                        <Text style={[
                          styles.pickerItemText,
                          selectedNeighborhoods.includes(n) && styles.pickerItemTextActive,
                          index === 0 && styles.allNeighborhoodsText
                        ]}>
                          {n}
                        </Text>
                        {index === 0 && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>Recomendado</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição do Serviço *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descreva seus serviços, experiência e diferenciais..."
                placeholderTextColor="#6B7280"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>
          </View>

          {/* Info - Perfil gratuito */}
          <View style={styles.priceInfo}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.priceInfoText}>
              Seu perfil será ativado automaticamente e ficará visível para todos os clientes!
            </Text>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#0A0A0A" />
                <Text style={styles.submitButtonText}>Criar Perfil</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
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
  keyboardView: {
    flex: 1,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  imageContainer: {
    alignSelf: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2D2D2D',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'right',
  },
  selectButton: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
  pickerContainer: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerScroll: {
    padding: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: '#10B98120',
  },
  pickerItemText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
  pickerItemTextActive: {
    color: '#10B981',
    fontWeight: '500',
  },
  allNeighborhoodsItem: {
    backgroundColor: '#F59E0B15',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
    marginBottom: 8,
  },
  allNeighborhoodsText: {
    color: '#F59E0B',
    fontWeight: '500',
  },
  recommendedBadge: {
    backgroundColor: '#F59E0B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  recommendedBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 6,
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#10B98110',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  priceInfoText: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
  },
  bottomSpacer: {
    height: 32,
  },
});
