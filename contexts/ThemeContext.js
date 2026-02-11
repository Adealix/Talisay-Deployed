/**
 * Talisay AI — Theme Context
 * Provides dark/light mode with persistence and system preference detection.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Gradients } from '../constants/Colors';

const THEME_KEY = '@talisay_theme_preference';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark' | 'auto'
  const [isReady, setIsReady] = useState(false);

  // Load saved preference (default to 'light' for mobile)
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        setThemeMode(saved);
      } else {
        // Set default to 'light' explicitly
        setThemeMode('light');
      }
      setIsReady(true);
    }).catch(() => setIsReady(true));
  }, []);

  const setTheme = useCallback(async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      // silently fail
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const resolvedCurrent = themeMode === 'auto'
      ? (systemScheme || 'light')
      : themeMode;
    const next = resolvedCurrent === 'light' ? 'dark' : 'light';
    setTheme(next);
  }, [themeMode, systemScheme, setTheme]);

  const isDark = useMemo(() => {
    if (themeMode === 'auto') return systemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => isDark ? Colors.dark : Colors.light, [isDark]);
  const gradients = useMemo(() => isDark ? Gradients.dark : Gradients.light, [isDark]);

  const value = useMemo(() => ({
    isDark,
    themeMode,
    colors,
    gradients,
    setTheme,
    toggleTheme,
    isReady,
  }), [isDark, themeMode, colors, gradients, setTheme, toggleTheme, isReady]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
