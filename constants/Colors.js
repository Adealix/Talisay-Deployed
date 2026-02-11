/**
 * Talisay AI — Design Token Color System
 * Inspired by the recruitment platform reference with nature-themed accents.
 */

const palette = {
  // Brand
  emerald: '#2d6a4f',
  emeraldLight: '#40916c',
  emeraldDark: '#1b4332',
  leaf: '#52b788',
  leafMuted: '#74c69d',
  gold: '#d4a24e',
  goldLight: '#e9c46a',
  amber: '#f4a261',

  // Neutrals
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',

  // Accents
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  indigo: '#667eea',
  red: '#ef4444',
  redLight: '#fc8181',
  green: '#22c55e',
  greenLight: '#48bb78',
  orange: '#f97316',
  orangeLight: '#f6ad55',
  purple: '#7c3aed',
  teal: '#14b8a6',
};

export const Colors = {
  light: {
    // Backgrounds
    background: '#fafdf7',
    backgroundSecondary: palette.gray50,
    surface: palette.white,
    surfaceElevated: palette.white,
    card: palette.white,
    cardHover: palette.gray50,

    // Brand
    primary: palette.emerald,
    primaryLight: palette.emeraldLight,
    primaryDark: palette.emeraldDark,
    secondary: palette.gold,
    secondaryLight: palette.goldLight,
    accent: palette.leaf,
    accentMuted: palette.leafMuted,

    // Text
    text: palette.gray900,
    textSecondary: palette.gray600,
    textTertiary: palette.gray400,
    textInverse: palette.white,
    textOnPrimary: palette.white,

    // Borders
    border: palette.gray200,
    borderLight: palette.gray100,
    borderFocus: palette.emerald,

    // Status
    success: palette.green,
    warning: palette.amber,
    error: palette.red,
    info: palette.blue,

    // Navigation
    navBackground: palette.white,
    navText: palette.gray700,
    navTextActive: palette.emerald,
    navIndicator: palette.emerald,
    navBorder: palette.gray200,

    // Header
    headerBackground: palette.emeraldDark,
    headerText: palette.white,

    // Shadows
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowColorStrong: 'rgba(0,0,0,0.15)',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',
    overlayLight: 'rgba(0,0,0,0.3)',

    // Input
    inputBackground: palette.white,
    inputBorder: palette.gray300,
    inputText: palette.gray900,
    inputPlaceholder: palette.gray400,

    // Misc
    divider: palette.gray200,
    skeleton: palette.gray200,
    badge: palette.emerald,
    badgeText: palette.white,
    tabBarBackground: palette.white,
    statusBar: 'dark',
  },
  dark: {
    // Backgrounds
    background: '#0f1a12',
    backgroundSecondary: '#162118',
    surface: '#1a2b1f',
    surfaceElevated: '#213527',
    card: '#1a2b1f',
    cardHover: '#213527',

    // Brand
    primary: palette.leaf,
    primaryLight: palette.leafMuted,
    primaryDark: palette.emerald,
    secondary: palette.goldLight,
    secondaryLight: palette.gold,
    accent: palette.leafMuted,
    accentMuted: palette.emeraldLight,

    // Text
    text: '#e8f5e2',
    textSecondary: '#a3c4a8',
    textTertiary: '#6b8f70',
    textInverse: palette.gray900,
    textOnPrimary: palette.gray900,

    // Borders
    border: '#2a3d2e',
    borderLight: '#213527',
    borderFocus: palette.leaf,

    // Status
    success: palette.greenLight,
    warning: palette.goldLight,
    error: palette.redLight,
    info: palette.blueLight,

    // Navigation
    navBackground: '#162118',
    navText: '#a3c4a8',
    navTextActive: palette.leaf,
    navIndicator: palette.leaf,
    navBorder: '#2a3d2e',

    // Header
    headerBackground: '#0f1a12',
    headerText: '#e8f5e2',

    // Shadows
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowColorStrong: 'rgba(0,0,0,0.5)',

    // Overlays
    overlay: 'rgba(0,0,0,0.7)',
    overlayLight: 'rgba(0,0,0,0.5)',

    // Input
    inputBackground: '#213527',
    inputBorder: '#2a3d2e',
    inputText: '#e8f5e2',
    inputPlaceholder: '#6b8f70',

    // Misc
    divider: '#2a3d2e',
    skeleton: '#213527',
    badge: palette.leaf,
    badgeText: palette.gray900,
    tabBarBackground: '#162118',
    statusBar: 'light',
  },
};

export const Gradients = {
  light: {
    hero: ['rgba(45,106,79,0.85)', 'rgba(27,67,50,0.92)'],
    card: ['#ffffff', '#f9fafb'],
    header: ['#1b4332', '#2d6a4f'],
    overlay: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)'],
    accent: ['#52b788', '#40916c'],
  },
  dark: {
    hero: ['rgba(15,26,18,0.9)', 'rgba(26,43,31,0.95)'],
    card: ['#1a2b1f', '#213527'],
    header: ['#0f1a12', '#162118'],
    overlay: ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)'],
    accent: ['#74c69d', '#52b788'],
  },
};

export default Colors;
