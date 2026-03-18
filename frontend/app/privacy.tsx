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
        <Text style={styles.lastUpdate}>Última atualização: Março de 2026</Text>

        <View style={styles.highlight}>
          <Text style={styles.highlightText}>
            <Text style={styles.bold}>Resumo:</Text> O AchaServiço coleta apenas as informações necessárias para conectar você a prestadores de serviços. Não vendemos seus dados.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>1. Informações que Coletamos</Text>
        <Text style={styles.paragraph}>
          Ao utilizar o AchaServiço, podemos coletar:
        </Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Dados de cadastro:</Text> Nome, e-mail e foto de perfil (via login Google)</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Dados de prestadores:</Text> Nome, telefone/WhatsApp, descrição dos serviços, fotos dos trabalhos, cidade e bairros de atuação</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Dados de uso:</Text> Avaliações, favoritos e histórico de contatos</Text>

        <Text style={styles.sectionTitle}>2. Como Usamos suas Informações</Text>
        <Text style={styles.paragraph}>
          Utilizamos seus dados para:
        </Text>
        <Text style={styles.bulletPoint}>• Permitir o cadastro e login no aplicativo</Text>
        <Text style={styles.bulletPoint}>• Exibir perfis de prestadores para usuários que buscam serviços</Text>
        <Text style={styles.bulletPoint}>• Facilitar o contato entre usuários e prestadores via WhatsApp</Text>
        <Text style={styles.bulletPoint}>• Enviar notificações sobre favoritos e comunicados importantes</Text>
        <Text style={styles.bulletPoint}>• Melhorar nossos serviços e experiência do usuário</Text>

        <Text style={styles.sectionTitle}>3. Compartilhamento de Dados</Text>
        <Text style={styles.paragraph}>
          Seus dados podem ser compartilhados:
        </Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Com outros usuários:</Text> Informações públicas do perfil de prestadores são visíveis para quem busca serviços</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Com serviços de terceiros:</Text> Google (autenticação), Cloudinary (armazenamento de imagens), Expo (notificações push)</Text>
        <Text style={[styles.paragraph, styles.bold]}>
          Não vendemos, alugamos ou comercializamos seus dados pessoais.
        </Text>

        <Text style={styles.sectionTitle}>4. Armazenamento e Segurança</Text>
        <Text style={styles.paragraph}>
          Seus dados são armazenados em servidores seguros com criptografia. Utilizamos práticas de segurança padrão da indústria para proteger suas informações.
        </Text>

        <Text style={styles.sectionTitle}>5. Seus Direitos</Text>
        <Text style={styles.paragraph}>
          Você tem direito a:
        </Text>
        <Text style={styles.bulletPoint}>• Acessar seus dados pessoais</Text>
        <Text style={styles.bulletPoint}>• Corrigir informações incorretas</Text>
        <Text style={styles.bulletPoint}>• Solicitar a exclusão da sua conta e dados</Text>
        <Text style={styles.bulletPoint}>• Revogar consentimento para uso dos dados</Text>
        <Text style={styles.paragraph}>
          Para exercer esses direitos, entre em contato conosco.
        </Text>

        <Text style={styles.sectionTitle}>6. Cookies e Tecnologias</Text>
        <Text style={styles.paragraph}>
          O aplicativo pode utilizar tecnologias de armazenamento local para manter sua sessão ativa e preferências salvas.
        </Text>

        <Text style={styles.sectionTitle}>7. Menores de Idade</Text>
        <Text style={styles.paragraph}>
          O AchaServiço não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores.
        </Text>

        <Text style={styles.sectionTitle}>8. Alterações nesta Política</Text>
        <Text style={styles.paragraph}>
          Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas através do aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>9. Contato</Text>
        <Text style={styles.paragraph}>
          Para dúvidas sobre privacidade:
        </Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>E-mail:</Text> contato.achaservico@gmail.com</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Desenvolvedor:</Text> Sara Gomes da Silva</Text>
        <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Localização:</Text> Três Lagoas - MS, Brasil</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 AchaServiço. Todos os direitos reservados.</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
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
    paddingHorizontal: 20,
  },
  lastUpdate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 20,
  },
  highlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    marginBottom: 24,
  },
  highlightText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 24,
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
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
