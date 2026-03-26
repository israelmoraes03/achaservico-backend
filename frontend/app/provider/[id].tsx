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
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

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

    if (!canReview) {
      if (reviewStatus === 'no_contact') {
        Alert.alert(
          'Contato Necessário',
          'Você precisa entrar em contato com o prestador pelo WhatsApp antes de avaliar.',
          [{ text: 'OK' }]
        );
      } else if (reviewStatus === 'already_reviewed') {
        Alert.alert('Aviso', 'Você já avaliou este prestador.');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/reviews', {
        provider_id: id,
        rating: reviewRating,
        comment: reviewComment || null,
      });
      
      Alert.alert('Sucesso', 'Avaliação enviada com sucesso! Sua avaliação é anônima.');
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      setCanReview(false);
      setReviewStatus('already_reviewed');
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao enviar avaliação';
      Alert.alert('Erro', message);

  const handleReport = async () => {
    if (!reportReason) {
      Alert.alert('Erro', 'Selecione um motivo para a denúncia');
      return;
    }
    
    try {
      setIsReporting(true);
      await api.post('/reports', {
        provider_id: id,
        reason: reportReason,
        description: reportDescription || null,
      });
      
      Alert.alert('Denúncia Enviada', 'Obrigado por nos informar. Iremos analisar sua denúncia.');
      setShowReportModal(false);
      setReportReason('');
      setReportDescription('');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erro ao enviar denúncia';
      Alert.alert('Erro', message);
    } finally {
      setIsReporting(false);
    }
  };

  const REPORT_REASONS = [
    { id: 'inappropriate_content', label: 'Conteúdo inadequado' },
    { id: 'false_info', label: 'Informações falsas' },
    { id: 'bad_behavior', label: 'Comportamento impróprio' },
    { id: 'spam', label: 'Spam ou propaganda' },
    { id: 'other', label: 'Outro motivo' },
  ];

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
          <TouchableOpacity 
            onPress={() => setShowReportModal(true)} 
            style={styles.reportHeaderButton}
          >
            <Ionicons name="flag-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
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
            
            {/* Show all categories/services */}
            <View style={styles.categoriesContainer}>
              {provider.categories && provider.categories.length > 0 ? (
                provider.categories.map((cat, index) => (
                  <View key={index} style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{getCategoryName(cat)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{getCategoryName(provider.category)}</Text>
                </View>
              )}
            </View>
            
            {/* Cities served */}
            {provider.cities && provider.cities.length > 0 && (
              <View style={styles.citiesRow}>
                <Ionicons name="map" size={16} color="#10B981" />
                <Text style={styles.citiesText}>
                  {provider.cities.map(c => {
                    // Convert city id to readable name
                    return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  }).join(' • ')}
                </Text>
              </View>
            )}
            
            {/* Neighborhoods served */}
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.locationText}>
                {provider.neighborhoods && provider.neighborhoods.length > 0
                  ? provider.neighborhoods.join(', ')
                  : provider.neighborhood || 'Não informado'}
              </Text>
            </View>
            
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>
                {provider.total_reviews} avaliações
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
                    onPress={() => setSelectedImageIndex(index)}
                    data-testid={`service-photo-${index}`}
                  >
                    <Image source={{ uri: photo }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* WhatsApp Button - Smaller and more elegant */}
          <TouchableOpacity style={styles.whatsappButton} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>Chamar no WhatsApp</Text>
          </TouchableOpacity>

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              {canReview ? (
                <TouchableOpacity
                  style={styles.addReviewButton}
                  onPress={() => setShowReviewForm(!showReviewForm)}
                >
                  <Ionicons name="add" size={20} color="#10B981" />
                  <Text style={styles.addReviewText}>Avaliar</Text>
                </TouchableOpacity>
              ) : reviewStatus === 'already_reviewed' ? (
                <View style={styles.alreadyReviewedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.alreadyReviewedText}>Avaliado</Text>
                </View>
              ) : null}
            </View>

            {/* Info about reviews */}
            <View style={styles.reviewsInfo}>
              <Ionicons name="shield-checkmark" size={14} color="#6B7280" />
              <Text style={styles.reviewsInfoText}>
                Avaliações verificadas e anônimas
              </Text>
            </View>

            {/* Review Form */}
            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormLabel}>Sua avaliação (anônima)</Text>
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
                {!canReview && reviewStatus === 'no_contact' && (
                  <Text style={styles.noReviewsHint}>
                    Entre em contato pelo WhatsApp para poder avaliar
                  </Text>
                )}
              </View>
            ) : (
              reviews.map((review) => (
                <View key={review.review_id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      <View style={styles.reviewAvatar}>
                        <Ionicons name="person" size={16} color="#6B7280" />
                      </View>
                      <Text style={styles.reviewUserName}>Usuário Anônimo</Text>
                      {review.is_verified && (
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        </View>
                      )}
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

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Denunciar Prestador</Text>
              <TouchableOpacity onPress={() => { setShowReportModal(false); setReportReason(''); setReportDescription(''); }}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.reportModalSubtitle}>Selecione o motivo da denúncia:</Text>
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reportReasonItem,
                  reportReason === reason.id && styles.reportReasonItemSelected
                ]}
                onPress={() => setReportReason(reason.id)}
              >
                <View style={[
                  styles.reportRadio,
                  reportReason === reason.id && styles.reportRadioSelected
                ]}>
                  {reportReason === reason.id && (
                    <View style={styles.reportRadioInner} />
                  )}
                </View>
                <Text style={[
                  styles.reportReasonText,
                  reportReason === reason.id && styles.reportReasonTextSelected
                ]}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            
            <TextInput
              style={styles.reportDescriptionInput}
              placeholder="Descreva o problema (opcional)"
              placeholderTextColor="#6B7280"
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={[styles.reportSubmitButton, !reportReason && styles.reportSubmitButtonDisabled]}
              onPress={handleReport}
              disabled={!reportReason || isReporting}
            >
              {isReporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.reportSubmitText}>Enviar Denúncia</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setSelectedImageIndex(null)}
            data-testid="close-image-modal-btn"
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedImageIndex !== null && provider?.service_photos && (
            <>
              <Image
                source={{ uri: provider.service_photos[selectedImageIndex] }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              
              {/* Navigation arrows */}
              {provider.service_photos.length > 1 && (
                <View style={styles.imageNavigation}>
                  <TouchableOpacity
                    style={[styles.navButton, selectedImageIndex === 0 && styles.navButtonDisabled]}
                    onPress={() => selectedImageIndex > 0 && setSelectedImageIndex(selectedImageIndex - 1)}
                    disabled={selectedImageIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={32} color={selectedImageIndex === 0 ? '#6B7280' : '#FFFFFF'} />
                  </TouchableOpacity>

                  <Text style={styles.imageCounter}>
                    {selectedImageIndex + 1} / {provider.service_photos.length}
                  </Text>

                  <TouchableOpacity
                    style={[styles.navButton, selectedImageIndex === provider.service_photos.length - 1 && styles.navButtonDisabled]}
                    onPress={() => selectedImageIndex < provider.service_photos.length - 1 && setSelectedImageIndex(selectedImageIndex + 1)}
                    disabled={selectedImageIndex === provider.service_photos.length - 1}
                  >
                    <Ionicons name="chevron-forward" size={32} color={selectedImageIndex === provider.service_photos.length - 1 ? '#6B7280' : '#FFFFFF'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: '#10B981',
    fontSize: 13,
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
  citiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  citiesText: {
    color: '#10B981',
    fontSize: 14,
    flex: 1,
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
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginBottom: 24,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
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
  alreadyReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alreadyReviewedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  reviewsInfoText: {
    color: '#6B7280',
    fontSize: 12,
  },
  noReviewsHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  bottomSpacer: {
    height: 32,
  },
  // Report button styles
  reportHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Report Modal styles
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 12,
  },
  reportReasonItemSelected: {
    backgroundColor: '#EF444415',
  },
  reportRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportRadioSelected: {
    borderColor: '#EF4444',
  },
  reportRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  reportReasonText: {
    fontSize: 15,
    color: '#D1D5DB',
  },
  reportReasonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  reportDescriptionInput: {
    backgroundColor: '#2D2D2D',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 16,
  },
  reportSubmitButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reportSubmitButtonDisabled: {
    opacity: 0.4,
  },
  reportSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Full Screen Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navButton: {
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
