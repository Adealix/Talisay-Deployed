/**
 * Talisay AI — Root Layout
 * Wraps entire app with providers and sets up the navigation shell.
 * Navigation is now merged into the Header — no separate nav bar.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import Header from '../components/Header';
import { useResponsive } from '../hooks/useResponsive';
import { loadNgrokUrl } from '../services/mlService';

function AppShell() {
  const { colors, isDark, isReady } = useTheme();
  const { isMobile } = useResponsive();

  // Load saved ngrok URL from AsyncStorage on startup
  useEffect(() => { loadNgrokUrl(); }, []);

  if (!isReady) return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111a14' : '#ffffff'}
      />

      {/* Unified Header with inline navigation */}
      <Header />

      {/* Page Content */}
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
