import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

interface Provider {
  provider_id: string;
  name: string;
  phone: string;
  category: string;
  neighborhood: string;
  description: string;
  profile_image?: string;
  service_photos?: string[];
  average_rating: number;
  total_reviews: number;
}

interface Review {
  review_id: string;
  rating: number;
  comment?: string;
  is_verified?: boolean;
  created_at: string;
  // user_name removed - anonymous reviews
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuth();
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [providerRes, reviewsRes, categoriesRes] = await Promise.all([
        api.get(`/providers/${id}`),
        api.get(`/providers/${id}/reviews`),
        api.get('/categories'),
      ]);
      setProvider(providerRes.data);
      setReviews(reviewsRes.data);
      setCategories(categoriesRes.data);
      
      // Check if user can review
      try {
        const canReviewRes = await api.get(`/providers/${id}/can-review`);
        setCanReview(canReviewRes.data.can_review);
        setReviewStatus(canReviewRes.data.reason || '');
      } catch {
        setCanReview(false);
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do prestador');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const openWhatsApp = async () => {
    if (!provider) return;
    
    // Register contact before opening WhatsApp
    try {
      await api.post(`/providers/${provider.provider_id}/contact`);
      // Update can review status after registering contact
      setCanReview(true);
      setReviewStatus('eligible');
    } catch (error) {
      // Silently fail - user can still contact
      console.log('Could not register contact:', error);
    }
    
    const cleanPhone = provider.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${provider.name}! Encontrei seu perfil no AchaServiço e gostaria de solicitar um orçamento.`);
    const url = `https://wa.me/55${cleanPhone}?text=${message}`;
    Linking.openURL(url);
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Login Necessário',
        'Você precisa estar logado para avaliar um prestador.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fazer Login', onPress: login },
        ]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/reviews', {
        provider_id: id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      
      Alert.alert('Sucesso', 'Avaliação enviada com sucesso!');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao enviar avaliação';
      Alert.alert('Erro', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: number = 18, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => interactive && setReviewRating(i)}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!provider) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Prestador não encontrado</Text>
          <TouchableOpacity style={styles.backToHomeButton} onPress={() => router.back()}>
            <Text style={styles.backToHomeText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          <Text style={styles.headerTitle}>Detalhes</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Provider Profile */}
          <View style={styles.profileSection}>
            {provider.profile_image ? (
              <Image source={{ uri: provider.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={48} color="#6B7280" />
              </View>
            )}
            
            <Text style={styles.providerName}>{provider.name}</Text>
            
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{getCategoryName(provider.category)}</Text>
            </View>
            
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.locationText}>{provider.neighborhood}</Text>
            </View>
            
            <View style={styles.ratingRow}>
              <View style={styles.starsRow}>{renderStars(provider.average_rating)}</View>
              <Text style={styles.ratingText}>
                {provider.average_rating.toFixed(1)} ({provider.total_reviews} avaliações)
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre</Text>
            <Text style={styles.descriptionText}>{provider.description}</Text>
          </View>

          {/* Service Photos Gallery */}
          {provider.service_photos && provider.service_photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fotos dos Serviços</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryContainer}
              >
                {provider.service_photos.map((photo, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.galleryImageWrapper}
                    onPress={() => {
                      // Could implement full-screen image viewer here
                    }}
                  >
                    <Image source={{ uri: photo }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* WhatsApp Button */}
          <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>Chamar no WhatsApp</Text>
          </TouchableOpacity>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => setShowReviewForm(!showReviewForm)}
              >
                <Ionicons name="add" size={20} color="#10B981" />
                <Text style={styles.addReviewText}>Avaliar</Text>
              </TouchableOpacity>
            </View>

            {/* Review Form */}
            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormLabel}>Sua avaliação</Text>
                <View style={styles.starsInput}>
                  {renderStars(reviewRating, 32, true)}
                </View>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Deixe um comentário (opcional)"
                  placeholderTextColor="#6B7280"
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={styles.submitReviewButton}
                  onPress={handleSubmitReview}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#0A0A0A" />
                  ) : (
                    <Text style={styles.submitReviewText}>Enviar Avaliação</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <View style={styles.noReviews}>
                <Ionicons name="chatbubble-outline" size={32} color="#374151" />
                <Text style={styles.noReviewsText}>Ainda não há avaliações</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={16} color="#6B7280" />
                      </View>
                      <Text style={styles.reviewUserName}>{review.user_name}</Text>
                    </View>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  <View style={styles.reviewStars}>{renderStars(review.rating, 14)}</View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))
            )}
          </View>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 24,
  },
  backToHomeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToHomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    color: '#6B7280',
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descriptionText: {
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 22,
  },
  galleryContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  galleryImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addReviewText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewForm: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewFormLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  starsInput: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  reviewInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitReviewButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitReviewText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  reviewCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewDate: {
    color: '#6B7280',
    fontSize: 12,
  },
  reviewStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewComment: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});
