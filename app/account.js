/**
 * Talisay AI — Account Page
 * Beautiful, aesthetically pleasing Profile / Login / Register / Email Verification flows.
 * Real backend integration with JWT auth, OTP email verification, and profile management.
 *
 * Profile shows: Personal info (first name, last name, email, phone, address),
 *                real stats from analysis history, password change with OTP.
 * No Appearance/Settings sections (theme toggle is in the Header).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  BounceIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─────────────────────────────────────────────────
// Small reusable atoms
// ─────────────────────────────────────────────────

function FloatingOrb({ delay = 0, size = 60, color, top, left, right }) {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -15]) },
      { scale: interpolate(float.value, [0, 1], [1, 1.08]) },
    ],
    opacity: interpolate(float.value, [0, 0.5, 1], [0.15, 0.25, 0.15]),
  }));
  return (
    <Animated.View
      style={[{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, backgroundColor: color, top, left, right,
      }, animStyle]}
    />
  );
}

function AnimatedInput({
  icon, label, value, onChangeText, placeholder, secureTextEntry, suffix,
  keyboardType, autoCapitalize, delay = 0, colors, editable = true, multiline,
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useSharedValue(0);
  useEffect(() => {
    borderAnim.value = withSpring(focused ? 1 : 0, { damping: 15, stiffness: 120 });
  }, [focused]);
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderAnim.value, [0, 1],
      [colors.borderLight || '#e5e7eb', colors.primary]
    ),
    transform: [{ scale: interpolate(borderAnim.value, [0, 1], [1, 1.005]) }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)} style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Animated.View style={[
        styles.inputContainer,
        { backgroundColor: colors.inputBackground || (colors.isDark ? '#1a2520' : '#f8faf9') },
        !editable && { opacity: 0.6 },
        containerStyle,
      ]}>
        <View style={[styles.inputIconWrap, { backgroundColor: focused ? colors.primary + '15' : 'transparent' }]}>
          <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textTertiary} />
        </View>
        <TextInput
          style={[
            styles.inputField, { color: colors.text },
            multiline && { minHeight: 60, textAlignVertical: 'top' },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
          multiline={multiline}
        />
        {suffix}
      </Animated.View>
    </Animated.View>
  );
}

function AnimatedButton({ onPress, label, icon, color = '#2d6a4f', loading, delay = 0, style, disabled }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
  }, []);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.25]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.95, 1.05]) }],
  }));
  const isDisabled = disabled || loading;
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)}>
      <View style={styles.btnGlowContainer}>
        <Animated.View style={[styles.btnGlow, { backgroundColor: color }, glowStyle]} />
        <AnimatedPressable
          onPress={isDisabled ? undefined : onPress}
          onPressIn={() => { if (!isDisabled) scale.value = withSpring(0.96); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          style={[btnStyle, styles.actionBtn, { backgroundColor: color, opacity: isDisabled ? 0.6 : 1 }, style]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name={icon} size={20} color="#fff" />
              <Text style={styles.actionBtnText}>{label}</Text>
            </>
          )}
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

function SocialButton({ icon, label, color, onPress, delay = 0 }) {
  const scale = useSharedValue(1);
  const btnAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(280)}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[btnAnim, styles.socialBtn, { borderColor: color + '30' }]}
      >
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.socialBtnText, { color }]}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

function PasswordStrength({ password, colors }) {
  const strength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const barColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  if (!password) return null;
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.strengthBar, { backgroundColor: i < strength ? barColors[strength - 1] : colors.borderLight }]} />
        ))}
      </View>
      <Text style={[styles.strengthLabel, { color: strength > 0 ? barColors[strength - 1] : colors.textTertiary }]}>
        {labels[strength]}
      </Text>
    </View>
  );
}

function FeatureCard({ icon, title, description, delay, colors, color }) {
  return (
    <Animated.View
      entering={FadeInLeft.delay(delay).duration(280)}
      style={[styles.featureCard, { backgroundColor: color + '08', borderColor: color + '20' }]}
    >
      <View style={[styles.featureIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </Animated.View>
  );
}

/** Toast-like inline message */
function InlineMessage({ text, type = 'error', colors, onClose }) {
  const bg = type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#eff6ff';
  const border = type === 'error' ? '#fecaca' : type === 'success' ? '#bbf7d0' : '#bfdbfe';
  const textColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb';
  const icon = type === 'error' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'information-circle';
  if (!text) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      style={[styles.inlineMsg, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon} size={16} color={textColor} />
      <Text style={[styles.inlineMsgText, { color: textColor }]}>{text}</Text>
      {onClose && (
        <Pressable onPress={onClose} style={styles.inlineMsgClose}>
          <Ionicons name="close" size={16} color={textColor} />
        </Pressable>
      )}
    </Animated.View>
  );
}


