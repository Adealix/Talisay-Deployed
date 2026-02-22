/**
 * Talisay AI — Notification Context
 *
 * Responsibilities:
 *  1. Request push-notification permission on first launch (native only).
 *  2. Register the Expo Push Token with the backend.
 *  3. Poll the unread-count endpoint every ~30 s while the app is in foreground.
 *  4. Listen for foreground push messages and show an in-app banner.
 *  5. Expose { unreadCount, notifications, loading, refresh, markAllRead }
 *     to the rest of the app.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Platform, AppState } from 'react-native';
import * as ExpoNotifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import * as notifService from '../services/notificationService';

// ─── Configure foreground notification behaviour ───
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState(null);

  const pollInterval = useRef(null);
  const notifListener = useRef(null);
  const responseListener = useRef(null);
  const prevUnreadRef = useRef(-1); // -1 = not yet initialised (skip first-poll notification)

  // ─── Register for push notifications ───
  const registerForPush = useCallback(async () => {
    if (Platform.OS === 'web') return;

    // Detect if running inside Expo Go (appOwnership === 'expo').
    // In Expo Go SDK 53+ remote push is unavailable on Android, so we fall
    // back to a local-notification-only mode.  In a standalone APK/IPA
    // (appOwnership === null) full remote push is supported on both platforms.
    const isExpoGo = Constants.appOwnership === 'expo';

    if (Platform.OS === 'android') {
      // Always create the notification channel (needed for local + remote).
      try {
        await ExpoNotifications.setNotificationChannelAsync('default', {
          name: 'Talisay Notifications',
          importance: ExpoNotifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2d6a4f',
          sound: 'default',
        });
      } catch (err) {
        console.warn('[NotificationContext] Android channel setup error:', err?.message);
      }

      if (isExpoGo) {
        // Expo Go SDK53 — request permission for local notifications only.
        await ExpoNotifications.requestPermissionsAsync();
        return;
      }
      // Fall through to the remote-push token registration below for APK builds.
    }

    // Request permission and obtain remote Expo Push Token (Android APK + iOS).
    try {
      const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationContext] Push permission not granted.');
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        '5364e601-0535-4edb-8c43-323a168b9d85';

      try {
        const tokenData = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData?.data;
        if (token) {
          setPushToken(token);
          await notifService.registerPushToken(token);
          console.log('[NotificationContext] Push token registered:', token);
        }
      } catch (tokenErr) {
        console.warn('[NotificationContext] Push token unavailable:', tokenErr?.message);
      }
    } catch (err) {
      console.error('[NotificationContext] registerForPush error:', err);
    }
  }, []);

  // ─── Fetch notifications list ───
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await notifService.fetchNotifications(1, 30);
      if (data.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ─── Poll unread count + fire Android local notification when new items arrive ───
  const pollUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const count = await notifService.fetchUnreadCount();
      const prev = prevUnreadRef.current;
      prevUnreadRef.current = count;
      setUnreadCount(count);

      // Fire a local notification on Android when the count increases.
      // prev === -1 on the very first poll (app just opened) – skip it so
      // we don't spam a notification for already-seen items.
      if (Platform.OS === 'android' && prev >= 0 && count > prev) {
        const newCount = count - prev;
        try {
          await ExpoNotifications.scheduleNotificationAsync({
            content: {
              title: 'Talisay AI',
              body: newCount === 1
                ? 'You have a new notification'
                : `You have ${newCount} new notification${newCount > 1 ? 's' : ''}`,
              sound: 'default',
              data: { type: 'talisay_notification' },
            },
            trigger: null, // show immediately
          });
        } catch (notifErr) {
          console.warn('[NotificationContext] Local notif error:', notifErr?.message);
        }
      }
    } catch (_) {}
  }, [isAuthenticated]);

  // ─── Mark all as read ───
  const markAllRead = useCallback(async () => {
    await notifService.markRead([]);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // ─── Mark specific notification as read ───
  const markOneRead = useCallback(async (id) => {
    await notifService.markRead([id]);
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // ─── Remove notification from list ───
  const removeNotification = useCallback(async (id) => {
    const wasUnread = notifications.find(n => n._id === id && !n.read);
    await notifService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
  }, [notifications]);

  // ─── On auth change ───
  useEffect(() => {
    if (isAuthenticated) {
      registerForPush();
      refresh();

      // Start polling every 30 s
      pollInterval.current = setInterval(pollUnread, 30_000);
    } else {
      // Clear state on logout
      setNotifications([]);
      setUnreadCount(0);
      clearInterval(pollInterval.current);
    }

    return () => clearInterval(pollInterval.current);
  }, [isAuthenticated]);

  // ─── Re-poll when app comes back to foreground ───
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        pollUnread();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, pollUnread]);

  // ─── Expo foreground notification listeners ───
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Fires when a push arrives while app is open
    notifListener.current = ExpoNotifications.addNotificationReceivedListener(() => {
      // Increment badge and refresh list
      setUnreadCount(prev => prev + 1);
    });

    // Fires when user taps a notification
    responseListener.current = ExpoNotifications.addNotificationResponseReceivedListener(() => {
      refresh();
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [refresh]);

  const value = {
    unreadCount,
    notifications,
    loading,
    pushToken,
    refresh,
    markAllRead,
    markOneRead,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
