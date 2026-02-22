/**
 * Floating Chatbot — Draggable FAB + inline chat panel.
 * No Modal: the chat window is absolutely positioned so it never
 * causes keyboard / layout shifts or random size changes.
 * Smooth withTiming animations throughout — no spring bouncing.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Shadows } from '../constants/Layout';
import { geminiService } from '../services/geminiService';

// ─── Constants ───
const FAB_SIZE = 52;
const CHAT_H = 540;
const CHAT_HEADER_H = 50;
const CHAT_INPUT_H = 62;
const MSG_LIST_H = CHAT_H - CHAT_HEADER_H - CHAT_INPUT_H;

const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) };
const TIMING_OUT = { duration: 180, easing: Easing.in(Easing.cubic) };

// ─── Suggested prompts ───
const QUICK_PROMPTS = [
  { icon: 'leaf-outline', text: 'What is a Talisay tree?', color: '#22c55e' },
  { icon: 'water-outline', text: 'How is oil extracted from Talisay?', color: '#3b82f6' },
  { icon: 'color-palette-outline', text: 'What do the fruit colors mean?', color: '#f97316' },
  { icon: 'flask-outline', text: 'What is the oil yield range?', color: '#8b5cf6' },
];

// ─── Markdown renderer ───
function renderMarkdown(text, colors) {
  if (!text) return null;
  const elements = [];
  text.split('\n').forEach((line, idx) => {
    const parts = [];
    let rem = line;
    let pi = 0;
    while (rem.length > 0) {
      const m = rem.match(/\*\*(.+?)\*\*/);
      if (m) {
        if (m.index > 0) parts.push(<Text key={pi++} style={{ color: colors.textSecondary }}>{rem.substring(0, m.index)}</Text>);
        parts.push(<Text key={pi++} style={{ fontWeight: '700', color: colors.text }}>{m[1]}</Text>);
        rem = rem.substring(m.index + m[0].length);
      } else {
        parts.push(<Text key={pi++} style={{ color: colors.textSecondary }}>{rem}</Text>);
        rem = '';
      }
    }
    if (line.match(/^[-•*]\s+/)) {
      elements.push(
        <View key={idx} style={{ flexDirection: 'row', gap: 4, marginVertical: 1 }}>
          <Text style={{ color: colors.primary, fontSize: 11, lineHeight: 18 }}>•</Text>
          <Text style={[ST.msgText, { flex: 1 }]}>{parts}</Text>
        </View>
      );
    } else if (line.trim() === '') {
      elements.push(<View key={idx} style={{ height: 4 }} />);
    } else {
      elements.push(<Text key={idx} style={[ST.msgText, { marginVertical: 1 }]}>{parts}</Text>);
    }
  });
  return elements;
}

