import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { formatFoodName } from '@/utils/formatFood';
import { runFadeDownExit, useFadeUpMotion } from '@/src/lib/motion';

type VerdictType = 'SAFE' | 'TOXIC' | 'VET FIRST';

interface VerdictData {
  verdict: VerdictType;
  color: string;
  explanation: string;
  action: string;
}

export default function VerdictScreen() {
  const params = useLocalSearchParams<{
    food: string;
    verdict: string;
    explanation: string;
    action: string;
    color: string;
    provenance?: string;
    confidenceLabel?: string;
    matchedIngredients?: string;
    matchedHazards?: string;
  }>();
  const insets = useSafeAreaInsets();
  const screenMotion = useFadeUpMotion();
  const isLeavingRef = React.useRef(false);

  const formattedFood = formatFoodName(params.food || '');
  const verdictData: VerdictData = {
    verdict: (params.verdict as VerdictType) || 'VET FIRST',
    color: params.color || Colors.vetFirst,
    explanation: params.explanation || 'Safety can vary by preparation or portion size.',
    action: params.action || 'When unsure, contact your vet first.',
  };
  const provenance = params.provenance ?? '';
  const confidenceLabel = params.confidenceLabel ?? 'Unknown, check with vet';
  const matchedIngredients: string[] = (() => {
    try {
      if (typeof params.matchedIngredients === 'string' && params.matchedIngredients) {
        const parsed = JSON.parse(params.matchedIngredients) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      }
    } catch {
      // ignore
    }
    return [];
  })();
  const matchedHazards: string[] = (() => {
    try {
      if (typeof params.matchedHazards === 'string' && params.matchedHazards) {
        const parsed = JSON.parse(params.matchedHazards) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      }
    } catch {
      // ignore
    }
    return [];
  })();
  // provenance, matchedIngredients, matchedHazards available for future UI

  const handleBack = () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    runFadeDownExit({
      opacity: screenMotion.opacity,
      translateY: screenMotion.translateY,
      durationMs: 160,
      onDone: () => {
        router.back();
      },
    });
  };

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top + 16 }, screenMotion.animatedStyle]}
    >
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        activeOpacity={0.7}
        testID="back-button"
      >
        <Text style={styles.backText}>← Check another food</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.verdict, { color: verdictData.color }]}>
          {verdictData.verdict}
        </Text>
        <Text style={styles.confidenceLabel}>{confidenceLabel}</Text>

        <Text style={styles.foodName}>{formattedFood}</Text>

        <Text style={styles.explanation}>{verdictData.explanation}</Text>

        <Text style={styles.action}>{verdictData.action}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.footerText}>{confidenceLabel}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '400',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  verdict: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textMuted,
    marginBottom: 16,
    textAlign: 'center',
  },
  foodName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  explanation: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  action: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