// ════════════════════════════════════════════════
// OTP VERIFICATION SCREEN
// ════════════════════════════════════════════════
function OtpVerificationScreen({ email, onBack }) {
  const { colors, isDark } = useTheme();
  const { verifyEmail, resendOtp, isLoading } = useAuth();
  const { isMobile } = useResponsive();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState('error');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleChange = (text, idx) => {
    const next = [...otp];
    // Handle paste of full OTP
    if (text.length > 1) {
      const chars = text.replace(/\D/g, '').slice(0, 6).split('');
      chars.forEach((c, i) => { if (i < 6) next[i] = c; });
      setOtp(next);
      const lastIdx = Math.min(chars.length, 5);
      inputRefs.current[lastIdx]?.focus();
      return;
    }
    next[idx] = text.replace(/\D/g, '');
    setOtp(next);
    if (text && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setMsg('Please enter the full 6-digit code'); setMsgType('error'); return; }
    setMsg(null);
    const res = await verifyEmail(email, code);
    if (!res.ok) {
      const errMap = { invalid_otp: 'Invalid code. Please check and try again.', otp_expired: 'Code expired. Tap Resend to get a new one.' };
      setMsg(errMap[res.error] || 'Verification failed. Please try again.');
      setMsgType('error');
    }
    // If ok, AuthContext updates user → page switches automatically
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const res = await resendOtp(email);
    if (res.ok) {
      setMsg('New code sent to your email!');
      setMsgType('success');
      setResendCooldown(60);
    } else {
      setMsg('Failed to resend. Try again later.');
      setMsgType('error');
    }
  };

  return (
    <View style={[styles.otpContainer, { backgroundColor: colors.card }]}>
      <ScrollView contentContainerStyle={styles.otpScroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(280)} style={styles.otpHeader}>
          <View style={[styles.otpIconWrap, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="mail-open" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.otpTitle, { color: colors.text }]}>Verify Your Email</Text>
          <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{email}</Text>
          </Text>
        </Animated.View>

        <InlineMessage 
          text={msg} 
          type={msgType} 
          colors={colors} 
          onClose={() => setMsg(null)}
        />

        {/* OTP input boxes */}
        <Animated.View entering={FadeInUp.delay(200).duration(280)} style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputRefs.current[i] = r; }}
              style={[
                styles.otpBox,
                {
                  borderColor: digit ? colors.primary : colors.borderLight,
                  backgroundColor: digit ? colors.primary + '08' : (colors.isDark ? '#1a2520' : '#f9fafb'),
                  color: colors.text,
                },
              ]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={i === 0 ? 6 : 1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </Animated.View>

        <AnimatedButton
          onPress={handleVerify}
          label="Verify Email"
          icon="checkmark-circle"
          loading={isLoading}
          delay={300}
        />

        <Animated.View entering={FadeInUp.delay(400).duration(280)} style={styles.otpFooter}>
          <Text style={[styles.otpFooterText, { color: colors.textTertiary }]}>
            Didn't receive the code?
          </Text>
          <Pressable onPress={handleResend} disabled={resendCooldown > 0}>
            <Text style={[styles.otpResendText, { color: resendCooldown > 0 ? colors.textTertiary : colors.primary }]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </Text>
          </Pressable>
        </Animated.View>

        {onBack && (
          <Pressable onPress={onBack} style={styles.otpBackBtn}>
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={[styles.otpBackText, { color: colors.textSecondary }]}>Back to Sign In</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}


// ════════════════════════════════════════════════
// LOGIN FORM
// ════════════════════════════════════════════════
function LoginForm({ onSwitch }) {
  const { colors, isDark } = useTheme();
  const { login, isLoading } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);

  const features = [
    { icon: 'leaf', title: 'AI Grading', description: 'Analyze Talisay fruit quality instantly', color: '#2d6a4f' },
    { icon: 'analytics', title: 'Oil Prediction', description: 'Accurate oil yield estimates', color: '#3b82f6' },
    { icon: 'time', title: 'History', description: 'Track all your analyses over time', color: '#7c3aed' },
  ];

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setError(null);
    const res = await login(email, password);
    if (!res.ok && res.error !== 'email_not_verified') {
      const errMap = {
        invalid_credentials: 'Invalid email or password.',
        email_and_password_required: 'Please fill in all fields.',
        account_deactivated: `Your account has been deactivated due to: "${res.reason || 'violation of guidelines'}". Please contact the Administrator at talisayfruit@gmail.com for assistance.`,
      };
      setError(errMap[res.error] || 'Login failed. Please try again.');
    }
    // If email_not_verified → AuthContext sets pendingVerification → parent shows OTP screen
  };

  return (
    <View style={[styles.authLayout, isMobile && styles.authLayoutMobile]}>
      {isDesktop && (
        <Animated.View entering={FadeInLeft.duration(280)} style={styles.authSidebar}>
          <LinearGradient
            colors={isDark ? ['#0d2818', '#1a4731', '#0d2818'] : ['#f0fdf4', '#dcfce7', '#f0fdf4']}
            style={styles.sidebarGradient}
          >
            <FloatingOrb delay={0} size={100} color="#2d6a4f" top={20} right={20} />
            <FloatingOrb delay={500} size={60} color="#52b788" top={120} left={30} />
            <FloatingOrb delay={1000} size={80} color="#40916c" top={250} right={40} />
            <View style={styles.sidebarContent}>
              <Animated.View entering={FadeInDown.delay(200).duration(280)}>
                <View style={[styles.sidebarIconBox, { backgroundColor: '#2d6a4f20' }]}>
                  <Ionicons name="leaf" size={36} color="#2d6a4f" />
                </View>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(300).duration(280)}>
                <Text style={[styles.sidebarTitle, { color: isDark ? '#e8f5e2' : '#1b4332' }]}>
                  Welcome to{'\n'}Talisay AI
                </Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(400).duration(280)}>
                <Text style={[styles.sidebarSubtitle, { color: isDark ? '#74c69d' : '#52796f' }]}>
                  Smart fruit analysis powered by machine learning
                </Text>
              </Animated.View>
              <View style={styles.featuresGrid}>
                {features.map((f, i) => (
                  <FeatureCard key={f.title} {...f} delay={500 + i * 100} colors={colors} />
                ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInRight.duration(280)}
        style={[styles.authFormSide, isDesktop && styles.authFormSideDesktop]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.authFormScroll}>
          <Animated.View entering={FadeInDown.delay(100).duration(280)} style={styles.formHeader}>
            <View style={[styles.formHeaderIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person-circle" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.formTitle, { color: colors.text }]}>Welcome Back!</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Sign in to continue your Talisay fruit analysis
            </Text>
          </Animated.View>

          {isMobile && (
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featureStrip}
              style={{ marginBottom: Spacing.lg }}
            >
              {features.map((f, i) => (
                <Animated.View
                  key={f.title}
                  entering={FadeInRight.delay(200 + i * 80).duration(280)}
                  style={[styles.featureChip, { backgroundColor: f.color + '12', borderColor: f.color + '25' }]}
                >
                  <Ionicons name={f.icon} size={14} color={f.color} />
                  <Text style={[styles.featureChipText, { color: f.color }]}>{f.title}</Text>
                </Animated.View>
              ))}
            </ScrollView>
          )}

          <InlineMessage 
            text={error} 
            type="error" 
            colors={colors} 
            onClose={() => setError(null)}
          />

          <View style={styles.formBody}>
            <AnimatedInput icon="mail-outline" label="Email Address" value={email} onChangeText={setEmail}
              placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" delay={200} colors={colors} />

            <AnimatedInput icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword}
              placeholder="Enter your password" secureTextEntry={!showPass} delay={300} colors={colors}
              suffix={
                <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </Pressable>
              }
            />

            <Animated.View entering={FadeInUp.delay(400).duration(280)} style={styles.rememberRow}>
              <Pressable onPress={() => setRememberMe(!rememberMe)} style={styles.checkboxRow}>
                <View style={[styles.checkbox, { backgroundColor: rememberMe ? colors.primary : 'transparent', borderColor: rememberMe ? colors.primary : colors.borderLight }]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.rememberText, { color: colors.textSecondary }]}>Remember me</Text>
              </Pressable>
            </Animated.View>

            <AnimatedButton onPress={handleLogin} label="Sign In" icon="arrow-forward-circle" loading={isLoading} delay={500} />

            <Animated.View entering={FadeInUp.delay(600).duration(280)} style={styles.switchRow}>
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>Don't have an account?</Text>
              <Pressable onPress={onSwitch}><Text style={[styles.switchLink, { color: colors.primary }]}> Create one</Text></Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}


// ════════════════════════════════════════════════
// REGISTER FORM
// ════════════════════════════════════════════════
function RegisterForm({ onSwitch }) {
  const { colors, isDark } = useTheme();
  const { register, isLoading } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);

  const passwordMatch = confirm.length > 0 && password === confirm;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  const handleRegister = async () => {
    if (!firstName || !lastName) { setError('Please enter your first and last name.'); return; }
    if (!email) { setError('Please enter your email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (!passwordMatch) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms of Service.'); return; }
    setError(null);

    const res = await register({ firstName, lastName, email, password });
    if (!res.ok) {
      const errMap = { email_already_exists: 'An account with this email already exists.', password_too_short: 'Password must be at least 6 characters.' };
      setError(errMap[res.error] || 'Registration failed. Please try again.');
    }
    // If ok → AuthContext sets pendingVerification → parent shows OTP screen
  };

  return (
    <View style={[styles.authLayout, isMobile && styles.authLayoutMobile]}>
      {isDesktop && (
        <Animated.View entering={FadeInLeft.duration(280)} style={styles.authSidebar}>
          <LinearGradient
            colors={isDark ? ['#1a0d2e', '#2d1b4e', '#1a0d2e'] : ['#faf5ff', '#ede9fe', '#faf5ff']}
            style={styles.sidebarGradient}
          >
            <FloatingOrb delay={0} size={90} color="#7c3aed" top={30} left={20} />
            <FloatingOrb delay={600} size={70} color="#a78bfa" top={160} right={30} />
            <FloatingOrb delay={1200} size={50} color="#c4b5fd" top={300} left={50} />
            <View style={styles.sidebarContent}>
              <Animated.View entering={FadeInDown.delay(200).duration(280)}>
                <View style={[styles.sidebarIconBox, { backgroundColor: '#7c3aed20' }]}>
                  <Ionicons name="rocket" size={36} color="#7c3aed" />
                </View>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(300).duration(280)}>
                <Text style={[styles.sidebarTitle, { color: isDark ? '#e9d5ff' : '#4c1d95' }]}>Join Talisay AI</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(400).duration(280)}>
                <Text style={[styles.sidebarSubtitle, { color: isDark ? '#c4b5fd' : '#6b21a8' }]}>
                  Start analyzing fruits with cutting-edge AI technology
                </Text>
              </Animated.View>
              <View style={styles.statsGrid}>
                {[
                  { value: '97.8%', label: 'Accuracy', icon: 'checkmark-circle' },
                  { value: '<2s', label: 'Analysis Time', icon: 'flash' },
                  { value: '3', label: 'Fruit Stages', icon: 'layers' },
                ].map((stat, i) => (
                  <Animated.View key={stat.label} entering={ZoomIn.delay(500 + i * 100).duration(280)}
                    style={[styles.statCard, { backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.08)', borderColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.15)' }]}>
                    <Ionicons name={stat.icon} size={20} color="#7c3aed" />
                    <Text style={[styles.statValue, { color: isDark ? '#e9d5ff' : '#4c1d95' }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? '#c4b5fd' : '#7c3aed' }]}>{stat.label}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeInRight.duration(280)}
        style={[styles.authFormSide, isDesktop && styles.authFormSideDesktop]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.authFormScroll}>
          <Animated.View entering={FadeInDown.delay(100).duration(280)} style={styles.formHeader}>
            <View style={[styles.formHeaderIcon, { backgroundColor: '#7c3aed15' }]}>
              <Ionicons name="person-add" size={36} color="#7c3aed" />
            </View>
            <Text style={[styles.formTitle, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              Join the Talisay AI research community
            </Text>
          </Animated.View>

          <InlineMessage 
            text={error} 
            type="error" 
            colors={colors} 
            onClose={() => setError(null)}
          />

          <View style={styles.formBody}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <View style={{ flex: 1 }}>
                <AnimatedInput icon="person-outline" label="First Name" value={firstName} onChangeText={setFirstName}
                  placeholder="Juan" delay={200} colors={colors} />
              </View>
              <View style={{ flex: 1 }}>
                <AnimatedInput icon="person-outline" label="Last Name" value={lastName} onChangeText={setLastName}
                  placeholder="Dela Cruz" delay={250} colors={colors} />
              </View>
            </View>

            <AnimatedInput icon="mail-outline" label="Email Address" value={email} onChangeText={setEmail}
              placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" delay={300} colors={colors} />

            <AnimatedInput icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword}
              placeholder="Create a strong password" secureTextEntry={!showPass} delay={400} colors={colors}
              suffix={
                <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </Pressable>
              }
            />

            <PasswordStrength password={password} colors={colors} />

            <AnimatedInput icon="shield-checkmark-outline" label="Confirm Password" value={confirm} onChangeText={setConfirm}
              placeholder="Re-enter your password" secureTextEntry delay={500} colors={colors}
              suffix={confirm.length > 0 ? (
                <Ionicons name={passwordMatch ? 'checkmark-circle' : 'close-circle'} size={18} color={passwordMatch ? '#22c55e' : '#ef4444'} />
              ) : null}
            />

            {passwordMismatch && (
              <Animated.View entering={FadeInDown.duration(280)} style={styles.errorHint}>
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorHintText}>Passwords do not match</Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInUp.delay(600).duration(280)} style={styles.termsRow}>
              <Pressable onPress={() => setAgreed(!agreed)} style={styles.checkboxRow}>
                <View style={[styles.checkbox, { backgroundColor: agreed ? '#7c3aed' : 'transparent', borderColor: agreed ? '#7c3aed' : colors.borderLight }]}>
                  {agreed && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  I agree to the <Text style={{ color: '#7c3aed', fontWeight: '600' }}>Terms of Service</Text> and{' '}
                  <Text style={{ color: '#7c3aed', fontWeight: '600' }}>Privacy Policy</Text>
                </Text>
              </Pressable>
            </Animated.View>

            <AnimatedButton onPress={handleRegister} label="Create Account" icon="rocket" color="#7c3aed" loading={isLoading} delay={700} />

            <Animated.View entering={FadeInUp.delay(750).duration(280)} style={styles.switchRow}>
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>Already have an account?</Text>
              <Pressable onPress={onSwitch}><Text style={[styles.switchLink, { color: '#7c3aed' }]}> Sign In</Text></Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}


// ════════════════════════════════════════════════
// PROFILE VIEW — beautiful wide layout, real data
// ════════════════════════════════════════════════
function ProfileView() {
  const { colors, isDark } = useTheme();
  const { user, logout, updateProfile, requestPasswordOtp, changePassword, getUserStats, profileImage, setProfileImage } = useAuth();
  const { isMobile, isDesktop } = useResponsive();
  const { showToast } = useToast();

  // Profile fields
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileMsgType, setProfileMsgType] = useState('success');
  
  // Image upload state
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordMsgType, setPasswordMsgType] = useState('error');

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Avatar animation
  const avatarPulse = useSharedValue(0);
  useEffect(() => {
    avatarPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
  }, []);
  const avatarRingStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(avatarPulse.value, [0, 1], [colors.primary + '40', colors.primary]),
    transform: [{ scale: interpolate(avatarPulse.value, [0, 1], [1, 1.03]) }],
  }));

  // Load stats
  useEffect(() => {
    (async () => {
      const res = await getUserStats();
      if (res.ok) setStats(res.stats);
      setStatsLoading(false);
    })();
  }, []);

  // Sync user → local state when user updates
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handlePickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera roll permission is required to upload a profile photo.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('[handlePickImage] Image selected:', imageUri);
        // Store selected image without uploading yet
        setSelectedImageUri(imageUri);
        // Auto-enable edit mode so Update Profile button shows
        setProfileEditing(true);
        setProfileMsg('Photo selected. Click "Update Profile" to upload.');
        setProfileMsgType('info');
        // Don't auto-hide message - let user close it manually
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const hasProfileData = !!(user?.firstName || user?.lastName || user?.phone || user?.address);
  // Show edit mode if: explicitly editing, no profile data yet, or image selected for upload
  const isEditing = profileEditing || !hasProfileData || !!selectedImageUri;

  const handleSaveProfile = async () => {
    console.log('[handleSaveProfile] Starting...', { selectedImageUri: !!selectedImageUri });
    setProfileSaving(true);
    setProfileMsg(null);
    
    let imageWasUploaded = false; // Track if image was uploaded
    
    try {
      // Upload image first if one is selected
      if (selectedImageUri) {
        console.log('[handleSaveProfile] Uploading image...');
        setImageUploading(true);
        setProfileMsg('Uploading profile photo...');
        setProfileMsgType('info');
        
        try {
          const uploadResult = await setProfileImage(selectedImageUri);
          console.log('[handleSaveProfile] Upload result:', uploadResult);
          
          if (!uploadResult.ok) {
            console.error('[handleSaveProfile] Upload failed:', uploadResult.error);
            setImageUploading(false);
            setProfileSaving(false);
            
            // User-friendly error messages based on error codes
            const errorCode = uploadResult.error;
            let errorMsg = 'Failed to upload photo';
            
            if (errorCode === 'file_too_large' || (errorCode && errorCode.includes('5MB'))) {
              errorMsg = 'Image too large. Please use a smaller image (max 5MB).';
            } else if (errorCode === 'invalid_file_type') {
              errorMsg = 'Invalid file type. Please use JPG, PNG, or WEBP images.';
            } else if (errorCode === 'no_file_uploaded') {
              errorMsg = 'No image selected. Please try again.';
            } else if (errorCode === 'upload_failed') {
              errorMsg = 'Upload failed. Please check your internet connection and try again.';
            } else if (errorCode && typeof errorCode === 'string') {
              // Use the error code/message from server
              errorMsg = errorCode;
            }
            
            setProfileMsg(errorMsg);
            setProfileMsgType('error');
            showToast(errorMsg, 'error');
            setTimeout(() => setProfileMsg(null), 5000);
            return;
          }
          
          setImageUploading(false);
          imageWasUploaded = true; // Mark that image was uploaded
          setSelectedImageUri(null); // Clear selected image after successful upload
          setProfileMsg('Photo uploaded successfully! Saving profile...');
          showToast('Photo uploaded!', 'success');
        } catch (uploadError) {
          setImageUploading(false);
          setProfileSaving(false);
          let errorMsg = uploadError.message || 'Failed to upload photo';
          
          // Handle common errors
          if (errorMsg.toLowerCase().includes('network') || errorMsg.toLowerCase().includes('fetch')) {
            errorMsg = 'Network error. Please check your connection and try again.';
          } else if (errorMsg.toLowerCase().includes('authenticated') || errorMsg.toLowerCase().includes('token')) {
            errorMsg = 'Session expired. Please login again.';
          } else if (errorMsg.toLowerCase().includes('timeout')) {
            errorMsg = 'Upload timeout. Please try again with a smaller image.';
          } else if (errorMsg.toLowerCase().includes('server')) {
            errorMsg = 'Server error. Please try again later.';
          }
          
          setProfileMsg(errorMsg);
          setProfileMsgType('error');
          setTimeout(() => setProfileMsg(null), 5000);
          return;
        }
      }
      
      // Update profile fields
      const res = await updateProfile({ firstName, lastName, phone, address });
      setProfileSaving(false);
      
      if (res.ok) {
        setProfileMsg(imageWasUploaded ? 'Profile and photo updated successfully!' : 'Profile updated successfully!');
        setProfileMsgType('success');
        setProfileEditing(false);
        showToast(imageWasUploaded ? 'Profile and photo updated!' : 'Profile updated successfully!', 'success');
      } else {
        setProfileMsg('Failed to save profile. Please try again.');
        setProfileMsgType('error');
        showToast('Failed to save profile.', 'error');
      }
    } catch (error) {
      setImageUploading(false);
      setProfileSaving(false);
      setProfileMsg('Error: ' + (error.message || 'Something went wrong'));
      setProfileMsgType('error');
    }
    
    setTimeout(() => setProfileMsg(null), 4000);
  };

  const handleSendPasswordOtp = async () => {
    setOtpSending(true);
    setPasswordMsg(null);
    const res = await requestPasswordOtp();
    setOtpSending(false);
    if (res.ok) {
      setOtpSent(true);
      setPasswordMsg('OTP sent to your email!');
      setPasswordMsgType('success');
    } else {
      setPasswordMsg('Failed to send OTP. Try again.');
      setPasswordMsgType('error');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setPasswordMsg('Password must be at least 6 characters.'); setPasswordMsgType('error'); return; }
    if (newPassword !== confirmNewPassword) { setPasswordMsg('Passwords do not match.'); setPasswordMsgType('error'); return; }
    if (!passwordOtp || passwordOtp.length < 6) { setPasswordMsg('Please enter the 6-digit OTP code.'); setPasswordMsgType('error'); return; }

    setPasswordChanging(true);
    setPasswordMsg(null);
    const res = await changePassword(passwordOtp, newPassword);
    setPasswordChanging(false);
    if (res.ok) {
      setPasswordMsg('Password changed successfully!');
      setPasswordMsgType('success');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordOtp('');
      setOtpSent(false);
      showToast('Password changed successfully!', 'success');
      setTimeout(() => { setShowPasswordSection(false); setPasswordMsg(null); }, 3000);
    } else {
      const errMap = { invalid_otp: 'Invalid OTP code.', otp_expired: 'OTP expired. Request a new one.', password_too_short: 'Password must be at least 6 characters.' };
      setPasswordMsg(errMap[res.error] || 'Failed to change password.');
      setPasswordMsgType('error');
      showToast(errMap[res.error] || 'Failed to change password.', 'error');
    }
  };

  // Format join date
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';

  // Build stats cards from real data
  const QUICK_STATS = [
    { icon: 'camera', label: 'Total Analyses', value: statsLoading ? '...' : String(stats?.totalAnalyses ?? 0), color: '#2d6a4f' },
    { icon: 'trophy', label: 'Avg Confidence', value: statsLoading ? '...' : (stats?.avgConfidence != null ? `${stats.avgConfidence}%` : '—'), color: '#f59e0b' },
    { icon: 'calendar', label: 'Member Since', value: joinDate, color: '#3b82f6' },
  ];

  // Category breakdown chips
  const catBreakdown = stats?.categoryBreakdown || {};

  return (
    <View style={styles.profileWrapper}>
      {/* ── Hero Card ── */}
      <Animated.View entering={FadeInUp.duration(280)}>
        <LinearGradient
          colors={isDark ? ['#1b4332', '#2d6a4f', '#1b4332'] : ['#f0fdf4', '#dcfce7', '#bbf7d0']}
          style={[styles.profileHero, { borderColor: colors.borderLight }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <FloatingOrb delay={0} size={100} color={colors.primary} top={-20} right={-10} />
          <FloatingOrb delay={800} size={60} color="#52b788" top={60} left={-10} />
          <FloatingOrb delay={1500} size={40} color="#95d5b2" top={120} right={40} />

          <View style={[styles.heroInner, isMobile && styles.heroInnerMobile]}>
            {/* Avatar with image picker */}
            <Pressable onPress={handlePickImage} style={{ position: 'relative' }}>
              <Animated.View style={[styles.avatarRing, avatarRingStyle]}>
                {(selectedImageUri || profileImage) ? (
                  <Image
                    source={{ uri: selectedImageUri || profileImage }}
                    style={styles.profileAvatar}
                  />
                ) : (
                  <LinearGradient
                    colors={['#2d6a4f', '#40916c']}
                    style={styles.profileAvatar}
                  >
                    <Text style={styles.avatarInitial}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </Animated.View>
              {/* Camera icon overlay */}
              <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
              {/* Pending upload indicator */}
              {selectedImageUri && (
                <View style={[styles.pendingUploadBadge, { backgroundColor: '#f59e0b' }]}>
                  <Ionicons name="time" size={12} color="#fff" />
                </View>
              )}
            </Pressable>

            <View style={[styles.heroInfo, isMobile && styles.heroInfoMobile]}>
              <Text style={[styles.profileName, { color: isDark ? '#e8f5e2' : '#1b4332' }]}>
                {displayName}
              </Text>
              <Text style={[styles.profileEmail, { color: isDark ? '#74c69d' : '#52796f' }]}>
                {user?.email || ''}
              </Text>
              <View style={styles.heroBadges}>
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '30' }]}>
                  <Ionicons name="ribbon" size={12} color={colors.primary} />
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    {user?.role === 'admin' ? 'Administrator' : 'Researcher'}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: '#22c55e20', borderColor: '#22c55e30' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
                  <Text style={[styles.roleBadgeText, { color: '#22c55e' }]}>Verified</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={[styles.quickStatsRow, isMobile && styles.quickStatsRowMobile]}>
            {QUICK_STATS.map((stat, i) => (
              <Animated.View
                key={stat.label}
                entering={ZoomIn.delay(300 + i * 100).duration(280)}
                style={[styles.quickStatCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)' }]}
              >
                <Ionicons name={stat.icon} size={20} color={stat.color} />
                <Text style={[styles.quickStatValue, { color: isDark ? '#e8f5e2' : '#1b4332' }]}>{stat.value}</Text>
                <Text style={[styles.quickStatLabel, { color: isDark ? '#74c69d' : '#52796f' }]}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Category breakdown chips */}
          {Object.keys(catBreakdown).length > 0 && (
            <Animated.View entering={FadeInUp.delay(500).duration(280)} style={styles.catChipsRow}>
              {Object.entries(catBreakdown).map(([cat, count]) => {
                const catColors = { green: '#22c55e', yellow: '#eab308', brown: '#92400e' };
                return (
                  <View key={cat} style={[styles.catChip, { backgroundColor: (catColors[cat] || '#6b7280') + '18', borderColor: (catColors[cat] || '#6b7280') + '30' }]}>
                    <View style={[styles.catDot, { backgroundColor: catColors[cat] || '#6b7280' }]} />
                    <Text style={[styles.catChipText, { color: catColors[cat] || '#6b7280' }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}: {count}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ── Personal Information ── */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(280)}
        style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          </View>
          {hasProfileData && (
            <Pressable onPress={() => setProfileEditing(!profileEditing)} style={styles.editBtn}>
              <Ionicons name={profileEditing ? 'close' : 'create-outline'} size={18} color={colors.primary} />
              <Text style={[styles.editBtnText, { color: colors.primary }]}>
                {profileEditing ? 'Cancel' : 'Edit'}
              </Text>
            </Pressable>
          )}
        </View>

        <InlineMessage 
          text={profileMsg} 
          type={profileMsgType} 
          colors={colors} 
          onClose={() => setProfileMsg(null)}
        />

        <View style={[styles.profileFieldsGrid, isDesktop && styles.profileFieldsGridDesktop]}>
          <View style={isDesktop ? styles.fieldHalf : undefined}>
            <AnimatedInput icon="person-outline" label="First Name" value={firstName} onChangeText={setFirstName}
              placeholder="Enter first name" delay={100} colors={colors} editable={isEditing} />
          </View>
          <View style={isDesktop ? styles.fieldHalf : undefined}>
            <AnimatedInput icon="person-outline" label="Last Name" value={lastName} onChangeText={setLastName}
              placeholder="Enter last name" delay={150} colors={colors} editable={isEditing} />
          </View>
        </View>

        <AnimatedInput icon="mail-outline" label="Email Address" value={user?.email || ''} onChangeText={() => {}}
          placeholder="—" delay={200} colors={colors} editable={false} />

        <View style={[styles.profileFieldsGrid, isDesktop && styles.profileFieldsGridDesktop]}>
          <View style={isDesktop ? styles.fieldHalf : undefined}>
            <AnimatedInput icon="call-outline" label="Phone Number" value={phone} onChangeText={setPhone}
              placeholder="Enter phone number" keyboardType="phone-pad" delay={250} colors={colors} editable={isEditing} />
          </View>
          <View style={isDesktop ? styles.fieldHalf : undefined}>
            <AnimatedInput icon="location-outline" label="Address" value={address} onChangeText={setAddress}
              placeholder="Enter address" delay={300} colors={colors} editable={isEditing} />
          </View>
        </View>

        {isEditing && (
          <Animated.View entering={FadeInUp.delay(350).duration(280)} style={styles.profileActions}>
            <AnimatedButton 
              onPress={handleSaveProfile} 
              label={imageUploading ? 'Uploading Photo...' : profileSaving ? 'Saving Profile...' : 'Update Profile'} 
              icon="checkmark-circle"
              loading={profileSaving || imageUploading} 
              delay={0} 
              style={{ flex: 1 }} 
            />
            {selectedImageUri && !profileSaving && !imageUploading && (
              <AnimatedButton 
                onPress={() => {
                  setSelectedImageUri(null);
                  setProfileMsg(null);
                  if (hasProfileData) {
                    setProfileEditing(false);
                  }
                }} 
                label="Cancel" 
                icon="close-circle"
                color="#6b7280"
                delay={0} 
                style={{ flex: 0.4 }} 
              />
            )}
          </Animated.View>
        )}
      </Animated.View>

      {/* ── Change Password ── */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(280)}
        style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
      >
        <Pressable onPress={() => setShowPasswordSection(!showPasswordSection)} style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconWrap, { backgroundColor: '#f5920820' }]}>
              <Ionicons name="key" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
          </View>
          <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} />
        </Pressable>

        {showPasswordSection && (
          <Animated.View entering={FadeInDown.duration(280)} style={styles.passwordBody}>
            <InlineMessage 
              text={passwordMsg} 
              type={passwordMsgType} 
              colors={colors} 
              onClose={() => setPasswordMsg(null)}
            />

            <Text style={[styles.passwordNote, { color: colors.textSecondary }]}>
              To change your password, an OTP code will be sent to your email for verification.
            </Text>

            <AnimatedInput icon="lock-closed-outline" label="New Password" value={newPassword} onChangeText={setNewPassword}
              placeholder="Enter new password" secureTextEntry={!showNewPass} delay={0} colors={colors}
              suffix={
                <Pressable onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                  <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </Pressable>
              }
            />

            <PasswordStrength password={newPassword} colors={colors} />

            <AnimatedInput icon="shield-checkmark-outline" label="Confirm New Password" value={confirmNewPassword}
              onChangeText={setConfirmNewPassword} placeholder="Re-enter new password" secureTextEntry delay={0} colors={colors}
              suffix={confirmNewPassword.length > 0 ? (
                <Ionicons name={newPassword === confirmNewPassword ? 'checkmark-circle' : 'close-circle'}
                  size={18} color={newPassword === confirmNewPassword ? '#22c55e' : '#ef4444'} />
              ) : null}
            />

            {!otpSent ? (
              <AnimatedButton onPress={handleSendPasswordOtp} label="Send OTP to Email" icon="mail"
                color="#f59e0b" loading={otpSending} delay={0}
                disabled={newPassword.length < 6 || newPassword !== confirmNewPassword}
              />
            ) : (
              <>
                <AnimatedInput icon="keypad-outline" label="OTP Code" value={passwordOtp} onChangeText={setPasswordOtp}
                  placeholder="Enter 6-digit code" keyboardType="number-pad" delay={0} colors={colors} />

                <AnimatedButton onPress={handleChangePassword} label="Change Password" icon="checkmark-circle"
                  color="#f59e0b" loading={passwordChanging} delay={0}
                  disabled={!passwordOtp || passwordOtp.length < 6}
                />

                <Pressable onPress={handleSendPasswordOtp} style={styles.resendRow}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.resendText, { color: colors.primary }]}>Resend OTP</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}
      </Animated.View>

      {/* ── Recent Activity ── */}
      {stats?.lastAnalysisDate && (
        <Animated.View
          entering={FadeInUp.delay(400).duration(280)}
          style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconWrap, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="pulse" size={20} color="#3b82f6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Last Activity</Text>
            </View>
          </View>
          <View style={styles.lastActivityRow}>
            <View style={[styles.activityIcon, { backgroundColor: '#2d6a4f15' }]}>
              <Ionicons name="camera" size={18} color="#2d6a4f" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityLabel, { color: colors.text }]}>Last analysis</Text>
              <Text style={[styles.activityDate, { color: colors.textTertiary }]}>
                {new Date(stats.lastAnalysisDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Logout ── */}
      <Animated.View entering={FadeInUp.delay(500).duration(280)}>
        <Pressable style={[styles.logoutBtn, { borderColor: '#ef444460' }]} onPress={logout}>
          <View style={[styles.logoutIconWrap, { backgroundColor: '#ef444415' }]}>
            <Ionicons name="log-out" size={18} color="#ef4444" />
          </View>
          <Text style={[styles.logoutBtnText, { color: '#ef4444' }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" style={{ marginLeft: 'auto' }} />
        </Pressable>
      </Animated.View>
    </View>
  );
}


// ════════════════════════════════════════════════
// MAIN ACCOUNT PAGE
// ════════════════════════════════════════════════
export default function AccountPage() {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading, isInitializing, pendingVerification, clearPendingVerification } = useAuth();
  const { isDesktop } = useResponsive();
  const [authMode, setAuthMode] = useState('login');

  // Show OTP verification screen if pending
  if (pendingVerification) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.otpPageCenter}>
        <OtpVerificationScreen
          email={pendingVerification.email}
          onBack={() => { clearPendingVerification(); setAuthMode('login'); }}
        />
      </ScrollView>
    );
  }

  // Loading state on boot only — does NOT trigger during login/register actions
  if (isInitializing) {
    return (
      <View style={[styles.container, styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {isAuthenticated && (
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#0f1a12'] : ['#f0fdf4', '#dcfce7']}
          style={styles.pageHeader}
        >
          <Animated.View entering={FadeInUp.duration(280)} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="person-circle" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>My Profile</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Manage your personal information and security
            </Text>
          </Animated.View>
        </LinearGradient>
      )}

      <View style={[
        styles.content,
        isAuthenticated && isDesktop && styles.contentDesktop,
        !isAuthenticated && styles.contentAuth,
      ]}>
        {isAuthenticated ? (
          <ProfileView />
        ) : authMode === 'login' ? (
          <LoginForm onSwitch={() => setAuthMode('register')} />
        ) : (
          <RegisterForm onSwitch={() => setAuthMode('login')} />
        )}
      </View>

      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}


// ════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body },

  /* Page Header */
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  headerContent: { gap: Spacing.sm },
  headerContentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerIcon: {
    width: 52, height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 450 },
  content: { padding: Spacing.lg },
  contentDesktop: {
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xxl,
  },
  contentAuth: { padding: 0 },

  /* Auth Layout */
  authLayout: {
    flexDirection: 'row',
    minHeight: 600,
    ...Platform.select({ web: { minHeight: '80vh' } }),
  },
  authLayoutMobile: { flexDirection: 'column', minHeight: 'auto' },
  authSidebar: { flex: 1, maxWidth: 460 },
  sidebarGradient: {
    flex: 1, padding: Spacing.xxl, justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
    borderRadius: BorderRadius.xl, margin: Spacing.lg,
  },
  sidebarContent: { zIndex: 1, gap: Spacing.md },
  sidebarIconBox: {
    width: 64, height: 64, borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  sidebarTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 40 },
  sidebarSubtitle: { fontSize: 16, lineHeight: 24, marginBottom: Spacing.md },
  featuresGrid: { gap: Spacing.sm },
  featureCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, ...Shadows.sm,
  },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { ...Typography.bodyMedium },
  featureDesc: { ...Typography.small, flex: 1 },
  featureStrip: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  featureChipText: { fontSize: 12, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: {
    flex: 1, minWidth: 100, padding: Spacing.md,
    borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },

  /* Form */
  authFormSide: { flex: 1 },
  authFormSideDesktop: { maxWidth: 520 },
  authFormScroll: {
    padding: Spacing.xl, paddingVertical: Spacing.xxl,
    justifyContent: 'center', flexGrow: 1,
  },
  formHeader: {
    alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xl,
  },
  formHeaderIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  formTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  formSubtitle: { ...Typography.body, textAlign: 'center', maxWidth: 320 },
  formBody: { gap: Spacing.md },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  inputGroup: { gap: 6 },
  inputLabel: { ...Typography.captionMedium, marginLeft: 4 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: BorderRadius.md,
    paddingRight: Spacing.md, overflow: 'hidden',
  },
  inputIconWrap: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'stretch',
    borderTopLeftRadius: BorderRadius.md - 2,
    borderBottomLeftRadius: BorderRadius.md - 2,
  },
  inputField: {
    flex: 1, ...Typography.body,
    paddingVertical: Platform.OS === 'web' ? 13 : 11,
    paddingHorizontal: Spacing.sm,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  eyeBtn: { padding: 4, ...Platform.select({ web: { cursor: 'pointer' } }) },
  rememberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  checkboxRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  rememberText: { ...Typography.small },
  forgotText: { ...Typography.small, fontWeight: '600' },
  termsRow: { marginTop: Spacing.xs },
  termsText: { ...Typography.small, lineHeight: 18 },
  btnGlowContainer: { position: 'relative' },
  btnGlow: {
    position: 'absolute', top: 4, left: 4, right: 4, bottom: -2,
    borderRadius: BorderRadius.md + 4,
    ...Platform.select({ web: { filter: 'blur(12px)' } }),
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 15, borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
    ...Shadows.md,
  },
  actionBtnText: { ...Typography.button, color: '#fff', fontSize: 16 },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.xs,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { ...Typography.small },
  socialRow: { flexDirection: 'row', gap: Spacing.sm },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 12, borderRadius: BorderRadius.md,
    borderWidth: 1.5, ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  socialBtnText: { fontWeight: '600', fontSize: 14 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.sm,
  },
  switchText: { ...Typography.caption },
  switchLink: { fontWeight: '700', fontSize: 14 },
  strengthContainer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: -4,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { ...Typography.tiny, fontWeight: '600', minWidth: 40 },
  errorHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  errorHintText: { color: '#ef4444', fontSize: 12, fontWeight: '500' },

  /* Inline message */
  inlineMsg: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, marginBottom: Spacing.sm,
  },
  inlineMsgText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  inlineMsgClose: {
    padding: 4,
    marginLeft: Spacing.xs,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },

  /* OTP Screen */
  otpPageCenter: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  otpContainer: {
    width: '100%', maxWidth: 440,
    borderRadius: BorderRadius.xl, ...Shadows.lg,
    overflow: 'hidden',
  },
  otpScroll: { padding: Spacing.xl, gap: Spacing.lg },
  otpHeader: { alignItems: 'center', gap: Spacing.sm },
  otpIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  otpTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  otpSubtitle: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  otpRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm,
  },
  otpBox: {
    width: 48, height: 56, borderRadius: BorderRadius.md,
    borderWidth: 2, fontSize: 22, fontWeight: '800',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  otpFooter: { alignItems: 'center', gap: 4 },
  otpFooterText: { ...Typography.small },
  otpResendText: { fontWeight: '700', fontSize: 14 },
  otpBackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingTop: Spacing.sm,
  },
  otpBackText: { ...Typography.small, fontWeight: '500' },

  /* Profile */
  profileWrapper: { gap: Spacing.lg },
  profileHero: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, paddingBottom: Spacing.lg,
    overflow: 'hidden', position: 'relative', ...Shadows.md,
  },
  heroInner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    zIndex: 1, marginBottom: Spacing.lg,
  },
  heroInnerMobile: { flexDirection: 'column', alignItems: 'center' },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  profileAvatar: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: '#fff' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.md,
  },
  pendingUploadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.lg,
  },
  heroInfo: { flex: 1, gap: 4 },
  heroInfoMobile: { alignItems: 'center', marginTop: Spacing.sm },
  profileName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  profileEmail: { ...Typography.body, marginBottom: 4 },
  heroBadges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },

  /* Quick Stats */
  quickStatsRow: { flexDirection: 'row', gap: Spacing.sm, zIndex: 1 },
  quickStatsRowMobile: { flexWrap: 'wrap' },
  quickStatCard: {
    flex: 1, minWidth: 90, padding: Spacing.md,
    borderRadius: BorderRadius.lg, alignItems: 'center', gap: 4,
    ...Shadows.sm,
  },
  quickStatValue: { fontSize: 18, fontWeight: '800' },
  quickStatLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Category chips */
  catChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    marginTop: Spacing.md, zIndex: 1,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catChipText: { fontSize: 12, fontWeight: '600' },

  /* Section Card */
  sectionCard: {
    borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.lg, ...Shadows.sm, gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { ...Typography.bodyMedium, fontSize: 16, fontWeight: '700' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.md,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },

  /* Profile fields grid */
  profileFieldsGrid: { gap: Spacing.md },
  profileFieldsGridDesktop: { flexDirection: 'row', gap: Spacing.md },
  fieldHalf: { flex: 1 },

  /* Profile actions */
  profileActions: {
    flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs,
  },

  /* Password section */
  passwordBody: { gap: Spacing.md, paddingTop: Spacing.sm },
  passwordNote: { ...Typography.small, lineHeight: 18 },
  resendRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  resendText: { fontSize: 13, fontWeight: '600' },

  /* Activity */
  lastActivityRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  activityIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  activityLabel: { ...Typography.bodyMedium },
  activityDate: { ...Typography.small, marginTop: 2 },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg, borderWidth: 1.5,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  logoutIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnText: { ...Typography.button },
});
