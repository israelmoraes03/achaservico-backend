import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

export default function CompanyDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New/Edit job form
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formRequirements, setFormRequirements] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [companyRes, jobsRes] = await Promise.all([
        api.get('/companies/my'),
        api.get('/companies/my-jobs'),
      ]);
      setCompany(companyRes.data?.company || null);
      setJobs(jobsRes.data || []);
      setFilteredJobs(jobsRes.data || []);
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = jobs.filter(
        j => j.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             j.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs(jobs);
    }
  }, [searchQuery, jobs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCity('');
    setFormRequirements('');
    setFormDescription('');
    setEditingJob(null);
    setShowForm(false);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setFormTitle(job.job_title || '');
    setFormCity(job.city || '');
    setFormRequirements(job.requirements || '');
    setFormDescription(job.description || '');
    setShowForm(true);
  };

  const handleSaveJob = async () => {
    if (!formTitle.trim() || !formRequirements.trim() || !formDescription.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      setFormSubmitting(true);
      if (editingJob) {
        await api.put(`/companies/jobs/${editingJob.job_id}`, {
          job_title: formTitle.trim(),
          city: formCity.trim() || company?.city || '',
          requirements: formRequirements.trim(),
          description: formDescription.trim(),
        });
        Alert.alert('Sucesso', 'Vaga atualizada!');
      } else {
        await api.post('/jobs/submit', {
          company_name: company?.company_name || '',
          job_title: formTitle.trim(),
          email: company?.email || '',
          phone: company?.phone || null,
          requirements: formRequirements.trim(),
          description: formDescription.trim(),
          city: formCity.trim() || company?.city || '',
        });
        Alert.alert('Sucesso', 'Vaga publicada!');
      }
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.detail || 'Erro ao salvar vaga');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteJob = (job: any) => {
    Alert.alert('Excluir Vaga', `Deseja excluir "${job.job_title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/companies/jobs/${job.job_id}`);
            Alert.alert('Sucesso', 'Vaga excluída!');
            fetchData();
          } catch (error) {
            Alert.alert('Erro', 'Erro ao excluir vaga');
          }
        }
      }
    ]);
  };

  const getCityName = (cityId: string) => {
    if (!cityId) return '';
    return cityId
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
    return `${Math.floor(diffDays / 30)} mês(es) atrás`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{company?.company_name || 'Minha Empresa'}</Text>
          <Text style={styles.headerSubtitle}>{jobs.length} vaga(s) publicada(s)</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Company Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{company?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#9CA3AF" />
            <Text style={styles.infoText}>{company?.phone}</Text>
          </View>
          {company?.city && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color="#9CA3AF" />
              <Text style={styles.infoText}>{getCityName(company.city)}</Text>
            </View>
          )}
        </View>

        {/* New Job Button */}
        <TouchableOpacity
          style={styles.newJobBtn}
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.newJobBtnText}>Publicar Nova Vaga</Text>
        </TouchableOpacity>

        {/* New/Edit Job Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingJob ? 'Editar Vaga' : 'Nova Vaga'}</Text>
            
            <Text style={styles.formLabel}>Título da Vaga *</Text>
            <TextInput style={styles.formInput} placeholder="Ex: Assistente Administrativo" placeholderTextColor="#6B7280" value={formTitle} onChangeText={setFormTitle} />
            
            <Text style={styles.formLabel}>Cidade (vazio = usa a da empresa)</Text>
            <TextInput style={styles.formInput} placeholder="Ex: Três Lagoas" placeholderTextColor="#6B7280" value={formCity} onChangeText={setFormCity} />
            
            <Text style={styles.formLabel}>Requisitos *</Text>
            <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Requisitos para a vaga..." placeholderTextColor="#6B7280" value={formRequirements} onChangeText={setFormRequirements} multiline />
            
            <Text style={styles.formLabel}>Descrição *</Text>
            <TextInput style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Descrição detalhada da vaga..." placeholderTextColor="#6B7280" value={formDescription} onChangeText={setFormDescription} multiline />
            
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, formSubmitting && { opacity: 0.6 }]}
                onPress={handleSaveJob}
                disabled={formSubmitting}
              >
                <Text style={styles.saveBtnText}>{formSubmitting ? 'Salvando...' : (editingJob ? 'Atualizar' : 'Publicar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search */}
        {jobs.length > 0 && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar nas suas vagas..."
              placeholderTextColor="#6B7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Jobs List */}
        <Text style={styles.sectionTitle}>Suas Vagas ({filteredJobs.length})</Text>

        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#374151" />
            <Text style={styles.emptyText}>
              {jobs.length === 0 ? 'Nenhuma vaga publicada ainda' : 'Nenhuma vaga encontrada'}
            </Text>
          </View>
        ) : (
          filteredJobs.map((job: any) => (
            <View key={job.job_id} style={styles.jobCard}>
              <View style={styles.jobCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobCardTitle}>{job.job_title}</Text>
                  <View style={styles.jobCardMeta}>
                    {job.city && (
                      <View style={styles.jobCardMetaItem}>
                        <Ionicons name="location" size={13} color="#6B7280" />
                        <Text style={styles.jobCardMetaText}>{getCityName(job.city)}</Text>
                      </View>
                    )}
                    <View style={styles.jobCardMetaItem}>
                      <Ionicons name="time" size={13} color="#6B7280" />
                      <Text style={styles.jobCardMetaText}>{getTimeAgo(job.created_at)}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: job.is_active ? '#10B98120' : '#EF444420' }]}>
                  <Text style={[styles.statusText, { color: job.is_active ? '#10B981' : '#EF4444' }]}>
                    {job.is_active ? 'Ativa' : 'Inativa'}
                  </Text>
                </View>
              </View>

              {/* Requirements preview */}
              <Text style={styles.jobPreviewText} numberOfLines={2}>{job.requirements}</Text>

              {/* Actions */}
              <View style={styles.jobCardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEditJob(job)}>
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteJob(job)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1F2937', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1F2937',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  infoCard: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 12, gap: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#D1D5DB', fontSize: 14 },
  newJobBtn: {
    backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16,
  },
  newJobBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  formCard: {
    backgroundColor: '#1F2937', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#8B5CF6',
  },
  formTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  formLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4, marginTop: 4 },
  formInput: {
    backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    borderWidth: 1, borderColor: '#374151', marginBottom: 8,
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#374151', paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  cancelBtnText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  sectionTitle: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#6B7280', fontSize: 14, marginTop: 8 },
  jobCard: {
    backgroundColor: '#1F2937', borderRadius: 14, padding: 16, marginBottom: 10,
  },
  jobCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  jobCardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  jobCardMeta: { flexDirection: 'row', gap: 14 },
  jobCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobCardMetaText: { color: '#6B7280', fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  jobPreviewText: { color: '#9CA3AF', fontSize: 13, marginTop: 10, lineHeight: 18 },
  jobCardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#3B82F620', paddingVertical: 10, borderRadius: 8,
  },
  editBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EF444420', paddingVertical: 10, borderRadius: 8,
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
});
