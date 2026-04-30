import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-url-polyfill/auto';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import '../global.css';
import { dscNavTheme } from '@/lib/nav-theme';
import { AuthProvider } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={dscNavTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="profile/edit"
            options={{
              headerShown: true,
              title: 'Edit Profile',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="cars/new"
            options={{
              headerShown: true,
              title: 'Add a Car',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="cars/[id]"
            options={{ headerShown: true, title: 'Edit Car' }}
          />
          <Stack.Screen
            name="apply/index"
            options={{
              headerShown: true,
              title: 'Apply to DSC',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="apply/confirmation"
            options={{ headerShown: true, title: 'Submitted' }}
          />
          <Stack.Screen
            name="admin/index"
            options={{ headerShown: true, title: 'Admin' }}
          />
          <Stack.Screen
            name="admin/events/new"
            options={{
              headerShown: true,
              title: 'New Event',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="admin/scan"
            options={{ headerShown: true, title: 'Scanner' }}
          />
          <Stack.Screen
            name="events/[id]"
            options={{ headerShown: true, title: 'Event' }}
          />
          <Stack.Screen
            name="rewards/index"
            options={{ headerShown: true, title: 'Rewards' }}
          />
          <Stack.Screen
            name="points/index"
            options={{ headerShown: true, title: 'Points' }}
          />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
