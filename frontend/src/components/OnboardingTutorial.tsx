import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  position: 'top' | 'center' | 'bottom';
  highlightArea?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao AchaServiço!',
    description: 'Vamos mostrar como usar o app para encontrar os melhores profissionais da sua região.',
    icon: 'hand-right',
    position: 'center',
  },
  {
    id: 'search',
    title: 'Busque Profissionais',
    description: 'Use a barra de busca para encontrar serviços ou profissionais pelo nome.',
    icon: 'search',
    position: 'top',
    highlightArea: { top: 100, left: 16, width: screenWidth - 32, height: 48 },
  },
  {
    id: 'filters',
    title: 'Filtre por Cidade e Bairro',
    description: 'Selecione sua cidade e bairro para ver apenas profissionais que atendem na sua região.',
    icon: 'location',
    position: 'top',
    highlightArea: { top: 160, left: 16, width: screenWidth - 32, height: 80 },
  },
  {
    id: 'categories',
    title: 'Escolha a Categoria',
    description: 'Filtre por tipo de serviço: eletricista, encanador, diarista e muito mais!',
    icon: 'apps',
    position: 'center',
  },
  {
    id: 'contact',
    title: 'Entre em Contato',
    description: 'Clique no botão verde para falar diretamente pelo WhatsApp e pedir seu orçamento.',
    icon: 'logo-whatsapp',
    position: 'center',
  },
  {
    id: 'favorite',
    title: 'Favorite Profissionais',
    description: 'Toque no coração para salvar seus profissionais favoritos e encontrá-los facilmente depois.',
    icon: 'heart',
    position: 'center',
  },
  {
    id: 'provider',
    title: 'É Prestador de Serviços?',
    description: 'Toque no botão da maleta no canto inferior direito para se cadastrar e receber clientes!',
    icon: 'briefcase',
    position: 'bottom',
    highlightArea: { top: screenHeight - 100, left: screenWidth - 80, width: 56, height: 56 },
  },
  {
    id: 'finish',
    title: 'Tudo Pronto!',
    description: 'Agora você está pronto para encontrar os melhores profissionais. Bom uso!',
    icon: 'checkmark-circle',
    position: 'center',
  },
];

const STORAGE_KEY = '@achaservico_tutorial_completed';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [visible, setVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      // Fade out then change step
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep(currentStep + 1);
      });
    }
  };

  const handleSkip = async () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      console.log('Error saving tutorial status:', error);
    }
    setVisible(false);
    onComplete();
  };

  const getTooltipStyle = () => {
    switch (step.position) {
      case 'top':
        return styles.tooltipTop;
      case 'bottom':
        return styles.tooltipBottom;
      default:
        return styles.tooltipCenter;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Highlight area if defined */}
        {step.highlightArea && (
          <View
            style={[
              styles.highlightBox,
              {
                top: step.highlightArea.top,
                left: step.highlightArea.left,
                width: step.highlightArea.width,
                height: step.highlightArea.height,
              },
            ]}
          />
        )}

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            getTooltipStyle(),
            { opacity: fadeAnim },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={step.icon as any} size={40} color="#10B981" />
          </View>

          {/* Content */}
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {TUTORIAL_STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                  index < currentStep && styles.dotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {!isFirstStep && !isLastStep && (
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Pular</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.nextButton, isLastStep && styles.finishButton]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Começar!' : isFirstStep ? 'Vamos lá!' : 'Próximo'}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
              )}
            </TouchableOpacity>
          </View>

          {/* Step counter */}
          <Text style={styles.stepCounter}>
            {currentStep + 1} de {TUTORIAL_STEPS.length}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Static method to check if tutorial was completed
export async function checkTutorialCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'true';
  } catch (error) {
    console.log('Error checking tutorial status:', error);
    return false;
  }
}

// Static method to reset tutorial (for testing)
export async function resetTutorial(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.log('Error resetting tutorial:', error);
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tooltip: {
    backgroundColor: '#1F1F1F',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98140',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipTop: {
    position: 'absolute',
    top: 260,
  },
  tooltipCenter: {
    // Default centered
  },
  tooltipBottom: {
    position: 'absolute',
    bottom: 180,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  dotActive: {
    backgroundColor: '#10B981',
    width: 24,
  },
  dotCompleted: {
    backgroundColor: '#10B98180',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#10B981',
  },
  finishButton: {
    paddingHorizontal: 32,
  },
  nextButtonText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '700',
  },
  stepCounter: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 12,
  },
});
