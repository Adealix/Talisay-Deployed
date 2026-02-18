/**
 * Talisay AI — AI Chatbot Page
 * Powered by Google Gemini (free tier).
 * Provides an interactive AI assistant specialized in Talisay trees.
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
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  SlideInRight,
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { geminiService } from '../services/geminiService';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Suggested Prompts ───
const SUGGESTED_PROMPTS = [
  { icon: 'leaf', text: 'What is a Talisay tree?', color: '#22c55e' },
  { icon: 'water', text: 'How is oil extracted from Talisay kernels?', color: '#3b82f6' },
  { icon: 'color-palette', text: 'What do the fruit colors mean?', color: '#f97316' },
  { icon: 'flask', text: 'What is the oil yield range?', color: '#8b5cf6' },
  { icon: 'map', text: 'Where are Talisay trees found in the Philippines?', color: '#ef4444' },
  { icon: 'analytics', text: 'How does the AI analyze fruit images?', color: '#06b6d4' },
];

// ─── Simple Markdown Renderer ───
function renderMarkdown(text, colors) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, idx) => {
    // Bold text: **text**
    const parts = [];
    let remaining = line;
    let partIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const before = remaining.substring(0, boldMatch.index);
        if (before) parts.push(<Text key={partIdx++} style={{ color: colors.textSecondary }}>{before}</Text>);
        parts.push(<Text key={partIdx++} style={{ fontWeight: '700', color: colors.text }}>{boldMatch[1]}</Text>);
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(<Text key={partIdx++} style={{ color: colors.textSecondary }}>{remaining}</Text>);
        remaining = '';
      }
    }

    // Bullet points
    const isBullet = line.match(/^[-•*]\s+/);
    if (isBullet) {
      elements.push(
        <View key={idx} style={{ flexDirection: 'row', gap: 6, marginVertical: 2, paddingLeft: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 12, marginTop: 2 }}>•</Text>
          <Text style={[styles.msgText, { flex: 1 }]}>{parts}</Text>
        </View>
      );
    } else if (line.trim() === '') {
      elements.push(<View key={idx} style={{ height: 8 }} />);
    } else if (line.match(/^\d+\.\s+/)) {
      // Numbered list
      elements.push(
        <View key={idx} style={{ flexDirection: 'row', gap: 6, marginVertical: 2, paddingLeft: 4 }}>
          <Text style={[styles.msgText]}>{parts}</Text>
        </View>
      );
    } else {
      elements.push(
        <Text key={idx} style={[styles.msgText, { marginVertical: 1 }]}>{parts}</Text>
      );
    }
  });

  return <View style={{ gap: 1 }}>{elements}</View>;
}

// ─── Message Bubble ───
function MessageBubble({ message, colors, isDark, index }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <Animated.View
      entering={isUser ? SlideInRight.delay(50).duration(250) : SlideInLeft.delay(50).duration(250)}
      style={[
        styles.msgRow,
        isUser ? styles.msgRowUser : styles.msgRowAI,
      ]}
    >
      {/* Avatar */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: isError ? '#ef444420' : '#22c55e20' }]}>
          <Ionicons name={isError ? 'alert-circle' : 'leaf'} size={16} color={isError ? '#ef4444' : '#22c55e'} />
        </View>
      )}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleAI, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
                borderColor: isError ? '#ef444430' : colors.borderLight,
              }],
        ]}
      >
        {isUser ? (
          <Text style={[styles.msgText, { color: '#fff' }]}>{message.text}</Text>
        ) : (
          renderMarkdown(message.text, colors)
        )}
        <Text style={[styles.msgTime, { color: isUser ? 'rgba(255,255,255,0.6)' : colors.textTertiary }]}>
          {message.time}
        </Text>
      </View>

      {/* User avatar */}
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      )}
    </Animated.View>
  );
}

