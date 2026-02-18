/**
 * Talisay Oil — About Us Page
 * Real team members from TUP-Taguig, mission, vision, contact form.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  StyleSheet,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { Spacing, Shadows, BorderRadius, Typography, Layout as LayoutConst } from '../constants/Layout';
import { teamMembers, tupInfo } from '../data/team';
import { LOGOS } from '../constants/images';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MEMBER_COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#f97316'];

const LOCATIONS = [
  {
    office: 'Technological University of the Philippines - Taguig',
    city: 'Taguig City, Metro Manila',
    address: 'Km 14, East Service Road, Western Bicutan, Taguig',
    icon: 'school',
    color: '#2d6a4f',
  },
];

const SOCIAL_LINKS = [
  { icon: 'logo-linkedin', color: '#0077b5', label: 'LinkedIn' },
  { icon: 'logo-twitter', color: '#1da1f2', label: 'Twitter' },
  { icon: 'logo-github', color: '#333', label: 'GitHub' },
  { icon: 'mail', color: '#ea4335', label: 'Email' },
];

function TeamCard({ member, index }) {
  const { colors, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const memberColor = MEMBER_COLORS[index % MEMBER_COLORS.length];

  // Use theme-aware image if available (member1 has day/night variants)
  const displayImage = isDark
    ? (member.nightImage || member.image)
    : (member.dayImage || member.image);

  return (
    <Animated.View
      entering={ZoomIn.delay(200 + index * 100).duration(280)}
      style={[styles.teamCard, {
        backgroundColor: colors.card,
        borderColor: colors.borderLight,
        ...Shadows.md,
      }]}
    >
      {/* Photo */}
      <View style={[styles.teamAvatarWrap, { borderColor: memberColor }]}>
        <Image
          source={displayImage}
          style={styles.teamAvatarImg}
          resizeMode="cover"
        />
      </View>

      {/* Number badge */}
      <View style={[styles.numberBadge, { backgroundColor: memberColor }]}>
        <Text style={styles.numberBadgeText}>{String(index + 1).padStart(2, '0')}</Text>
      </View>

      <Text style={[styles.teamName, { color: colors.text }]}>{member.name}</Text>
      <Text style={[styles.teamRole, { color: colors.textSecondary }]}>{member.role}</Text>
      <Text style={[styles.teamBio, { color: colors.textTertiary }]} numberOfLines={2}>{member.bio}</Text>

      {/* Contact details */}
      {member.age != null && (
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>Age: {member.age}</Text>
        </View>
      )}
      {member.contactNumber && (
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>{member.contactNumber}</Text>
        </View>
      )}

      {/* Social icons */}
      <View style={styles.socialsRow}>
        {member.github && (
          <Pressable style={[styles.socialIcon, { backgroundColor: (isDark ? '#333' : '#f3f4f6') }]}>
            <Ionicons name="logo-github" size={16} color={isDark ? '#ccc' : '#374151'} />
          </Pressable>
        )}
        {member.facebook && (
          <Pressable style={[styles.socialIcon, { backgroundColor: (isDark ? '#1a2744' : '#e8f0fe') }]}>
            <Ionicons name="logo-facebook" size={16} color="#1877f2" />
          </Pressable>
        )}
        {member.instagram && (
          <Pressable style={[styles.socialIcon, { backgroundColor: (isDark ? '#2d1a33' : '#fce7f3') }]}>
            <Ionicons name="logo-instagram" size={16} color="#e4405f" />
          </Pressable>
        )}
        {member.gmail && (
          <Pressable
            style={[styles.socialIcon, { backgroundColor: (isDark ? '#2d1a1a' : '#fef2f2') }]}
            onPress={() => Linking.openURL(`mailto:${member.gmail}`).catch(() => {})}
          >
            <Ionicons name="mail-outline" size={16} color="#ea4335" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

function LocationCard({ location, index }) {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInUp.delay(300 + index * 100).duration(280)}
      style={[styles.locationCard, {
        backgroundColor: colors.card,
        borderColor: colors.borderLight,
        ...Shadows.sm,
      }]}
    >
      <View style={[styles.locationIcon, { backgroundColor: location.color + '15' }]}>
        <Ionicons name={location.icon} size={20} color={location.color} />
      </View>
      <View style={styles.locationInfo}>
        <Text style={[styles.locationName, { color: colors.text }]}>{location.office}</Text>
        <Text style={[styles.locationCity, { color: colors.primary }]}>{location.city}</Text>
        <Text style={[styles.locationAddr, { color: colors.textTertiary }]}>{location.address}</Text>
      </View>
    </Animated.View>
  );
}

