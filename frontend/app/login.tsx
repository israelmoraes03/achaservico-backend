import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo with Glow Effect */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow}>
            <View style={styles.logoCircle}>
              <Ionicons name="construct" size={56} color="#10B981" />
            </View>
          </View>
          <Text style={styles.logoText}>AchaServiço</Text>
          <Text style={styles.tagline}>Encontre profissionais confiáveis{'\n'}perto de você</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.features}>
          <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="search" size={28} color="#10B981" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Buscar Profissionais</Text>
              <Text style={styles.featureDescription}>Encontre por categoria ou bairro</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="logo-whatsapp" size={28} color="#10B981" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Contato Direto</Text>
              <Text style={styles.featureDescription}>Fale pelo WhatsApp rapidamente</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.8}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="star" size={28} color="#10B981" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Avaliações Reais</Text>
              <Text style={styles.featureDescription}>Veja opiniões de clientes</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Google Login Button with Gradient */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.googleButtonWrapper}
            onPress={login}
            disabled={isLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.googleButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.googleIconWrapper}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Entrar com Google</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Provider CTA */}
        <View style={styles.providerCTA}>
          <Text style={styles.providerText}>É prestador de serviço?</Text>
          <TouchableOpacity 
            style={styles.providerButton}
            onPress={login}
            activeOpacity={0.8}
          >
            <Text style={styles.providerButtonText}>Cadastrar meu serviço</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>+200</Text>
            <Text style={styles.statLabel}>Profissionais</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>+1.200</Text>
            <Text style={styles.statLabel}>Clientes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.8</Text>
            <View style={styles.statStars}>
              <Ionicons name="star" size={14} color="#FFD700" />
            </View>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#0D3D2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#10B981',
  },
  logoText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginBottom: 28,
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0D3D2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginSection: {
    marginBottom: 24,
  },
  googleButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A0A0A',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 24,
  },
  providerCTA: {
    alignItems: 'center',
    marginBottom: 32,
  },
  providerText: {
    color: '#9CA3AF',
    fontSize: 15,
    marginBottom: 12,
  },
  providerButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
  },
  providerButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statStars: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2A2A2A',
  },
});
