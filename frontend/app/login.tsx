import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={48} color="#10B981" />
          </View>
          <Text style={styles.logoText}>AchaServiço</Text>
          <Text style={styles.tagline}>Encontre profissionais de confiança</Text>
          <Text style={styles.city}>Três Lagoas - MS</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="search" size={24} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Busque Profissionais</Text>
              <Text style={styles.featureDescription}>Por categoria ou bairro</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="logo-whatsapp" size={24} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Contato Direto</Text>
              <Text style={styles.featureDescription}>Chame pelo WhatsApp</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="star" size={24} color="#10B981" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Avaliações</Text>
              <Text style={styles.featureDescription}>Veja a opinião de outros clientes</Text>
            </View>
          </View>
        </View>

        {/* Login Button */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={login}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                <Text style={styles.googleButtonText}>Entrar com Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={styles.skipText}>Continuar sem login</Text>
          </TouchableOpacity>
        </View>

        {/* Provider CTA */}
        <View style={styles.providerCTA}>
          <Text style={styles.providerText}>É prestador de serviço?</Text>
          <TouchableOpacity onPress={login}>
            <Text style={styles.providerLink}>Cadastre-se por R$ 15/mês</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  city: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
  },
  providerCTA: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
  providerText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 4,
  },
  providerLink: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
});