export default function AboutUsPage() {
  const { colors, isDark, gradients } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const btnScale = useSharedValue(1);

  const handleSubmit = () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    Alert.alert('Message Sent', 'Thank you for reaching out! We will get back to you soon.');
    setContactForm({ name: '', email: '', message: '' });
  };

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Page Header */}
      <LinearGradient
        colors={isDark ? ['#1a2b1f', '#0f1a12'] : ['#fdf2f8', '#fce7f3']}
        style={styles.pageHeader}
      >
        <Animated.View entering={FadeInUp.duration(280)} style={[styles.headerContent, isDesktop && styles.headerContentDesktop]}>
          <View style={[styles.headerIcon, { backgroundColor: '#ec4899' + '20' }]}>
            <Ionicons name="people" size={28} color="#ec4899" />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>About Us</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            A passionate team of researchers, developers, and botanists dedicated to preserving Terminalia Catappa knowledge
          </Text>
        </Animated.View>
      </LinearGradient>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* TUP University Section */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(280)}
          style={[styles.tupSection, {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            ...Shadows.md,
          }]}
        >
          <Image source={LOGOS.tupT} style={styles.tupLogo} resizeMode="contain" />
          <View style={styles.tupText}>
            <Text style={[styles.tupName, { color: colors.text }]}>{tupInfo.name}</Text>
            <Text style={[styles.tupDesc, { color: colors.textSecondary }]}>{tupInfo.description}</Text>
          </View>
        </Animated.View>

        {/* Mission & Vision */}
        <View style={[styles.missionRow, isMobile && styles.missionRowMobile]}>
          <Animated.View
            entering={FadeInLeft.delay(150).duration(280)}
            style={[styles.missionCard, {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              ...Shadows.md,
            }]}
          >
            <Ionicons name="compass" size={28} color="#2d6a4f" />
            <Text style={[styles.missionTitle, { color: colors.text }]}>Our Mission</Text>
            <Text style={[styles.missionText, { color: colors.textSecondary }]}>
              To leverage artificial intelligence and modern technology in classifying Talisay fruit maturity and predicting oil yield, supporting TUP-Taguig research initiatives.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInRight.delay(200).duration(280)}
            style={[styles.missionCard, {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              ...Shadows.md,
            }]}
          >
            <Ionicons name="eye" size={28} color="#3b82f6" />
            <Text style={[styles.missionTitle, { color: colors.text }]}>Our Vision</Text>
            <Text style={[styles.missionText, { color: colors.textSecondary }]}>
              An accessible, AI-powered Talisay Oil Yield Predictor that empowers researchers and the agricultural sector to optimize oil extraction from Terminalia catappa fruits.
            </Text>
          </Animated.View>
        </View>

        {/* Team */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Our Team</Text>
        <View style={[styles.teamGrid, isMobile && styles.teamGridMobile]}>
          {teamMembers.map((member, idx) => (
            <TeamCard key={member.id} member={member} index={idx} />
          ))}
        </View>

        {/* Locations */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>Locations</Text>
        <View style={[styles.locationsGrid, isMobile && styles.locationsGridMobile]}>
          {LOCATIONS.map((loc, idx) => (
            <LocationCard key={loc.office} location={loc} index={idx} />
          ))}
        </View>

        {/* Social Links */}
        <Animated.View entering={FadeInUp.delay(500).duration(280)} style={styles.socialSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            {SOCIAL_LINKS.map((link, idx) => (
              <Animated.View key={link.label} entering={ZoomIn.delay(550 + idx * 60).duration(280)}>
                <Pressable
                  style={[styles.socialBtn, { backgroundColor: link.color + '15' }]}
                >
                  <Ionicons name={link.icon} size={22} color={link.color} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Contact Form */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(280)}
          style={[styles.contactCard, {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            ...Shadows.md,
          }]}
        >
          <Ionicons name="mail-open" size={28} color={colors.primary} />
          <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Us</Text>
          <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
            Have questions? We'd love to hear from you.
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              }]}
              value={contactForm.name}
              onChangeText={(t) => setContactForm(s => ({ ...s, name: t }))}
              placeholder="Your name"
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              }]}
              value={contactForm.email}
              onChangeText={(t) => setContactForm(s => ({ ...s, email: t }))}
              placeholder="your@email.com"
              placeholderTextColor={colors.inputPlaceholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              }]}
              value={contactForm.message}
              onChangeText={(t) => setContactForm(s => ({ ...s, message: t }))}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <AnimatedPressable
            onPress={handleSubmit}
            onPressIn={() => { btnScale.value = withSpring(0.95); }}
            onPressOut={() => { btnScale.value = withSpring(1); }}
            style={[btnStyle, styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Send Message</Text>
          </AnimatedPressable>
        </Animated.View>
      </View>

      <View style={{ height: Spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  headerContent: { gap: Spacing.sm },
  headerContentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center', width: '100%',
  },
  headerIcon: {
    width: 52, height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pageTitle: { ...Typography.h1 },
  pageSubtitle: { ...Typography.body, maxWidth: 550 },
  content: { padding: Spacing.lg },
  contentDesktop: {
    maxWidth: LayoutConst.maxContentWidth,
    alignSelf: 'center', width: '100%',
    paddingHorizontal: Spacing.xxl,
  },
  tupSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  tupLogo: {
    width: 72,
    height: 72,
  },
  tupText: {
    flex: 1,
    gap: Spacing.xs,
  },
  tupName: {
    ...Typography.h4,
  },
  tupDesc: {
    ...Typography.caption,
    lineHeight: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  missionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  missionRowMobile: { flexDirection: 'column' },
  missionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  missionTitle: { ...Typography.h4 },
  missionText: { ...Typography.caption, lineHeight: 22 },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  teamGridMobile: { gap: Spacing.sm },
  teamCard: {
    width: '47%',
    minWidth: 160,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
    flexGrow: 1,
    position: 'relative',
  },
  teamAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  teamAvatarImg: {
    width: '100%',
    height: '100%',
  },
  numberBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  teamName: { ...Typography.bodyMedium, textAlign: 'center' },
  teamRole: { ...Typography.small, textAlign: 'center' },
  teamBio: { ...Typography.small, textAlign: 'center', lineHeight: 18 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
  },
  socialsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  socialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  locationsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  locationsGridMobile: { flexDirection: 'column' },
  locationCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  locationIcon: {
    width: 40, height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  locationInfo: { flex: 1, gap: 2 },
  locationName: { ...Typography.bodyMedium },
  locationCity: { ...Typography.captionMedium },
  locationAddr: { ...Typography.small },
  socialSection: { marginTop: Spacing.xl },
  socialLinks: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialBtn: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  contactCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  contactTitle: { ...Typography.h3 },
  contactSubtitle: { ...Typography.caption },
  formGroup: { gap: Spacing.xs },
  formLabel: { ...Typography.captionMedium },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    ...Typography.body,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  submitBtnText: {
    ...Typography.button,
    color: '#fff',
  },
});
