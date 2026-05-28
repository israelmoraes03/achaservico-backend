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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  const [formQuantity, setFormQuantity] = useState('1');
  const [formTargetAudience, setFormTargetAudience] = useState('todos');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formAttachment, setFormAttachment] = useState<any>(null);
  const [existingAttachment, setExistingAttachment] = useState<any>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [cities, setCities] = useState<any[]>([]);

  const TARGET_OPTIONS = [
    { id: 'todos', label: 'Todos' },
    { id: 'homem', label: 'Homem' },
    { id: 'mulher', label: 'Mulher' },
    { id: 'pcd', label: 'PCD' },
    { id: 'lgbt', label: 'LGBT' },
  ];

  // Edit company info
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyCnpj, setEditCompanyCnpj] = useState('');
  const [editCompanyEmail, setEditCompanyEmail] = useState('');
  const [editCompanyPhone, setEditCompanyPhone] = useState('');
  const [editCompanyCity, setEditCompanyCity] = useState('');
  const [editCompanyLogo, setEditCompanyLogo] = useState<string | null>(null); // base64 or URL
  const [editingCompany, setEditingCompany] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [companyRes, jobsRes, citiesRes] = await Promise.all([
        api.get('/companies/my'),
        api.get('/companies/my-jobs'),
        api.get('/cities'),
      ]);
      setCompany(companyRes.data?.company || null);
      setJobs(jobsRes.data || []);
      setFilteredJobs(jobsRes.data || []);
      setCities(citiesRes.data || []);
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

  // ========== COMPANY EDIT ==========

  const openEditCompany = () => {
    if (company) {
      setEditCompanyName(company.company_name || '');
      setEditCompanyCnpj(company.cnpj || '');
      setEditCompanyEmail(company.email || '');
      setEditCompanyPhone(company.phone || '');
      setEditCompanyCity(company.city || '');
      setEditCompanyLogo(company.logo || null);
    }
    setShowEditCompany(true);
  };

  const pickCompanyLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para selecionar a foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setEditCompanyLogo(`data:image/jpeg;base64,${asset.base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Erro ao selecionar imagem');
    }
  };

  const handleSaveCompanyInfo = async () => {
    if (!editCompanyName.trim() || !editCompanyEmail.trim() || !editCompanyPhone.trim()) {
      Alert.alert('Erro', 'Preencha pelo menos: Nome, Email e Telefone');
      return;
    }
    try {
      setEditingCompany(true);
      const payload: any = {
        company_name: editCompanyName.trim(),
        cnpj: editCompanyCnpj.trim() || null,
        email: editCompanyEmail.trim(),
        phone: editCompanyPhone.trim(),
        city: editCompanyCity.trim(),
      };
      if (editCompanyLogo) {
        payload.logo = editCompanyLogo;
      }
      await api.put('/companies/my', payload);
      Alert.alert('Sucesso', 'Dados da empresa atualizados!');
      setShowEditCompany(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Erro', error?.response?.data?.detail || 'Erro ao atualizar dados');
    } finally {
      setEditingCompany(false);
    }
  };

  // ========== JOB FORM ==========

  const resetForm = () => {
    setFormTitle('');
    setFormCity('');
    setFormRequirements('');
    setFormDescription('');
    setFormQuantity('1');
    setFormTargetAudience('todos');
    setFormAttachment(null);
    setExistingAttachment(null);
    setEditingJob(null);
    setShowForm(false);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setFormTitle(job.job_title || '');
    setFormCity(job.city || '');
    setFormRequirements(job.requirements || '');
    setFormDescription(job.description || '');
    setFormQuantity(String(job.quantity || 1));
    setFormTargetAudience(job.target_audience || 'todos');
    setFormAttachment(null);
    if (job.attachment_url) {
      setExistingAttachment({ url: job.attachment_url, name: job.attachment_name || 'Arquivo' });
    } else {
      setExistingAttachment(null);
    }
    setShowForm(true);
  };

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const mimeType = file.mimeType || 'application/octet-stream';
        setFormAttachment({
          name: file.name,
          base64: `data:${mimeType};base64,${base64}`,
        });
        setExistingAttachment(null);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erro', 'Erro ao selecionar arquivo');
    }
  };

  const handleSaveJob = async () => {
    if (!formTitle.trim() || !formRequirements.trim() || !formDescription.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }
    try {
      setFormSubmitting(true);
      if (editingJob) {
        const payload: any = {
          job_title: formTitle.trim(),
          city: formCity.trim() || company?.city || '',
          requirements: formRequirements.trim(),
          description: formDescription.trim(),
          quantity: parseInt(formQuantity) || 1,
          target_audience: formTargetAudience,
        };
        if (formAttachment) {
          payload.attachment_base64 = formAttachment.base64;
          payload.attachment_name = formAttachment.name;
        } else if (!existingAttachment && editingJob.attachment_url) {
          payload.remove_attachment = true;
        }
        await api.put(`/companies/jobs/${editingJob.job_id}`, payload);
        Alert.alert('Sucesso', 'Vaga atualizada!');
      } else {
        const payload: any = {
          company_name: company?.company_name || '',
          job_title: formTitle.trim(),
          email: company?.email || '',
          phone: company?.phone || null,
          requirements: formRequirements.trim(),
          description: formDescription.trim(),
          city: formCity.trim() || company?.city || '',
          quantity: parseInt(formQuantity) || 1,
          target_audience: formTargetAudience,
        };
        if (formAttachment) {
          payload.attachment_base64 = formAttachment.base64;
          payload.attachment_name = formAttachment.name;
        }
        await api.post('/jobs/submit', payload);
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

  // ========== JOB ACTIONS ==========

  const handleToggleJob = async (job: any) => {
    const action = job.is_active ? 'Pausar' : 'Ativar';
    Alert.alert(`${action} Vaga`, `Deseja ${action.toLowerCase()} "${job.job_title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: action, onPress: async () => {
          try {
            await api.put(`/companies/jobs/${job.job_id}/toggle`);
            fetchData();
          } catch (error) {
            Alert.alert('Erro', 'Erro ao alterar status da vaga');
          }
        }
      }
    ]);
  };

  const handleDeleteJob = (job: any) => {
    Alert.alert('Excluir Vaga', `Deseja excluir "${job.job_title}" permanentemente?`, [
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

  // ========== HELPERS ==========

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>DADOS DA EMPRESA</Text>
            <TouchableOpacity onPress={openEditCompany} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="create-outline" size={14} color="#3B82F6" />
              <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Company Logo */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            {company?.logo ? (
              <Image source={{ uri: company.logo }} style={styles.companyLogo} />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <Ionicons name="business" size={32} color="#6B7280" />
              </View>
            )}
          </View>

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
          {company?.cnpj && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={16} color="#9CA3AF" />
              <Text style={styles.infoText}>CNPJ: {company.cnpj}</Text>
            </View>
          )}
        </View>

        {/* Edit Company Form */}
        {showEditCompany && (
          <View style={[styles.formCard, { borderColor: '#3B82F6' }]}>
            <Text style={styles.formTitle}>Editar Dados da Empresa</Text>

            {/* Logo Picker */}
            <Text style={styles.formLabel}>Logo da Empresa</Text>
            <TouchableOpacity onPress={pickCompanyLogo} style={styles.logoPickerBtn}>
              {editCompanyLogo ? (
                <Image source={{ uri: editCompanyLogo }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPickerPlaceholder}>
                  <Ionicons name="camera" size={24} color="#6B7280" />
                  <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>Selecionar Logo</Text>
                </View>
              )}
              <View style={styles.logoPickerOverlay}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={styles.formLabel}>Nome da Empresa *</Text>
            <TextInput style={styles.formInput} value={editCompanyName} onChangeText={setEditCompanyName} placeholderTextColor="#6B7280" />
            
            <Text style={styles.formLabel}>CNPJ (opcional)</Text>
            <TextInput style={styles.formInput} value={editCompanyCnpj} onChangeText={setEditCompanyCnpj} placeholderTextColor="#6B7280" />
            
            <Text style={styles.formLabel}>Email Corporativo *</Text>
            <TextInput style={styles.formInput} value={editCompanyEmail} onChangeText={setEditCompanyEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#6B7280" />
            
            <Text style={styles.formLabel}>Telefone/WhatsApp *</Text>
            <TextInput style={styles.formInput} value={editCompanyPhone} onChangeText={setEditCompanyPhone} keyboardType="phone-pad" placeholderTextColor="#6B7280" />
            
            <Text style={styles.formLabel}>Cidade</Text>
            <TextInput style={styles.formInput} value={editCompanyCity} onChangeText={setEditCompanyCity} placeholderTextColor="#6B7280" />
            
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditCompany(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#3B82F6' }, editingCompany && { opacity: 0.6 }]}
                onPress={handleSaveCompanyInfo}
                disabled={editingCompany}
              >
                <Text style={styles.saveBtnText}>{editingCompany ? 'Salvando...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            
            <Text style={styles.formLabel}>Cidade *</Text>
            <TouchableOpacity
              style={styles.formInput}
              onPress={() => setShowCityPicker(!showCityPicker)}
            >
              <Text style={{ color: formCity ? '#FFFFFF' : '#6B7280', fontSize: 14 }}>
                {formCity ? cities.find((c: any) => c.id === formCity)?.name || formCity : 'Selecione a cidade'}
              </Text>
            </TouchableOpacity>
            {showCityPicker && (
              <View style={{ backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#374151', marginBottom: 8, maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled>
                  {cities.map((city: any) => (
                    <TouchableOpacity
                      key={city.id}
                      style={{ paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#1F293780' }}
                      onPress={() => { setFormCity(city.id); setShowCityPicker(false); }}
                    >
                      <Text style={{ color: formCity === city.id ? '#10B981' : '#D1D5DB', fontSize: 14 }}>
                        {city.name} - {city.state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Qtd. de Vagas</Text>
                <TextInput style={styles.formInput} placeholder="1" placeholderTextColor="#6B7280" value={formQuantity} onChangeText={setFormQuantity} keyboardType="numeric" />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.formLabel}>Público-Alvo</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {TARGET_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setFormTargetAudience(opt.id)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                        backgroundColor: formTargetAudience === opt.id ? '#10B981' : '#111827',
                        borderWidth: 1, borderColor: formTargetAudience === opt.id ? '#10B981' : '#374151',
                      }}
                    >
                      <Text style={{ color: formTargetAudience === opt.id ? '#FFFFFF' : '#9CA3AF', fontSize: 12, fontWeight: '600' }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            <Text style={styles.formLabel}>Requisitos *</Text>
            <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Requisitos para a vaga..." placeholderTextColor="#6B7280" value={formRequirements} onChangeText={setFormRequirements} multiline />
            
            <Text style={styles.formLabel}>Descrição *</Text>
            <TextInput style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Descrição detalhada da vaga..." placeholderTextColor="#6B7280" value={formDescription} onChangeText={setFormDescription} multiline />

            {/* Attachment Section */}
            <Text style={styles.formLabel}>Arquivo / Material (opcional)</Text>
            {(formAttachment || existingAttachment) ? (
              <View style={styles.attachmentPreview}>
                <Ionicons name="document-attach" size={20} color="#10B981" />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {formAttachment?.name || existingAttachment?.name}
                </Text>
                <TouchableOpacity onPress={() => { setFormAttachment(null); setExistingAttachment(null); }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
                <Ionicons name="attach" size={18} color="#8B5CF6" />
                <Text style={styles.attachBtnText}>Anexar PDF, DOC ou Imagem</Text>
              </TouchableOpacity>
            )}
            
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
                    {job.attachment_url && (
                      <View style={styles.jobCardMetaItem}>
                        <Ionicons name="attach" size={13} color="#8B5CF6" />
                        <Text style={[styles.jobCardMetaText, { color: '#8B5CF6' }]}>Anexo</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: job.is_active ? '#10B98120' : '#F59E0B20' }]}>
                  <Text style={[styles.statusText, { color: job.is_active ? '#10B981' : '#F59E0B' }]}>
                    {job.is_active ? 'Ativa' : 'Pausada'}
                  </Text>
                </View>
              </View>

              {/* Requirements preview */}
              <Text style={styles.jobPreviewText} numberOfLines={2}>{job.requirements}</Text>

              {/* Actions */}
              <View style={styles.jobCardActions}>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: job.is_active ? '#F59E0B20' : '#10B98120' }]}
                  onPress={() => handleToggleJob(job)}
                >
                  <Ionicons name={job.is_active ? 'pause-circle' : 'play-circle'} size={16} color={job.is_active ? '#F59E0B' : '#10B981'} />
                  <Text style={[styles.toggleBtnText, { color: job.is_active ? '#F59E0B' : '#10B981' }]}>
                    {job.is_active ? 'Pausar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleEditJob(job)}>
                  <Ionicons name="create-outline" size={16} color="#3B82F6" />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteJob(job)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
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
  companyLogo: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#111827',
  },
  companyLogoPlaceholder: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151',
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
  // Logo picker
  logoPickerBtn: {
    alignSelf: 'center', marginBottom: 12, position: 'relative',
  },
  logoPreview: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#111827',
  },
  logoPickerPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed',
  },
  logoPickerOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1F2937',
  },
  // Attachment
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#374151', borderStyle: 'dashed', marginBottom: 8,
  },
  attachBtnText: { color: '#8B5CF6', fontSize: 13, fontWeight: '600' },
  attachmentPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111827',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#10B98140',
  },
  attachmentName: { flex: 1, color: '#D1D5DB', fontSize: 13 },
  // Search
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
  jobCardMeta: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  jobCardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobCardMetaText: { color: '#6B7280', fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  jobPreviewText: { color: '#9CA3AF', fontSize: 13, marginTop: 10, lineHeight: 18 },
  jobCardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 8,
  },
  toggleBtnText: { fontWeight: '600', fontSize: 13 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#3B82F620', paddingVertical: 10, borderRadius: 8,
  },
  editBtnText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EF444420', paddingVertical: 10, borderRadius: 8,
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
});
