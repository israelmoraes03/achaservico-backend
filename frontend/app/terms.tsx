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

export default function TermsOfUseScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdate}>Última atualização: Março de 2026</Text>

        <View style={styles.highlight}>
          <Text style={styles.highlightText}>
            <Text style={styles.bold}>Resumo:</Text> O AchaServiço é uma plataforma que conecta usuários a prestadores de serviços. Não somos responsáveis pelos serviços prestados.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
        <Text style={styles.paragraph}>
          Ao acessar ou usar o AchaServiço, você concorda com estes Termos de Uso. Se não concordar, não utilize o aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>2. Descrição do Serviço</Text>
        <Text style={styles.paragraph}>
          O AchaServiço é uma plataforma gratuita que:
        </Text>
        <Text style={styles.bulletPoint}>• Conecta usuários que precisam de serviços a prestadores locais</Text>
        <Text style={styles.bulletPoint}>• Permite que prestadores divulguem seus serviços</Text>
        <Text style={styles.bulletPoint}>• Facilita o contato direto via WhatsApp</Text>
        <Text style={styles.bulletPoint}>• Possibilita avaliações de prestadores</Text>

        <Text style={styles.sectionTitle}>3. Cadastro e Conta</Text>
        <Text style={styles.paragraph}>
          Para utilizar o AchaServiço:
        </Text>
        <Text style={styles.bulletPoint}>• Você deve ter pelo menos 18 anos</Text>
        <Text style={styles.bulletPoint}>• O cadastro é feito via conta Google</Text>
        <Text style={styles.bulletPoint}>• Você é responsável por manter suas credenciais seguras</Text>
        <Text style={styles.bulletPoint}>• As informações fornecidas devem ser verdadeiras e atualizadas</Text>

        <Text style={styles.sectionTitle}>4. Regras para Prestadores</Text>
        <Text style={styles.paragraph}>
          Prestadores cadastrados devem:
        </Text>
        <Text style={styles.bulletPoint}>• Fornecer informações verdadeiras sobre seus serviços</Text>
        <Text style={styles.bulletPoint}>• Manter telefone de contato atualizado</Text>
        <Text style={styles.bulletPoint}>• Não publicar conteúdo ofensivo, ilegal ou enganoso</Text>
        <Text style={styles.bulletPoint}>• Respeitar os usuários e responder de forma profissional</Text>
        <Text style={styles.bulletPoint}>• Usar apenas fotos próprias ou com direitos de uso</Text>

        <Text style={styles.sectionTitle}>5. Regras para Usuários</Text>
        <Text style={styles.paragraph}>
          Usuários do AchaServiço devem:
        </Text>
        <Text style={styles.bulletPoint}>• Usar o aplicativo de forma respeitosa</Text>
        <Text style={styles.bulletPoint}>• Fazer avaliações honestas e construtivas</Text>
        <Text style={styles.bulletPoint}>• Não usar linguagem ofensiva ou discriminatória</Text>
        <Text style={styles.bulletPoint}>• Não tentar fraudar ou manipular o sistema</Text>

        <View style={styles.warning}>
          <Text style={styles.warningSectionTitle}>6. Isenção de Responsabilidade</Text>
          <Text style={styles.warningText}>
            <Text style={styles.bold}>IMPORTANTE:</Text> O AchaServiço é apenas uma plataforma de conexão.
          </Text>
          <Text style={styles.warningBullet}>• Não somos parte dos contratos entre usuários e prestadores</Text>
          <Text style={styles.warningBullet}>• Não garantimos a qualidade dos serviços prestados</Text>
          <Text style={styles.warningBullet}>• Não nos responsabilizamos por danos decorrentes dos serviços contratados</Text>
          <Text style={styles.warningBullet}>• A negociação de preços e condições é feita diretamente entre as partes</Text>
        </View>

        <Text style={styles.sectionTitle}>7. Avaliações</Text>
        <Text style={styles.paragraph}>
          O sistema de avaliações:
        </Text>
        <Text style={styles.bulletPoint}>• É anônimo para proteger os usuários</Text>
        <Text style={styles.bulletPoint}>• Requer contato prévio com o prestador via WhatsApp</Text>
        <Text style={styles.bulletPoint}>• Deve refletir experiências reais</Text>
        <Text style={styles.bulletPoint}>• Pode ser removido se violar nossas diretrizes</Text>

        <Text style={styles.sectionTitle}>8. Propriedade Intelectual</Text>
        <Text style={styles.paragraph}>
          Todo o conteúdo do AchaServiço (logotipos, design, código) é de propriedade da desenvolvedora. É proibida a reprodução sem autorização.
        </Text>

        <Text style={styles.sectionTitle}>9. Suspensão e Encerramento</Text>
        <Text style={styles.paragraph}>
          Reservamo-nos o direito de suspender ou encerrar contas que:
        </Text>
        <Text style={styles.bulletPoint}>• Violem estes termos</Text>
        <Text style={styles.bulletPoint}>• Publiquem conteúdo inadequado</Text>
        <Text style={styles.bulletPoint}>• Prejudiquem outros usuários ou a plataforma</Text>

        <Text style={styles.sectionTitle}>10. Planos e Preços</Text>
        <Text style={styles.paragraph}>
          O AchaServiço é atualmente gratuito para todos os usuários. Reservamo-nos o direito de, no futuro, introduzir planos pagos com recursos adicionais para prestadores de serviços.
        </Text>
        <Text style={styles.paragraph}>
          Qualquer alteração nos preços ou introdução de cobranças será comunicada com antecedência mínima de 30 dias através do aplicativo e/ou e-mail cadastrado. O uso continuado após as alterações implica aceitação dos novos termos.
        </Text>

        <Text style={styles.sectionTitle}>11. Alterações nos Termos</Text>
        <Text style={styles.paragraph}>
          Podemos modificar estes termos a qualquer momento. Mudanças significativas serão comunicadas pelo aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>12. Lei Aplicável</Text>
        <Text style={styles.paragraph}>
          Estes termos são regidos pelas leis da República Federativa do Brasil.
        </Text>

        <Text style={styles.sectionTitle}>13. Contato</Text>
        <Text style={styles.paragraph}>
          Para dúvidas sobre estes termos:
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
  warning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginVertical: 16,
  },
  warningSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#FCA5A5',
    lineHeight: 22,
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 14,
    color: '#FCA5A5',
    lineHeight: 24,
    marginLeft: 8,
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