// ─── Typing Indicator ───
function TypingIndicator({ colors, isDark }) {
  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.msgRow, styles.msgRowAI]}>
      <View style={[styles.avatar, { backgroundColor: '#22c55e20' }]}>
        <Ionicons name="leaf" size={16} color="#22c55e" />
      </View>
      <View style={[styles.bubble, styles.bubbleAI, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
        borderColor: colors.borderLight,
      }]}>
        <View style={styles.typingDots}>
          {[0, 1, 2].map(i => (
            <Animated.View
              key={i}
              entering={FadeIn.delay(i * 200).duration(300)}
              style={[styles.typingDot, { backgroundColor: colors.textTertiary }]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════
// ─── MAIN CHATBOT PAGE ───
// ════════════════════════════════════════════════
export default function ChatbotPage() {
  const { colors, isDark } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
  }, []);

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = useCallback(async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || isLoading) return;

    setInput('');
    setHasStarted(true);

    // Add user message
    const userMsg = { role: 'user', text: msgText, time: formatTime() };
    setMessages(prev => [...prev, userMsg]);
    scrollToBottom();

    // Get AI response
    setIsLoading(true);
    try {
      const response = await geminiService.sendMessage(msgText);
      const aiMsg = { role: 'ai', text: response, time: formatTime() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errMsg = {
        role: 'error',
        text: `⚠️ ${error.message || 'Something went wrong. Please try again.'}`,
        time: formatTime(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, scrollToBottom]);

  const handleReset = useCallback(() => {
    geminiService.resetChat();
    setMessages([]);
    setHasStarted(false);
  }, []);

  const handleSuggestedPrompt = useCallback((text) => {
    handleSend(text);
  }, [handleSend]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ─── Header ─── */}
      <LinearGradient
        colors={isDark ? ['#1a2e1a', '#0f1318'] : ['#f0fdf4', '#dcfce7']}
        style={styles.chatHeader}
      >
        <View style={[styles.chatHeaderContent, isDesktop && { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' }]}>
          <View style={styles.chatHeaderLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: '#22c55e20' }]}>
              <Ionicons name="chatbubbles" size={22} color="#22c55e" />
            </View>
            <View>
              <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>TalisAI Chat</Text>
              <Text style={[styles.chatHeaderSub, { color: colors.textSecondary }]}>
                {geminiService.isConfigured() ? 'Powered by Gemini AI' : 'API key needed'}
              </Text>
            </View>
          </View>
          {hasStarted && (
            <Pressable onPress={handleReset} style={[styles.resetBtn, { borderColor: colors.borderLight }]}>
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
              <Text style={[styles.resetText, { color: colors.textSecondary }]}>New Chat</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ─── Messages Area ─── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={[
          styles.messagesContent,
          isDesktop && { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {!hasStarted ? (
          /* ─── Welcome Screen ─── */
          <Animated.View entering={FadeInUp.duration(300)} style={styles.welcomeArea}>
            <View style={[styles.welcomeIcon, { backgroundColor: '#22c55e15' }]}>
              <Text style={{ fontSize: 48 }}>🌳</Text>
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to TalisAI!</Text>
            <Text style={[styles.welcomeDesc, { color: colors.textSecondary }]}>
              I'm your AI assistant specialized in Talisay trees, oil yield analysis, and Philippine botany. Ask me anything!
            </Text>

            {/* Suggested prompts */}
            <View style={styles.suggestedGrid}>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <Animated.View key={idx} entering={FadeInUp.delay(200 + idx * 80).duration(250)}>
                  <Pressable
                    onPress={() => handleSuggestedPrompt(prompt.text)}
                    style={[styles.suggestedCard, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                      borderColor: colors.borderLight,
                    }]}
                  >
                    <Ionicons name={prompt.icon} size={18} color={prompt.color} />
                    <Text style={[styles.suggestedText, { color: colors.text }]} numberOfLines={2}>{prompt.text}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            {!geminiService.isConfigured() && (
              <Animated.View entering={FadeInUp.delay(600).duration(250)} style={[styles.apiKeyNotice, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
                <Ionicons name="key" size={16} color="#d97706" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>API Key Required</Text>
                  <Text style={{ fontSize: 11, color: '#a16207', marginTop: 2, lineHeight: 16 }}>
                    Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.{'\n'}
                    Get a free key at aistudio.google.com/apikey
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        ) : (
          /* ─── Chat Messages ─── */
          <View style={styles.msgList}>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                colors={colors}
                isDark={isDark}
                index={idx}
              />
            ))}
            {isLoading && <TypingIndicator colors={colors} isDark={isDark} />}
          </View>
        )}
      </ScrollView>

      {/* ─── Input Bar ─── */}
      <View style={[styles.inputBar, {
        backgroundColor: isDark ? '#1a1f2e' : '#fff',
        borderTopColor: colors.borderLight,
      }]}>
        <View style={[
          styles.inputRow,
          isDesktop && { maxWidth: LayoutConst.maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}>
          <View style={[styles.inputBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderColor: colors.borderLight }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about Talisay trees..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, { color: colors.text }]}
              multiline
              maxLength={2000}
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={Platform.OS !== 'web'}
              returnKeyType="send"
              editable={!isLoading}
            />
          </View>
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={[
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isLoading ? colors.primary : colors.primary + '30',
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  chatHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  chatHeaderContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  chatHeaderTitle: { fontSize: 18, fontWeight: '700' },
  chatHeaderSub: { fontSize: 11, marginTop: 1 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  resetText: { fontSize: 12, fontWeight: '600' },

  /* Messages */
  messagesArea: { flex: 1 },
  messagesContent: { padding: Spacing.md, paddingBottom: Spacing.lg },

  /* Welcome */
  welcomeArea: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.md },
  welcomeIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  welcomeTitle: { ...Typography.h2, textAlign: 'center' },
  welcomeDesc: { ...Typography.body, textAlign: 'center', maxWidth: 380 },
  suggestedGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    justifyContent: 'center', marginTop: Spacing.sm, maxWidth: 500,
  },
  suggestedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    maxWidth: 230,
    ...Shadows.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  suggestedText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },

  /* API key notice */
  apiKeyNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1,
    width: '100%', maxWidth: 400, marginTop: Spacing.sm,
  },

  /* Messages list */
  msgList: { gap: Spacing.md },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%', padding: 12, borderRadius: 16, gap: 4,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    borderBottomLeftRadius: 4, borderWidth: 1,
  },
  msgText: { fontSize: 14, lineHeight: 21 },
  msgTime: { fontSize: 10, alignSelf: 'flex-end', marginTop: 2 },

  /* Typing indicator */
  typingDots: { flexDirection: 'row', gap: 4, padding: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, opacity: 0.5 },

  /* Input bar */
  inputBar: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    ...Shadows.sm,
  },
  inputRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end',
  },
  inputBox: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    maxHeight: 120,
  },
  input: {
    fontSize: 14, lineHeight: 20,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
});
