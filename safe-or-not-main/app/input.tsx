import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { Radii, Shadows } from '@/constants/theme';
import { useFadeUpMotion } from '@/src/lib/motion';
import { smartFoodLookup } from '@/src/lib/smartFoodLookup';

export default function InputScreen() {
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const screenMotion = useFadeUpMotion();

  const isButtonDisabled = !foodInput.trim();
  const isCheckDisabled = isButtonDisabled || isLoading;

  const handleCheck = async () => {
    if (isLoading) return;
    if (isButtonDisabled) return;

    setIsLoading(true);
    try {
      const lookupResult = await smartFoodLookup(foodInput, 'dog');
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
    } finally {
      setIsLoading(false);
    }
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
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
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
});
