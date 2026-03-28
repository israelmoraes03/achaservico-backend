import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

const SUPPORT_PHONE = '5567998146122';
const SUPPORT_EMAIL = 'contato.achaservico@gmail.com';

interface FavoriteProvider {
  provider_id: string;
  name: string;
  phone: string;
  categories: string[];
  neighborhood: string;
}

export default function ProfileScreen() {
  const { user, provider, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = React.useState(false);
  const [favorites, setFavorites] = useState<FavoriteProvider[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Load favorites
  const loadFavorites = useCallback(async () => {
    try {
      const response = await api.get('/users/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.log('Error loading favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    }
  }, [isAuthenticated, loadFavorites]);

  const openWhatsApp = () => {
    const message = encodeURIComponent('Olá, preciso de ajuda com dúvidas no app AchaServiço.');
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${message}`);
    setShowHelpModal(false);
  };

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Ajuda - AchaServiço&body=Olá, preciso de ajuda com dúvidas no app AchaServiço.`);
    setShowHelpModal(false);
  };

  const openCancelAccount = () => {
    const userName = user?.name || 'Não informado';
    const userEmail = user?.email || 'Não informado';
    const subject = encodeURIComponent('Solicitação de Cancelamento de Conta - AchaServiço');
    const body = encodeURIComponent(
      `Olá,\n\nSolicito o cancelamento da minha conta no aplicativo AchaServiço.\n\n` +
      `Dados da conta:\n` +
      `- Nome: ${userName}\n` +
      `- E-mail: ${userEmail}\n\n` +
      `Estou ciente de que:\n` +
      `- Meus dados pessoais serão removidos permanentemente\n` +
      `- Caso seja prestador, meu perfil será desativado\n` +
      `- Esta ação é irreversível\n\n` +
      `Confirmo que desejo cancelar minha conta.\n\n` +
      `Atenciosamente,\n${userName}`
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
    setShowHelpModal(false);
  };

  const performLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.replace('/');
  };

  if (!user || !isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color="#6B7280" />
            </View>
          )}
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Provider Section */}
        {provider ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perfil de Prestador</Text>
            <View style={styles.providerStatus}>
              <View style={styles.statusBadge}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: provider.subscription_status === 'active' ? '#10B981' : '#EF4444' }
                ]} />
                <Text style={styles.statusText}>
                  {provider.subscription_status === 'active' ? 'Assinatura Ativa' : 'Assinatura Inativa'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/provider/dashboard')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="settings" size={22} color="#10B981" />
                <Text style={styles.menuItemText}>Gerenciar Perfil</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seja um Prestador</Text>
            <Text style={styles.sectionDescription}>
              Cadastre seu perfil e receba contatos de clientes da sua região.
            </Text>
            <TouchableOpacity
              style={styles.becomeProviderButton}
              onPress={() => router.push('/provider/register')}
            >
              <Ionicons name="briefcase" size={20} color="#0A0A0A" />
              <Text style={styles.becomeProviderText}>Cadastrar como Prestador</Text>
            </TouchableOpacity>
            <Text style={styles.priceText}>Cadastro gratuito!</Text>
          </View>
        )}

        {/* Favorites Section */}
        <View style={styles.section}>
          <View style={styles.favHeader}>
            <Text style={styles.sectionTitle}>Meus Favoritos</Text>
            {favorites.length > 0 && (
              <Text style={styles.favCount}>{favorites.length}</Text>
            )}
          </View>
          
          {loadingFavorites ? (
            <ActivityIndicator size="small" color="#10B981" style={{ marginVertical: 20 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyFavorites}>
              <Ionicons name="heart-outline" size={40} color="#6B7280" />
              <Text style={styles.emptyFavoritesText}>Nenhum favorito ainda</Text>
              <Text style={styles.emptyFavoritesSubtext}>
                Toque no coração nos prestadores para salvá-los aqui
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.favScrollContent}
            >
              {favorites.map((fav) => (
                <TouchableOpacity 
                  key={fav.provider_id} 
                  style={styles.favCard}
                  onPress={() => router.push(`/provider/${fav.provider_id}`)}
                >
                  <View style={styles.favCardTop}>
                    <View style={styles.favAvatar}>
                      <Text style={styles.favAvatarText}>
                        {fav.name?.charAt(0)?.toUpperCase() || 'P'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.favWhatsApp}
                      onPress={(e) => {
                        e.stopPropagation();
                        const phone = fav.phone?.replace(/\D/g, '');
                        const message = encodeURIComponent(`Olá ${fav.name}, encontrei seu perfil no AchaServiço e gostaria de um orçamento.`);
                        Linking.openURL(`https://wa.me/55${phone}?text=${message}`);
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.favCardName} numberOfLines={1}>{fav.name}</Text>
                  <Text style={styles.favCardCategory} numberOfLines={1}>
                    {fav.categories?.[0] || 'Prestador'}
                  </Text>
                  {fav.neighborhood && (
                    <Text style={styles.favCardLocation} numberOfLines={1}>
                      {fav.neighborhood}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/contact-history')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="chatbubbles" size={22} color="#10B981" />
              <Text style={styles.menuItemText}>Histórico de Contatos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowHelpModal(true)}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle" size={22} color="#10B981" />
              <Text style={styles.menuItemText}>Ajuda / Suporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text" size={22} color="#10B981" />
              <Text style={styles.menuItemText}>Termos de Uso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/privacy')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark" size={22} color="#10B981" />
              <Text style={styles.menuItemText}>Política de Privacidade</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/admin')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings" size={22} color="#10B981" />
              <Text style={styles.menuItemText}>Administração</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Logout Confirmation Modal */}
        {showLogoutConfirm && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sair</Text>
              <Text style={styles.modalMessage}>Tem certeza que deseja sair?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalButtonCancel}
                  onPress={() => setShowLogoutConfirm(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalButtonConfirm}
                  onPress={performLogout}
                >
                  <Text style={styles.modalButtonConfirmText}>Sair</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.helpModalContent}>
              <Text style={styles.helpModalTitle}>Ajuda / Suporte</Text>
              <Text style={styles.helpModalSubtitle}>Como podemos te ajudar?</Text>
              
              <TouchableOpacity style={styles.helpOption} onPress={openWhatsApp}>
                <View style={styles.helpOptionIcon}>
                  <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                </View>
                <View style={styles.helpOptionText}>
                  <Text style={styles.helpOptionTitle}>WhatsApp</Text>
                  <Text style={styles.helpOptionDescription}>Fale conosco pelo WhatsApp</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.helpOption} onPress={openEmail}>
                <View style={styles.helpOptionIcon}>
                  <Ionicons name="mail" size={28} color="#10B981" />
                </View>
                <View style={styles.helpOptionText}>
                  <Text style={styles.helpOptionTitle}>E-mail</Text>
                  <Text style={styles.helpOptionDescription}>{SUPPORT_EMAIL}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <View style={styles.helpDivider} />
              
              <TouchableOpacity style={styles.helpOption} onPress={() => {
                Alert.alert(
                  'Cancelar Conta',
                  'Tem certeza que deseja solicitar o cancelamento da sua conta? Seus dados serão removidos permanentemente.',
                  [
                    { text: 'Não', style: 'cancel' },
                    { text: 'Sim, cancelar', onPress: openCancelAccount, style: 'destructive' },
                  ]
                );
              }}>
                <View style={[styles.helpOptionIcon, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="person-remove" size={28} color="#EF4444" />
                </View>
                <View style={styles.helpOptionText}>
                  <Text style={[styles.helpOptionTitle, { color: '#EF4444' }]}>Cancelar Conta</Text>
                  <Text style={styles.helpOptionDescription}>Solicitar exclusão dos seus dados</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.helpCloseButton}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.helpCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutConfirm(true)}>
          <Ionicons name="log-out" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

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
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
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
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  providerStatus: {
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D2D',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  becomeProviderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  becomeProviderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  priceText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
  helpModalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 340,
  },
  helpModalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  helpModalSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  helpOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpOptionText: {
    flex: 1,
  },
  helpOptionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpOptionDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  helpCloseButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  helpDivider: {
    height: 1,
    backgroundColor: '#2D2D2D',
    marginVertical: 8,
  },
  helpCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Favorites styles
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyFavoritesText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  emptyFavoritesSubtext: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favCount: {
    backgroundColor: '#10B981',
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  favScrollContent: {
    paddingVertical: 8,
    gap: 10,
  },
  favCard: {
    width: 130,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  favCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  favAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favAvatarText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  favWhatsApp: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D36615',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favCardName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  favCardCategory: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '500',
  },
  favCardLocation: {
    color: '#6B7280',
    fontSize: 11,
  },
});
