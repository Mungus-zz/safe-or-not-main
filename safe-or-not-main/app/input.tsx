import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { Radii, Shadows } from '@/constants/theme';
import {
  addCheckEntry,
  clearCheckHistory,
  getCheckHistory,
  type CheckHistoryEntry,
} from '@/src/lib/checkHistory';
import { normalizeUserInputForCompare } from '@/src/lib/decomposeFood';
import { useFadeUpMotion } from '@/src/lib/motion';
import { smartFoodLookup } from '@/src/lib/smartFoodLookup';

export default function InputScreen() {
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<CheckHistoryEntry[]>([]);
  const insets = useSafeAreaInsets();
  const screenMotion = useFadeUpMotion();

  const isButtonDisabled = !foodInput.trim();
  const isCheckDisabled = isButtonDisabled || isLoading;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCheckHistory().then((entries) => {
        if (active) setHistory(entries);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const navigateToVerdict = (lookupResult: Awaited<ReturnType<typeof smartFoodLookup>>) => {
    router.push({
      pathname: '/verdict',
      params: {
        food: lookupResult.canonicalName,
        verdict: lookupResult.verdict,
        explanation: lookupResult.explanation,
        action: lookupResult.action,
        color: lookupResult.color,
        provenance: lookupResult.provenance,
        confidenceLabel: lookupResult.confidenceLabel,
        matchedIngredients: JSON.stringify(lookupResult.matchedIngredients),
        matchedHazards: JSON.stringify(lookupResult.matchedHazards),
      },
    });
  };

  const handleCheck = async () => {
    if (isLoading) return;
    if (isButtonDisabled) return;

    setIsLoading(true);
    try {
      const lookupResult = await smartFoodLookup(foodInput, 'dog');
      const normalizedInput = normalizeUserInputForCompare(foodInput);
      await addCheckEntry({
        normalizedInput,
        canonicalName: lookupResult.canonicalName,
        verdict: lookupResult.verdict,
        provenance: lookupResult.provenance,
        timestamp: Date.now(),
      });
      navigateToVerdict(lookupResult);
      getCheckHistory().then(setHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRerun = async (entry: CheckHistoryEntry) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const lookupResult = await smartFoodLookup(entry.normalizedInput, 'dog');
      await addCheckEntry({
        normalizedInput: entry.normalizedInput,
        canonicalName: lookupResult.canonicalName,
        verdict: lookupResult.verdict,
        provenance: lookupResult.provenance,
        timestamp: Date.now(),
      });
      navigateToVerdict(lookupResult);
      getCheckHistory().then(setHistory);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    await clearCheckHistory();
    setHistory([]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[styles.inner, { paddingTop: insets.top + 24 }, screenMotion.animatedStyle]}
      >
        <Text style={styles.header}>Safe or Not</Text>

        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a food"
              placeholderTextColor={Colors.textMuted}
              value={foodInput}
              onChangeText={setFoodInput}
              autoCapitalize="none"
              autoCorrect={false}
              testID="food-input"
            />
          </View>

          <Text style={styles.helperText}>For dogs and cats</Text>

          <TouchableOpacity
            style={[
              styles.button,
              isCheckDisabled && styles.buttonDisabled,
            ]}
            onPress={handleCheck}
            disabled={isCheckDisabled}
            activeOpacity={0.88}
            testID="check-button"
          >
            <Text
              style={[
                styles.buttonText,
                isCheckDisabled && styles.buttonTextDisabled,
              ]}
            >
              {isLoading ? 'Checking...' : "See if it's safe"}
            </Text>
          </TouchableOpacity>

          {history.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyLabel}>Recent checks</Text>
              <ScrollView
                style={styles.historyList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {history.map((entry, index) => (
                  <TouchableOpacity
                    key={`${entry.normalizedInput}-${entry.timestamp}-${index}`}
                    style={styles.historyItem}
                    onPress={() => handleRerun(entry)}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    testID={`history-item-${index}`}
                  >
                    <View
                      style={[
                        styles.verdictDot,
                        { backgroundColor: getVerdictColor(entry.verdict) },
                      ]}
                    />
                    <Text style={styles.historyItemLabel} numberOfLines={1}>
                      {entry.canonicalName || entry.normalizedInput}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={handleClearHistory}
                style={styles.clearButton}
                disabled={isLoading}
                testID="clear-history-button"
              >
                <Text style={styles.clearButtonText}>Clear history</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function getVerdictColor(verdict: CheckHistoryEntry['verdict']): string {
  switch (verdict) {
    case 'SAFE':
      return Colors.safe;
    case 'TOXIC':
      return Colors.toxic;
    case 'VET FIRST':
    default:
      return Colors.vetFirst;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 80,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    borderRadius: Radii.input,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.inputBackground,
    ...(Shadows.input ?? {}),
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radii.button,
    alignItems: 'center',
    ...(Shadows.button ?? {}),
  },
  buttonDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: Colors.background,
  },
  historySection: {
    marginTop: 24,
    maxHeight: 220,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  historyList: {
    maxHeight: 160,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  verdictDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  historyItemLabel: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  clearButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
