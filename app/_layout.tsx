import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import '@/i18n'; // Initialize i18n
import { initializeLanguage } from '@/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

async function routeAfterAuth(router: ReturnType<typeof useRouter>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    router.replace('/(tabs)');
  } else {
    router.replace('/(auth)/login');
  }
}

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    routeAfterAuth(router);
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        presentation: 'card',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    initializeLanguage();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <RootLayoutNav />
      <StatusBar style="light" />
    </>
  );
}
