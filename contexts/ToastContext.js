/**
 * Talisay AI — Global Toast Context
 * Provides showToast(message, type) anywhere in the app.
 * Types: 'success' | 'error' | 'info' | 'warning'
 */
import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext(null);

const TOAST_DURATION = 4000;

const TOAST_CONFIG = {
  success: { icon: 'checkmark-circle', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', iconColor: '#22c55e' },
  error:   { icon: 'alert-circle',     bg: '#fef2f2', border: '#fecaca', text: '#dc2626', iconColor: '#ef4444' },
  warning: { icon: 'warning',          bg: '#fffbeb', border: '#fde68a', text: '#d97706', iconColor: '#f59e0b' },
  info:    { icon: 'information-circle', bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', iconColor: '#3b82f6' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = 'info', duration = TOAST_DURATION) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — always on top */}
      {toasts.length > 0 && (
        <View style={s.container} pointerEvents="box-none">
          {toasts.map(toast => {
            const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
            return (
              <Animated.View
                key={toast.id}
                entering={FadeInUp.duration(250)}
                exiting={FadeOutUp.duration(200)}
                style={[s.toast, { backgroundColor: cfg.bg, borderColor: cfg.border }]}
              >
                <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} style={s.icon} />
                <Text style={[s.text, { color: cfg.text }]} numberOfLines={3}>{toast.message}</Text>
                <Pressable onPress={() => dismissToast(toast.id)} hitSlop={8} style={s.close}>
                  <Ionicons name="close" size={16} color={cfg.text} />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    maxWidth: 480,
    width: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  close: {
    marginLeft: 10,
    padding: 4,
  },
});
