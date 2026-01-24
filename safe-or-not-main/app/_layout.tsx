import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const ONBOARDING_KEY = 'onboarding_completed';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const [isReady, setIsReady] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      try {
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
    <Stack screenOptions={{ headerShown: false }}>
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
