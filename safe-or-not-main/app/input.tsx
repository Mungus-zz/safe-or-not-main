import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/colors';
import { Radii, Shadows } from '@/constants/theme';
import {
  getFoodSuggestions,
  type FoodSuggestion,
} from '@/src/lib/autocompleteFoods';
import { useFadeUpMotion } from '@/src/lib/motion';
import { smartFoodLookup } from '@/src/lib/smartFoodLookup';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export default function InputScreen() {
  const [foodInput, setFoodInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const insets = useSafeAreaInsets();
  const screenMotion = useFadeUpMotion();

  const debouncedQuery = useDebouncedValue(foodInput, 150);

  useEffect(() => {
    const next = debouncedQuery.trim();
    if (!next) {
      setSuggestions([]);
      return;
    }
    const nextSuggestions = getFoodSuggestions(next, 12);
    setSuggestions(nextSuggestions);
  }, [debouncedQuery]);

  const isButtonDisabled = !foodInput.trim();
  const isCheckDisabled = isButtonDisabled || isLoading;

  const handleChangeText = (text: string) => {
    setFoodInput(text);
  };

  const handleSelectSuggestion = (suggestion: FoodSuggestion) => {
    setFoodInput(suggestion.label);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleSearchRowPress = () => {
    setSuggestions([]);
  };

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
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderSuggestionRow = ({ item: s }: { item: FoodSuggestion }) => {
    const chip = getChipStyleForVerdict(
      s.verdict as 'SAFE' | 'TOXIC' | 'VET FIRST' | 'VET_FIRST',
    );

    const query = foodInput.trim();
    const lowerLabel = s.label.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const prefixLen =
      query && lowerLabel.startsWith(lowerQuery) ? query.length : 0;

    return (
      <TouchableOpacity
        style={styles.suggestionRow}
        onPress={() => handleSelectSuggestion(s)}
        activeOpacity={0.9}
      >
        <Text style={styles.suggestionLabel}>
          {prefixLen > 0 ? (
            <>
              <Text style={styles.suggestionLabelHighlight}>
                {s.label.slice(0, prefixLen)}
              </Text>
              <Text>{s.label.slice(prefixLen)}</Text>
            </>
          ) : (
            s.label
          )}
        </Text>
        <View style={[styles.suggestionChip, { backgroundColor: chip.bg }]}>
          <Text style={[styles.suggestionChipText, { color: chip.text }]}>
            {s.verdict}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const listFooterComponent =
    !!foodInput.trim() ? (
      <TouchableOpacity
        style={styles.searchRow}
        onPress={handleSearchRowPress}
        activeOpacity={0.9}
      >
        <Text style={styles.searchRowText}>Search "{foodInput.trim()}"</Text>
      </TouchableOpacity>
    ) : null;

  const trimmedInput = foodInput.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={() => setSuggestions([])}>
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
                onChangeText={handleChangeText}
                autoCapitalize="none"
                autoCorrect={false}
                testID="food-input"
                returnKeyType="search"
                onSubmitEditing={() => {
                  const top = suggestions[0];
                  const isStrongMatch =
                    top && top.matchType === 'canonical_prefix';
                  if (suggestions.length > 0 && isStrongMatch) {
                    handleSelectSuggestion(top);
                  } else {
                    handleCheck();
                  }
                }}
              />
            </View>

            {suggestions.length > 0 && trimmedInput.length >= 1 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => `${item.id}-${item.label}`}
                  renderItem={renderSuggestionRow}
                  ListFooterComponent={listFooterComponent}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionsList}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                />
              </View>
            )}

            {trimmedInput.length >= 2 && suggestions.length === 0 && (
              <Text style={styles.emptyHelperText}>
                No matches in the list. You can still check any food.
              </Text>
            )}

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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function getChipStyleForVerdict(
  verdict: 'SAFE' | 'TOXIC' | 'VET FIRST' | 'VET_FIRST',
): { bg: string; text: string } {
  switch (verdict) {
    case 'SAFE':
      return { bg: Colors.safe, text: Colors.text };
    case 'TOXIC':
      return { bg: Colors.toxic, text: Colors.text };
    case 'VET FIRST':
    case 'VET_FIRST':
    default:
      return { bg: Colors.vetFirst, text: Colors.text };
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
    marginBottom: 8,
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
  emptyHelperText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  suggestionsContainer: {
    borderRadius: Radii.input,
    backgroundColor: Colors.inputBackground,
    marginBottom: 12,
    maxHeight: 280,
    ...(Shadows.input ?? {}),
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 280,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.inputBorder,
  },
  suggestionLabel: {
    fontSize: 14,
    color: Colors.text,
    flexShrink: 1,
    marginRight: 12,
  },
  suggestionLabelHighlight: {
    fontWeight: '600',
    color: Colors.text,
  },
  suggestionChip: {
    borderRadius: Radii.pill ?? Radii.button,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.background,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchRowText: {
    fontSize: 14,
    color: Colors.primary,
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
