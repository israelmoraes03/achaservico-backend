import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Tutorial Steps ──────────────────────────────────────────────
interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgGradient: string;
}

const STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AchaServiço! 👋',
    description: 'Encontre os melhores profissionais da sua região em poucos toques.',
    icon: 'sparkles',
    iconColor: '#10B981',
    bgGradient: '#10B981',
  },
  {
    id: 'search',
    title: '🔍 Busque Profissionais',
    description: 'Use a barra de busca para encontrar por nome ou tipo de serviço. Rápido e fácil!',
    icon: 'search',
    iconColor: '#3B82F6',
    bgGradient: '#3B82F6',
  },
  {
    id: 'filters',
    title: '📍 Filtre por Região',
    description: 'Selecione sua cidade, bairro e categoria para resultados mais precisos na sua área.',
    icon: 'options',
    iconColor: '#8B5CF6',
    bgGradient: '#8B5CF6',
  },
  {
    id: 'contact',
    title: '📱 Contate pelo WhatsApp',
    description: 'Encontrou o profissional ideal? Toque no perfil e fale diretamente pelo WhatsApp!',
    icon: 'logo-whatsapp',
    iconColor: '#22C55E',
    bgGradient: '#22C55E',
  },
  {
    id: 'ready',
    title: 'Tudo Pronto! 🎉',
    description: 'Agora é só buscar, contatar e avaliar. Bom uso do AchaServiço!',
    icon: 'checkmark-circle',
    iconColor: '#F59E0B',
    bgGradient: '#F59E0B',
  },
];

// ── Storage ─────────────────────────────────────────────────────
const STORAGE_KEY = '@achaservico_tutorial_v2';

export async function checkTutorialCompleted(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    // Also remove old key
    await AsyncStorage.removeItem('@achaservico_tutorial_completed');
  } catch {}
}

// ── Component ───────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const current = STEPS[step];
  const total = STEPS.length;

  // Animate in on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.85);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const goNext = () => {
    if (step >= total - 1) {
      finish();
      return;
    }
    animateOut(() => setStep(s => s + 1));
  };

  const goBack = () => {
    if (step <= 0) return;
    animateOut(() => setStep(s => s - 1));
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    onComplete();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Colored accent line at top */}
          <View style={[styles.accentLine, { backgroundColor: current.bgGradient }]} />

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: current.iconColor + '18', borderColor: current.iconColor + '40' }]}>
            <Ionicons name={current.icon as any} size={36} color={current.iconColor} />
          </View>

          {/* Content */}
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.description}>{current.description}</Text>

          {/* Step indicator */}
          <View style={styles.stepsRow}>
            <Text style={styles.stepCounter}>{step + 1} de {total}</Text>
            <View style={styles.dotsRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === step && [styles.dotActive, { backgroundColor: current.iconColor }],
                    i < step && styles.dotDone,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            {step === 0 ? (
              <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.7}>
                <Text style={styles.skipText}>Pular</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
                <Text style={styles.backText}>Voltar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: current.iconColor }]}
              onPress={goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>
                {step === 0 ? 'Vamos lá!' : step >= total - 1 ? '🚀 Começar!' : 'Próximo'}
              </Text>
              {step < total - 1 && step > 0 && (
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    paddingTop: 0,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  accentLine: {
    width: '100%',
    height: 4,
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    color: '#B0B8C8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepCounter: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A3E',
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: '#4B5563',
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#2A2A3E',
    gap: 2,
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
