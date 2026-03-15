import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import api from '../src/services/api';

interface ContactedProvider {
  provider_id: string;
  name: string;
  categories: string[];
  phone: string;
  neighborhood: string;
  profile_image?: string;
  contacted_at: string;
}

export default function ContactHistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [contacts, setContacts] = useState<ContactedProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadContactHistory = useCallback(async () => {
    try {
      const response = await api.get('/users/contact-history');
      setContacts(response.data);
    } catch (error) {
      console.log('Error loading contact history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadContactHistory();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadContactHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContactHistory();
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}! Vi seu perfil no AchaServiço.`);
    Linking.openURL(`https://wa.me/55${cleanPhone}?text=${message}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderContact = ({ item }: { item: ContactedProvider }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => router.push(`/provider/${item.provider_id}`)}
      data-testid={`contact-${item.provider_id}`}
    >
      <View style={styles.contactInfo}>
        {item.profile_image ? (
          <Image source={{ uri: item.profile_image }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={30} color="#6B7280" />
          </View>
        )}
        <View style={styles.contactDetails}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactCategory}>
            {item.categories?.join(', ') || 'Serviços gerais'}
          </Text>
          <Text style={styles.contactDate}>
            Contatado em: {formatDate(item.contacted_at)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.whatsappButton}
        onPress={() => openWhatsApp(item.phone, item.name)}
      >
        <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico de Contatos</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={60} color="#6B7280" />
          <Text style={styles.emptyText}>Faça login para ver seu histórico</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico de Contatos</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color="#6B7280" />
          <Text style={styles.emptyText}>Nenhum contato ainda</Text>
          <Text style={styles.emptySubtext}>
            Seus prestadores contatados aparecerão aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.provider_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        />
      )}
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  contactCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetails: {
    marginLeft: 12,
    flex: 1,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactCategory: {
    color: '#10B981',
    fontSize: 13,
    marginTop: 2,
  },
  contactDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
