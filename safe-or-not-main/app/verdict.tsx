import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { formatFoodName } from '@/utils/formatFood';

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
  }>();
  const insets = useSafeAreaInsets();

  const formattedFood = formatFoodName(params.food || '');
  const verdictData: VerdictData = {
    verdict: (params.verdict as VerdictType) || 'VET FIRST',
    color: params.color || Colors.vetFirst,
    explanation: params.explanation || 'Safety information for this food is unclear or varies by preparation.',
    action: params.action || 'Contact your vet before feeding.',
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        testID="back-button"
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.verdict, { color: verdictData.color }]}>
          {verdictData.verdict}
        </Text>

        <Text style={styles.foodName}>{formattedFood}</Text>

        <Text style={styles.explanation}>{verdictData.explanation}</Text>

        <Text style={styles.action}>{verdictData.action}</Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.footerText}>Based on veterinary safety sources</Text>
      </View>
    </View>
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
