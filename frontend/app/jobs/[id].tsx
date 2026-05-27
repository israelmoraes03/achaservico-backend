import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as MailComposer from 'expo-mail-composer';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

interface Job {
  job_id: string;
  company_name: string;
  job_title: string;
  email: string;
  phone?: string;
  requirements: string;
  description: string;
  city: string;
  is_active: boolean;
  created_at: string;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/jobs/${id}`);
      setJob(response.data);
    } catch (error) {
      console.error('Error fetching job:', error);
      Alert.alert('Erro', 'Vaga não encontrada');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!job) return;
    
    const userName = user?.name || 'Candidato';
    const subject = `Candidatura - ${job.job_title} - ${userName}`;
    const body = `Olá,\n\nTenho interesse na vaga de ${job.job_title} anunciada no AchaServiço.\n\nNome: ${userName}\n\nAguardo retorno.\n\nAtenciosamente,\n${userName}`;
    
    // Check if MailComposer is available
    const isAvailable = await MailComposer.isAvailableAsync();
    
    if (!isAvailable) {
      // Fallback to mailto
      const mailUrl = `mailto:${job.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      Linking.openURL(mailUrl).catch(() => {
        Alert.alert('Email não disponível', `Envie seu currículo para: ${job.email}`);
      });
      return;
    }

    // Ask if user wants to attach resume
    Alert.alert(
      'Candidatar-se',
      'Deseja anexar seu currículo?',
      [
        {
          text: 'Sem Anexo',
          onPress: async () => {
            await MailComposer.composeAsync({
              recipients: [job.email],
              subject,
              body,
            });
          }
        },
        {
          text: 'Anexar Currículo',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
              });
              
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                await MailComposer.composeAsync({
                  recipients: [job.email],
                  subject,
                  body,
                  attachments: [file.uri],
                });
              }
            } catch (error) {
              console.error('Error picking document:', error);
              // Fallback: open composer without attachment
              await MailComposer.composeAsync({
                recipients: [job.email],
                subject,
                body,
              });
            }
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleWhatsApp = () => {
    if (!job?.phone) return;
    const cleanPhone = job.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá! Vi a vaga de ${job.job_title} no AchaServiço e tenho interesse. Poderia me dar mais informações?`
    );
    const url = `https://wa.me/55${cleanPhone}?text=${message}`;
    Linking.openURL(url);
  };

  const getCityName = (cityId: string) => {
    return cityId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semana(s) atrás`;
    return `${Math.floor(diffDays / 30)} mês(es) atrás`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#9CA3AF' }}>Vaga não encontrada</Text>
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
        <Text style={styles.headerTitle}>Detalhes da Vaga</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Card */}
        <View style={styles.companyCard}>
          <View style={styles.companyIconContainer}>
            <Ionicons name="business" size={36} color="#10B981" />
          </View>
          <Text style={styles.companyName}>{job.company_name}</Text>
          <Text style={styles.jobTitle}>{job.job_title}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {job.city ? getCityName(job.city) : 'Não informada'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{getTimeAgo(job.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Requirements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="clipboard" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Requisitos</Text>
          </View>
          <Text style={styles.sectionText}>{job.requirements}</Text>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Descrição da Vaga</Text>
          </View>
          <Text style={styles.sectionText}>{job.description}</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Contato</Text>
          </View>
          <Text style={styles.contactEmail}>{job.email}</Text>
          {job.phone && (
            <Text style={styles.contactPhone}>{job.phone}</Text>
          )}
        </View>

        {/* Apply Buttons */}
        <View style={styles.applyContainer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Ionicons name="document-attach" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Candidatar-se com Currículo</Text>
          </TouchableOpacity>

          {job.phone && (
            <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <Text style={styles.whatsappButtonText}>Contato via WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  companyCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  companyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  contactEmail: {
    fontSize: 15,
    color: '#10B981',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  applyContainer: {
    gap: 12,
    marginTop: 8,
  },
  applyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
