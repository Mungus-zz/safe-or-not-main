import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { foodLookup } from '@/src/lib/foodLookup';

export default function InputScreen() {
  const [foodInput, setFoodInput] = useState('');
  const insets = useSafeAreaInsets();

  const isButtonDisabled = !foodInput.trim();

  const handleCheck = () => {
    if (!isButtonDisabled) {
      const lookupResult = foodLookup(foodInput);
      router.push({
        pathname: '/verdict',
        params: {
          food: lookupResult.canonicalName,
          verdict: lookupResult.verdict,
          explanation: lookupResult.explanation,
          action: lookupResult.action,
          color: lookupResult.color,
        },
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.header}>Safe or Not</Text>

        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter a food"
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
              isButtonDisabled && styles.buttonDisabled,
            ]}
            onPress={handleCheck}
            disabled={isButtonDisabled}
            testID="check-button"
          >
            <Text
              style={[
                styles.buttonText,
                isButtonDisabled && styles.buttonTextDisabled,
              ]}
            >
              Check
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
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
    borderRadius: 12,
    alignItems: 'center',
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
