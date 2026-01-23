import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdate}>Última atualização: Janeiro de 2025</Text>

        <Text style={styles.sectionTitle}>1. Introdução</Text>
        <Text style={styles.paragraph}>
          O AchaServiço ("nós", "nosso" ou "aplicativo") está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo de serviços locais em Três Lagoas - MS.
        </Text>

        <Text style={styles.sectionTitle}>2. Informações que Coletamos</Text>
        <Text style={styles.paragraph}>
          Coletamos as seguintes informações:
        </Text>
        <Text style={styles.bulletPoint}>• Nome completo</Text>
        <Text style={styles.bulletPoint}>• Endereço de e-mail</Text>
        <Text style={styles.bulletPoint}>• Número de telefone (WhatsApp)</Text>
        <Text style={styles.bulletPoint}>• Foto de perfil (opcional)</Text>
        <Text style={styles.bulletPoint}>• Categoria de serviço (para prestadores)</Text>
        <Text style={styles.bulletPoint}>• Bairro de atuação (para prestadores)</Text>
        <Text style={styles.bulletPoint}>• Avaliações e comentários</Text>

        <Text style={styles.sectionTitle}>3. Como Usamos suas Informações</Text>
        <Text style={styles.paragraph}>
          Utilizamos suas informações para:
        </Text>
        <Text style={styles.bulletPoint}>• Criar e gerenciar sua conta</Text>
        <Text style={styles.bulletPoint}>• Exibir seu perfil para clientes (prestadores)</Text>
        <Text style={styles.bulletPoint}>• Facilitar o contato entre clientes e prestadores</Text>
        <Text style={styles.bulletPoint}>• Processar pagamentos de assinatura</Text>
        <Text style={styles.bulletPoint}>• Melhorar nossos serviços</Text>
        <Text style={styles.bulletPoint}>• Enviar comunicações importantes sobre o serviço</Text>

        <Text style={styles.sectionTitle}>4. Compartilhamento de Dados</Text>
        <Text style={styles.paragraph}>
          Suas informações de perfil público (nome, categoria, bairro, avaliações) são visíveis para outros usuários do aplicativo. Seu número de telefone é compartilhado apenas quando um cliente opta por entrar em contato via WhatsApp.
        </Text>
        <Text style={styles.paragraph}>
          Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.
        </Text>

        <Text style={styles.sectionTitle}>5. Armazenamento e Segurança</Text>
        <Text style={styles.paragraph}>
          Suas informações são armazenadas em servidores seguros. Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
        </Text>

        <Text style={styles.sectionTitle}>6. Seus Direitos</Text>
        <Text style={styles.paragraph}>
          De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:
        </Text>
        <Text style={styles.bulletPoint}>• Acessar seus dados pessoais</Text>
        <Text style={styles.bulletPoint}>• Corrigir dados incompletos ou desatualizados</Text>
        <Text style={styles.bulletPoint}>• Solicitar a exclusão de seus dados</Text>
        <Text style={styles.bulletPoint}>• Revogar seu consentimento</Text>
        <Text style={styles.bulletPoint}>• Solicitar a portabilidade dos dados</Text>

        <Text style={styles.sectionTitle}>7. Cookies e Tecnologias Similares</Text>
        <Text style={styles.paragraph}>
          Utilizamos tecnologias de armazenamento local para manter sua sessão ativa e melhorar sua experiência no aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>8. Menores de Idade</Text>
        <Text style={styles.paragraph}>
          O AchaServiço não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores de idade.
        </Text>

        <Text style={styles.sectionTitle}>9. Alterações nesta Política</Text>
        <Text style={styles.paragraph}>
          Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre quaisquer alterações significativas através do aplicativo ou por e-mail.
        </Text>

        <Text style={styles.sectionTitle}>10. Contato</Text>
        <Text style={styles.paragraph}>
          Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato conosco:
        </Text>
        <Text style={styles.contactInfo}>E-mail: contato@achaservico.com.br</Text>
        <Text style={styles.contactInfo}>Localização: Três Lagoas - MS, Brasil</Text>

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
  lastUpdate: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 24,
    marginLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#10B981',
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
