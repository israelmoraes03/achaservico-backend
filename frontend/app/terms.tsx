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

export default function TermsScreen() {
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
        <Text style={styles.lastUpdate}>Última atualização: Janeiro de 2025</Text>

        <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
        <Text style={styles.paragraph}>
          Ao usar o aplicativo AchaServiço, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize o aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>2. Descrição do Serviço</Text>
        <Text style={styles.paragraph}>
          O AchaServiço é uma plataforma que conecta clientes a prestadores de serviços locais em Três Lagoas - MS. O aplicativo permite que:
        </Text>
        <Text style={styles.bulletPoint}>• Clientes encontrem e entrem em contato com prestadores de serviços</Text>
        <Text style={styles.bulletPoint}>• Prestadores divulguem seus serviços mediante assinatura mensal</Text>

        <Text style={styles.sectionTitle}>3. Tipos de Usuários</Text>
        <Text style={styles.subTitle}>3.1 Clientes</Text>
        <Text style={styles.paragraph}>
          Clientes podem usar o aplicativo gratuitamente para buscar e entrar em contato com prestadores de serviços. O cadastro não é obrigatório para visualizar perfis.
        </Text>
        <Text style={styles.subTitle}>3.2 Prestadores de Serviço</Text>
        <Text style={styles.paragraph}>
          Prestadores pagam uma assinatura mensal de R$ 15,00 para manter seus perfis ativos e visíveis para clientes. A assinatura pode ser cancelada a qualquer momento.
        </Text>

        <Text style={styles.sectionTitle}>4. Cadastro e Conta</Text>
        <Text style={styles.paragraph}>
          Ao criar uma conta, você se compromete a:
        </Text>
        <Text style={styles.bulletPoint}>• Fornecer informações verdadeiras e atualizadas</Text>
        <Text style={styles.bulletPoint}>• Manter a segurança de sua conta</Text>
        <Text style={styles.bulletPoint}>• Não compartilhar suas credenciais de acesso</Text>
        <Text style={styles.bulletPoint}>• Notificar-nos sobre qualquer uso não autorizado</Text>

        <Text style={styles.sectionTitle}>5. Pagamentos e Assinaturas</Text>
        <Text style={styles.paragraph}>
          A assinatura para prestadores custa R$ 15,00 por mês. O pagamento é realizado via PIX. A assinatura é válida por 30 dias a partir da data de ativação.
        </Text>
        <Text style={styles.paragraph}>
          Em caso de não renovação, o perfil do prestador ficará inativo e não será exibido para clientes.
        </Text>

        <Text style={styles.sectionTitle}>6. Responsabilidades do Usuário</Text>
        <Text style={styles.paragraph}>
          Os usuários são responsáveis por:
        </Text>
        <Text style={styles.bulletPoint}>• Negociar diretamente os termos dos serviços</Text>
        <Text style={styles.bulletPoint}>• Verificar a qualidade dos serviços contratados</Text>
        <Text style={styles.bulletPoint}>• Realizar avaliações honestas e construtivas</Text>
        <Text style={styles.bulletPoint}>• Não usar o aplicativo para fins ilegais</Text>

        <Text style={styles.sectionTitle}>7. Limitação de Responsabilidade</Text>
        <Text style={styles.paragraph}>
          O AchaServiço é apenas uma plataforma de conexão. Não somos responsáveis por:
        </Text>
        <Text style={styles.bulletPoint}>• Qualidade dos serviços prestados</Text>
        <Text style={styles.bulletPoint}>• Acordos entre clientes e prestadores</Text>
        <Text style={styles.bulletPoint}>• Danos resultantes de serviços contratados</Text>
        <Text style={styles.bulletPoint}>• Condutas de terceiros na plataforma</Text>

        <Text style={styles.sectionTitle}>8. Avaliações e Comentários</Text>
        <Text style={styles.paragraph}>
          Os usuários podem avaliar prestadores com notas de 1 a 5 estrelas e deixar comentários opcionais. Avaliações falsas, ofensivas ou spam podem ser removidas.
        </Text>

        <Text style={styles.sectionTitle}>9. Suspensão de Contas</Text>
        <Text style={styles.paragraph}>
          Reservamo-nos o direito de suspender ou encerrar contas que:
        </Text>
        <Text style={styles.bulletPoint}>• Violem estes Termos de Uso</Text>
        <Text style={styles.bulletPoint}>• Forneçam informações falsas</Text>
        <Text style={styles.bulletPoint}>• Sejam denunciadas por condutas inadequadas</Text>
        <Text style={styles.bulletPoint}>• Não paguem a assinatura (prestadores)</Text>

        <Text style={styles.sectionTitle}>10. Propriedade Intelectual</Text>
        <Text style={styles.paragraph}>
          Todo o conteúdo do aplicativo, incluindo design, logotipos e funcionalidades, é propriedade do AchaServiço e está protegido por leis de propriedade intelectual.
        </Text>

        <Text style={styles.sectionTitle}>11. Alterações nos Termos</Text>
        <Text style={styles.paragraph}>
          Podemos modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas através do aplicativo. O uso contínuo após alterações constitui aceitação dos novos termos.
        </Text>

        <Text style={styles.sectionTitle}>12. Lei Aplicável</Text>
        <Text style={styles.paragraph}>
          Estes Termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca de Três Lagoas - MS.
        </Text>

        <Text style={styles.sectionTitle}>13. Contato</Text>
        <Text style={styles.paragraph}>
          Para dúvidas sobre estes Termos de Uso:
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
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
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
