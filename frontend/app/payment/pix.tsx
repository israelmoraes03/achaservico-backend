import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';

export default function PaymentPixScreen() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // PIX data is static - no need to create subscription on page load
  const pixData = {
    pix_key: '49958688875',
    pix_key_formatted: '499.586.888-75',
    amount: 15.0,
  };

  const confirmPayment = async () => {
    try {
      setIsLoading(true);
      // Only now create the subscription as pending
      await api.post('/subscriptions/create');
      setPaymentConfirmed(true);
      await refreshUser();
    } catch (error: any) {
      console.error('Subscription error:', error);
      const message = error.response?.data?.detail || 
        error.message === 'Network Error' 
          ? 'Erro de conexão. Verifique sua internet e tente novamente.' 
          : 'Erro ao confirmar pagamento';
      Alert.alert('Erro', message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixKey = async () => {
    if (pixData?.pix_key) {
      await Clipboard.setStringAsync(pixData.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const sharePixKey = async () => {
    try {
      const result = await Share.share({
        message: `PIX para Assinatura AchaServiço\n\nChave PIX (CPF): ${pixData.pix_key_formatted}\nValor: R$ ${pixData.amount.toFixed(2)}\n\nApós o pagamento, sua assinatura será ativada em até 24 horas.`,
      });
      
      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error: any) {
      // Ignore user cancellation
      if (error.message !== 'User did not share') {
        console.error('Share error:', error);
        Alert.alert('Erro', 'Não foi possível compartilhar. Tente copiar a chave PIX.');
      }
    }
  };

  const handleConfirmPayment = () => {
    Alert.alert(
      'Confirmar Pagamento PIX',
      'Você confirma que já realizou o PIX de R$ 15,00 para a chave informada?\n\nSua assinatura ficará pendente até a confirmação do pagamento.',
      [
        { text: 'Ainda não paguei', style: 'cancel' },
        {
          text: 'Sim, já paguei!',
          onPress: confirmPayment
        },
      ]
    );
  };

  // Show success screen after confirmation
  if (paymentConfirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Pagamento Confirmado!</Text>
          <Text style={styles.successText}>
            Sua assinatura está pendente e será ativada assim que confirmarmos o recebimento do PIX.
          </Text>
          <Text style={styles.successSubtext}>
            Prazo: até 24 horas úteis
          </Text>
          <TouchableOpacity 
            style={styles.successButton} 
            onPress={() => router.replace('/provider/dashboard')}
          >
            <Text style={styles.successButtonText}>Ir para Meu Painel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento PIX</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* Amount */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor da Assinatura</Text>
          <Text style={styles.amountValue}>R$ 15,00</Text>
          <Text style={styles.amountPeriod}>por mês</Text>
        </View>

        {/* PIX Key */}
        <View style={styles.pixCard}>
          <View style={styles.pixHeader}>
            <Ionicons name="qr-code" size={24} color="#10B981" />
            <Text style={styles.pixTitle}>Chave PIX (CPF)</Text>
          </View>
          
          <Text style={styles.pixKey}>{pixData?.pix_key_formatted || '499.586.888-75'}</Text>
          
          <View style={styles.pixActions}>
            <TouchableOpacity style={styles.copyButton} onPress={copyPixKey}>
              <Ionicons name={copied ? "checkmark" : "copy"} size={20} color="#10B981" />
              <Text style={styles.copyButtonText}>{copied ? 'Copiado!' : 'Copiar'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.shareButton} onPress={sharePixKey}>
              <Ionicons name="share-social" size={20} color="#10B981" />
              <Text style={styles.shareButtonText}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Como pagar:</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
            <Text style={styles.stepText}>Abra o app do seu banco</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
            <Text style={styles.stepText}>Vá em PIX → Pagar com chave</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
            <Text style={styles.stepText}>Cole a chave PIX acima</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
            <Text style={styles.stepText}>Confirme o valor de R$ 15,00</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.infoText}>
            Após o pagamento, sua assinatura será ativada em até 24 horas.
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.doneButton} onPress={handlePaymentDone}>
          <Ionicons name="checkmark-circle" size={20} color="#0A0A0A" />
          <Text style={styles.doneButtonText}>Já fiz o PIX</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 14,
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
  amountCard: {
    backgroundColor: '#10B98120',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  amountLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  amountValue: {
    color: '#10B981',
    fontSize: 36,
    fontWeight: 'bold',
  },
  amountPeriod: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  pixCard: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  pixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pixTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pixKey: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  pixActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  shareButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
  },
  instructions: {
    marginBottom: 20,
  },
  instructionsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#9CA3AF',
    fontSize: 14,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F59E0B20',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 18,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  doneButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
