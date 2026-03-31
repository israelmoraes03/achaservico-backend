import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, Rect, Mask, Circle } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

// ── Tutorial Steps ──────────────────────────────────────────────
interface SpotlightStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Spotlight target area (relative to screen)
  spotlight?: {
    x: number;      // center X
    y: number;      // center Y
    radiusX: number; // horizontal radius
    radiusY: number; // vertical radius
    shape: 'circle' | 'rect';
    rx?: number; // border radius for rect
  };
  // Where the tooltip should appear relative to spotlight
  tooltipPosition: 'above' | 'below' | 'center';
}

const STEPS: SpotlightStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AchaServiço! 👋',
    description: 'Encontre os melhores profissionais da sua região em poucos toques.',
    icon: 'sparkles',
    tooltipPosition: 'center',
  },
  {
    id: 'search',
    title: 'Busque Profissionais',
    description: 'Digite o nome ou serviço que procura aqui.',
    icon: 'search',
    spotlight: {
      x: SCREEN_W / 2,
      y: STATUS_BAR_H + 120,
      radiusX: SCREEN_W / 2 - 12,
      radiusY: 28,
      shape: 'rect',
      rx: 14,
    },
    tooltipPosition: 'below',
  },
  {
    id: 'filters',
    title: 'Filtre por Região',
    description: 'Selecione cidade, bairro e categoria para resultados mais precisos.',
    icon: 'options',
    spotlight: {
      x: SCREEN_W / 2,
      y: STATUS_BAR_H + 185,
      radiusX: SCREEN_W / 2 - 12,
      radiusY: 48,
      shape: 'rect',
      rx: 12,
    },
    tooltipPosition: 'below',
  },
  {
    id: 'provider',
    title: 'Toque no Profissional',
    description: 'Veja fotos, avaliações e entre em contato pelo WhatsApp.',
    icon: 'person',
    spotlight: {
      x: SCREEN_W / 2,
      y: STATUS_BAR_H + 380,
      radiusX: SCREEN_W / 2 - 12,
      radiusY: 70,
      shape: 'rect',
      rx: 16,
    },
    tooltipPosition: 'above',
  },
  {
    id: 'ready',
    title: 'Tudo Pronto! 🎉',
    description: 'Agora é só buscar, contatar e avaliar. Bom uso!',
    icon: 'checkmark-circle',
    tooltipPosition: 'center',
  },
];

// ── Storage ─────────────────────────────────────────────────────
const STORAGE_KEY = '@achaservico_tutorial_completed';

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
  } catch {}
}

// ── Component ───────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const current = STEPS[step];
  const total = STEPS.length;

  // Fade in on step change
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Pulse animation for spotlight
  useEffect(() => {
    if (!current.spotlight) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [step]);

  const goNext = () => {
    if (step >= total - 1) {
      finish();
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setStep(s => s + 1));
  };

  const goBack = () => {
    if (step <= 0) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setStep(s => s - 1));
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    onComplete();
  };

  // ── Render spotlight overlay with SVG mask ──
  const renderOverlay = () => {
    const sp = current.spotlight;
    return (
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="spotlight-mask" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
            {/* White = visible (dark overlay), Black = hidden (spotlight hole) */}
            <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="white" />
            {sp && sp.shape === 'circle' ? (
              <Circle cx={sp.x} cy={sp.y} r={sp.radiusX} fill="black" />
            ) : sp ? (
              <Rect
                x={sp.x - sp.radiusX}
                y={sp.y - sp.radiusY}
                width={sp.radiusX * 2}
                height={sp.radiusY * 2}
                rx={sp.rx || 12}
                ry={sp.rx || 12}
                fill="black"
              />
            ) : null}
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={SCREEN_W}
          height={SCREEN_H}
          fill="rgba(0,0,0,0.88)"
          mask="url(#spotlight-mask)"
        />
      </Svg>
    );
  };

  // ── Spotlight glow ring ──
  const renderGlow = () => {
    const sp = current.spotlight;
    if (!sp) return null;

    if (sp.shape === 'rect') {
      return (
        <Animated.View
          style={[
            styles.glowRect,
            {
              top: sp.y - sp.radiusY - 4,
              left: sp.x - sp.radiusX - 4,
              width: sp.radiusX * 2 + 8,
              height: sp.radiusY * 2 + 8,
              borderRadius: (sp.rx || 12) + 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      );
    }
    return (
      <Animated.View
        style={[
          styles.glowCircle,
          {
            top: sp.y - sp.radiusX - 4,
            left: sp.x - sp.radiusX - 4,
            width: sp.radiusX * 2 + 8,
            height: sp.radiusX * 2 + 8,
            borderRadius: sp.radiusX + 4,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    );
  };

  // ── Tooltip position ──
  const getTooltipPosition = (): object => {
    const sp = current.spotlight;
    if (!sp || current.tooltipPosition === 'center') {
      return { top: SCREEN_H / 2 - 120, left: 24, right: 24 };
    }
    if (current.tooltipPosition === 'below') {
      return { top: sp.y + sp.radiusY + 24, left: 24, right: 24 };
    }
    // above
    return { bottom: SCREEN_H - (sp.y - sp.radiusY) + 24, left: 24, right: 24 };
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        {/* Dark overlay with spotlight hole */}
        {renderOverlay()}

        {/* Pulsing glow border */}
        {renderGlow()}

        {/* Tooltip card */}
        <Animated.View
          style={[
            styles.tooltip,
            getTooltipPosition(),
            { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
          ]}
        >
          {/* Icon badge */}
          <View style={styles.iconBadge}>
            <Ionicons name={current.icon as any} size={28} color="#10B981" />
          </View>

          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.desc}>{current.description}</Text>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === step && styles.progressDotActive,
                  i < step && styles.progressDotDone,
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            {step > 0 && step < total - 1 && (
              <TouchableOpacity style={styles.btnBack} onPress={goBack}>
                <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
                <Text style={styles.btnBackText}>Voltar</Text>
              </TouchableOpacity>
            )}
            
            {step === 0 && (
              <TouchableOpacity style={styles.btnSkip} onPress={finish}>
                <Text style={styles.btnSkipText}>Pular tutorial</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btnNext, step >= total - 1 && styles.btnFinish]}
              onPress={goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.btnNextText}>
                {step === 0 ? 'Vamos lá!' : step >= total - 1 ? 'Começar!' : 'Próximo'}
              </Text>
              {step < total - 1 && (
                <Ionicons name="chevron-forward" size={18} color="#0A0A0A" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tap anywhere hint (for non-first steps) */}
        {step > 0 && step < total - 1 && (
          <TouchableWithoutFeedback onPress={goNext}>
            <View style={styles.tapZone} />
          </TouchableWithoutFeedback>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Glow ring around spotlight
  glowRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  glowCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  // Tooltip
  tooltip: {
    position: 'absolute',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98130',
    zIndex: 10,
    // shadow
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B98118',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  desc: {
    fontSize: 14.5,
    color: '#B0B8C8',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  // Progress dots
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A3E',
  },
  progressDotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  progressDotDone: {
    backgroundColor: '#10B98160',
  },
  // Buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#2A2A3E',
    gap: 2,
  },
  btnBackText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSkip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  btnSkipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  btnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 180,
  },
  btnFinish: {
    backgroundColor: '#10B981',
    paddingHorizontal: 28,
    maxWidth: 200,
  },
  btnNextText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