// ─── Message bubble ───
function MessageBubble({ msg, colors, isDark }) {
  const isUser = msg.role === 'user';
  const isErr = msg.role === 'error';
  return (
    <Animated.View
      entering={(isUser ? SlideInRight : SlideInLeft).duration(180)}
      style={[ST.msgRow, isUser ? ST.msgRowUser : ST.msgRowAI]}
    >
      {!isUser && (
        <View style={[ST.avatar, { backgroundColor: isErr ? '#ef444420' : '#22c55e20' }]}>
          <Ionicons name={isErr ? 'alert-circle' : 'leaf'} size={12} color={isErr ? '#ef4444' : '#22c55e'} />
        </View>
      )}
      <View style={[
        ST.bubble,
        isUser
          ? [ST.bubbleUser, { backgroundColor: colors.primary }]
          : [ST.bubbleAI, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f4f7f5', borderColor: isErr ? '#ef444440' : colors.borderLight }],
      ]}>
        {isUser
          ? <Text style={[ST.msgText, { color: '#fff' }]}>{msg.text}</Text>
          : <View style={{ gap: 1 }}>{renderMarkdown(msg.text, colors)}</View>}
        <Text style={[ST.msgTime, { color: isUser ? 'rgba(255,255,255,0.5)' : colors.textTertiary }]}>
          {msg.time}
        </Text>
      </View>
      {isUser && (
        <View style={[ST.avatar, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="person" size={12} color={colors.primary} />
        </View>
      )}
    </Animated.View>
  );
}

// ─── Typing indicator ───
function TypingDots({ colors, isDark }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[ST.msgRow, ST.msgRowAI]}>
      <View style={[ST.avatar, { backgroundColor: '#22c55e20' }]}>
        <Ionicons name="leaf" size={12} color="#22c55e" />
      </View>
      <View style={[ST.bubble, ST.bubbleAI, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#f4f7f5', borderColor: colors.borderLight }]}>
        <View style={ST.dots}>
          {[0, 1, 2].map(i => <View key={i} style={[ST.dot, { backgroundColor: colors.textTertiary }]} />)}
        </View>
      </View>
    </Animated.View>
  );
}

// ══════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════
export default function FloatingChatbot() {
  const { colors, isDark } = useTheme();
  const scrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [unread, setUnread] = useState(0);

  // ── Animation values (no spring on open/close) ──
  const chatOpacity = useSharedValue(0);
  const chatTranslateY = useSharedValue(20);
  const fabScale = useSharedValue(1);
  const keyboardOffset = useSharedValue(0);

  // ── Draggable FAB ──
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; })
    .onUpdate(e => { tx.value = sx.value + e.translationX; ty.value = sy.value + e.translationY; })
    .onEnd(() => {
      const w = Dimensions.get('window').width;
      const clampedX = Math.max(-(w / 2 - FAB_SIZE - 8), Math.min(tx.value, w / 2 - FAB_SIZE - 8));
      tx.value = withTiming(clampedX, { duration: 250, easing: Easing.out(Easing.cubic) });
    });

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: fabScale.value }],
  }));

  const chatStyle = useAnimatedStyle(() => ({
    opacity: chatOpacity.value,
    transform: [{ translateY: chatTranslateY.value }],
    bottom: FAB_SIZE + 20 + keyboardOffset.value,
  }));

  // ── Open/close with smooth timing ──
  const openChat = useCallback(() => {
    chatOpacity.value = withTiming(1, TIMING);
    chatTranslateY.value = withTiming(0, TIMING);
    setOpen(true);
    setUnread(0);
  }, []);

  const closeChat = useCallback(() => {
    chatOpacity.value = withTiming(0, TIMING_OUT);
    chatTranslateY.value = withTiming(16, TIMING_OUT);
    setOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (open) closeChat(); else openChat();
  }, [open, openChat, closeChat]);

  // ── Keyboard avoidance: push chat window up when keyboard appears ──
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => {
      keyboardOffset.value = withTiming(e.endCoordinates.height, { duration: 220 });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: 220 });
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Auto-scroll when messages change ──
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 60);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);

  const formatTime = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const handleSend = useCallback(async (textArg) => {
    const msgText = (textArg ?? input).trim();
    if (!msgText || isLoading) return;
    setInput('');
    setHasStarted(true);
    setMessages(prev => [...prev, { role: 'user', text: msgText, time: formatTime() }]);
    setIsLoading(true);
    try {
      const response = await geminiService.sendMessage(msgText);
      setMessages(prev => [...prev, { role: 'ai', text: response, time: formatTime() }]);
      if (!open) setUnread(u => u + 1);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: `⚠️ ${err.message || 'Something went wrong.'}`, time: formatTime() }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, open]);

  const handleReset = useCallback(() => {
    geminiService.resetChat();
    setMessages([]);
    setHasStarted(false);
  }, []);

  // Compute chat window width
  const screenW = Dimensions.get('window').width;
  const chatW = Math.min(screenW - 28, 348);

  return (
    <View style={ST.container} pointerEvents="box-none">
      {/* ── Chat Window (absolutely positioned, no Modal) ── */}
      <Animated.View
        style={[
          ST.chatWindow,
          chatStyle,
          {
            width: chatW,
            height: CHAT_H,
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            right: 14,
            ...Shadows.xl,
          },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={[ST.chatHeader, { borderBottomColor: colors.borderLight }]}>
          <View style={ST.chatHeaderLeft}>
            <View style={[ST.onlineDot, { backgroundColor: '#22c55e' }]} />
            <Text style={[ST.chatTitle, { color: colors.text }]}>TalisAI</Text>
            <Text style={[ST.chatBadge, { color: colors.textTertiary }]}>Gemini</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {hasStarted && (
              <Pressable onPress={handleReset} hitSlop={10} style={ST.hBtn}>
                <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
            <Pressable onPress={closeChat} hitSlop={10} style={ST.hBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Messages area — FIXED height, no flex */}
        <ScrollView
          ref={scrollRef}
          style={{ height: MSG_LIST_H }}
          contentContainerStyle={ST.msgContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {!hasStarted ? (
            <Animated.View entering={FadeInUp.duration(200)} style={ST.welcome}>
              <Text style={{ fontSize: 30 }}>🌳</Text>
              <Text style={[ST.welcomeTitle, { color: colors.text }]}>TalisAI Chat</Text>
              <Text style={[ST.welcomeDesc, { color: colors.textSecondary }]}>
                Ask anything about Talisay trees, oil yield, or Philippine botany.
              </Text>

              {/* Quick prompt cards */}
              <View style={ST.promptGrid}>
                {QUICK_PROMPTS.map((p, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleSend(p.text)}
                    style={[
                      ST.promptCard,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
                      },
                    ]}
                  >
                    <Ionicons name={p.icon} size={13} color={p.color} />
                    <Text style={[ST.promptText, { color: colors.text }]} numberOfLines={2}>
                      {p.text}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!geminiService.isConfigured() && (
                <View style={ST.apiWarn}>
                  <Ionicons name="key-outline" size={13} color="#d97706" />
                  <Text style={ST.apiWarnText}>Set EXPO_PUBLIC_GEMINI_API_KEY in .env</Text>
                </View>
              )}
            </Animated.View>
          ) : (
            <View style={{ gap: 8 }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} colors={colors} isDark={isDark} />
              ))}
              {isLoading && <TypingDots colors={colors} isDark={isDark} />}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[ST.inputBar, { borderTopColor: colors.borderLight }]}>
          <View style={[ST.inputBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderColor: colors.borderLight }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about Talisay..."
              placeholderTextColor={colors.textTertiary}
              style={[ST.input, { color: colors.text }]}
              multiline
              maxLength={2000}
              returnKeyType="send"
              blurOnSubmit={false}
              editable={!isLoading}
              onSubmitEditing={() => { if (Platform.OS !== 'web') handleSend(); }}
            />
          </View>
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={[
              ST.sendBtn,
              { backgroundColor: input.trim() && !isLoading ? colors.primary : colors.primary + '35' },
            ]}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      </Animated.View>

      {/* ── FAB (draggable) ── */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[ST.fab, fabStyle]}>
          <Pressable
            onPress={toggleChat}
            onPressIn={() => { fabScale.value = withTiming(0.88, { duration: 100 }); }}
            onPressOut={() => { fabScale.value = withTiming(1, { duration: 120 }); }}
            style={[ST.fabInner, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name={open ? 'close' : 'chatbubble-ellipses'}
              size={22}
              color="#fff"
            />
            {unread > 0 && !open && (
              <View style={ST.badge}>
                <Text style={ST.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Styles ───
const ST = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    top: 0,
    zIndex: 9999,
  },

  /* Chat window */
  chatWindow: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: CHAT_HEADER_H,
    borderBottomWidth: 1,
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  chatTitle: { fontSize: 14, fontWeight: '700' },
  chatBadge: { fontSize: 10, marginLeft: 2 },
  hBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  /* Messages */
  msgContent: { padding: 12, paddingBottom: 16, gap: 8 },

  /* Welcome */
  welcome: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  welcomeTitle: { fontSize: 15, fontWeight: '700' },
  welcomeDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17, maxWidth: 260 },
  promptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 300 },
  promptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1, maxWidth: 152,
  },
  promptText: { fontSize: 11, fontWeight: '500', flexShrink: 1 },
  apiWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef3c7', borderColor: '#fbbf24',
    borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 4,
  },
  apiWarnText: { fontSize: 11, color: '#92400e', flex: 1 },

  /* Bubbles */
  msgRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '80%', padding: 9, borderRadius: 14, gap: 2 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAI: { borderBottomLeftRadius: 4, borderWidth: 1 },
  msgText: { fontSize: 13, lineHeight: 18.5 },
  msgTime: { fontSize: 9, alignSelf: 'flex-end', marginTop: 2 },

  /* Typing */
  dots: { flexDirection: 'row', gap: 4, padding: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },

  /* Input */
  inputBar: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1,
    height: CHAT_INPUT_H,
  },
  inputBox: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 72,
    justifyContent: 'center',
  },
  input: {
    fontSize: 13, lineHeight: 18,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
  },
  fabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
