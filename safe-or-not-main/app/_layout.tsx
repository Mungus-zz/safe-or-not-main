import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Colors from '@/constants/colors';
import { MotionTokens } from '@/src/lib/motion';

const ONBOARDING_KEY = 'onboarding_completed';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [isReady, setIsReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Smoke test: check USDA API key exists (dev only)
        if (__DEV__) {
          const hasUsdaKey = !!process.env.EXPO_PUBLIC_USDA_API_KEY;
          console.log(`USDA_KEY_EXISTS:${hasUsdaKey}`);
        }

        await AsyncStorage.removeItem(ONBOARDING_KEY);
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasCompletedOnboarding(value === 'true');
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        setHasCompletedOnboarding(false);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    checkOnboarding();
  }, []);

  useEffect(() => {
    if (isReady && hasCompletedOnboarding !== null) {
      if (hasCompletedOnboarding) {
        router.replace('/input');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [isReady, hasCompletedOnboarding]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Calm, continuous transitions (no bounce / no urgency)
        animation: 'fade',
        animationDuration: MotionTokens.enterDurationMs,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="input" options={{ headerShown: false }} />
      <Stack.Screen name="verdict" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutNav />
    </GestureHandlerRootView>
  );
}
