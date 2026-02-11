# Talisay AI - Expo Go Mobile-First Web Application
## Comprehensive Project Specification

---

## 📋 Project Overview

Build a mobile-first, cross-platform application using **Expo Go** that showcases information about Terminalia Catappa (Talisay fruit). The application must be deployable as both a **web application** and an **Android APK**, featuring a clean, minimal, and aesthetically pleasing design inspired by modern SaaS recruitment platforms.

---

## 🎯 Core Requirements

### Platform Specifications
- **Framework**: Expo (React Native for Web compatibility)
- **Primary Target**: Mobile devices (mobile-first approach)
- **Secondary Target**: Desktop/tablet responsive layouts
- **Deployment**: Web + Android APK via Expo Go
- **Theme Support**: Dark mode and Light mode with smooth transitions

### Design Philosophy
- **Minimal & Clean**: Inspired by the attached recruitment platform design
- **User-Friendly**: Intuitive navigation and interactions
- **Aesthetically Pleasing**: Modern UI with smooth animations
- **Responsive**: Seamless experience across all screen sizes
- **Accessible**: WCAG 2.1 compliant

---

## 🎨 Design Reference

The design should emulate the style shown in the attached images:
- Clean white/light backgrounds (light mode) with potential dark alternatives
- Card-based layouts with subtle shadows
- Smooth rounded corners (border-radius: 8-12px)
- Clear typography hierarchy
- Ample white space
- Data visualization with charts and statistics
- Color scheme inspired by professional dashboard aesthetics
- Icons for visual communication
- Status badges (similar to "Open", "Hold", "Closed" badges)

### Color Palette Suggestions
**Light Mode:**
- Primary: Professional blue (#667EEA or similar)
- Background: White (#FFFFFF)
- Card backgrounds: Light gray (#F7FAFC)
- Text primary: Dark gray (#2D3748)
- Text secondary: Medium gray (#718096)
- Accents: Orange (#F6AD55), Green (#48BB78), Red (#FC8181)

**Dark Mode:**
- Primary: Bright blue (#7C3AED)
- Background: Dark navy (#1A202C)
- Card backgrounds: Lighter navy (#2D3748)
- Text primary: White (#F7FAFC)
- Text secondary: Light gray (#A0AEC0)
- Accents: Maintain similar hues with adjusted brightness

---

## 🏗️ Technical Stack

### Required Technologies
```json
{
  "core": "Expo SDK (latest stable)",
  "navigation": "React Navigation 6+",
  "ui": "React Native Paper or NativeBase (dark mode support)",
  "forms": "React Hook Form",
  "stateManagement": "React Context API or Zustand",
  "carousel": "react-native-snap-carousel or similar",
  "charts": "Victory Native or React Native Chart Kit",
  "icons": "Expo vector-icons",
  "images": "Expo Image",
  "theme": "Custom theme provider with dark/light toggle"
}
```

### Recommended Libraries
- **expo-router** - For file-based routing
- **react-native-reanimated** - For smooth animations
- **react-native-gesture-handler** - For gesture interactions
- **expo-web-browser** - For external links
- **expo-linking** - For deep linking
- **react-native-safe-area-context** - For safe area handling

---

## 🧭 Navigation Structure

### Header Component
- **Logo**: 
  - 3D effect with layering (z-index elevation)
  - Size: Larger than standard (e.g., 80-100px height on desktop, 60-70px on mobile)
  - Position: Overlays the navigation menu and content
  - Interactive: Clickable, navigates to Home page
  - Design: Image file (PNG/SVG with transparency)
  - Animation: Subtle hover effect (scale or glow)
  - Shadow/depth: Drop shadow or multiple layers for 3D effect

### Navigation Menu
- **Layout**: Horizontal menu bar below the header logo
- **Style**: Similar to attached image navigation (clean tabs/buttons)
- **Responsive**: Converts to hamburger menu on mobile
- **Active State**: Clear visual indicator for current page

### Menu Items & Pages

#### 1. **Home** 
   - Hero Section with Terminalia Catappa Carousel
   - Quick stats/overview cards
   - Recent updates section
   
#### 2. **Grade** 
   - Grading system information
   - Classification details
   - Visual grade comparisons
   
#### 3. **History** 
   - Timeline of Talisay research/usage
   - Historical significance
   - Cultural context
   
#### 4. **Admin** 
   - Dashboard with analytics
   - Nested: Analytics page
   - Charts and statistics (inspired by profile value chart in reference)
   - User management (if applicable)
   - Content management
   
#### 5. **About Us** 
   - Team information
   - Mission and vision
   - Nested: Contact Us/Information
   - Location details (similar to locations in reference)
   - Contact form
   
#### 6. **Account** 
   - Profile page
   - Dropdown menu with:
     - Login
     - Logout
     - Register
   - User settings
   - Theme toggle (Dark/Light mode)
   
#### 7. **About Talisay** 
   - Comprehensive information about Terminalia Catappa
   - Scientific classification
   - Nutritional information
   - Health benefits
   - Growing conditions
   - Image gallery
   
#### 8. **Publication** 
   - Two categories:
     - Local Publications
     - Foreign Publications
   - Filterable/sortable list
   - Card layout (similar to job openings in reference)
   - PDF viewer or external links

---

## 🏠 Home Page - Hero Section Specifications

### Carousel Requirements
- **Content**: High-quality images of Terminalia Catappa (fruit, tree, leaves, etc.)
- **Layout**: 
  - Full-width (no margins, no padding on left/right edges)
  - Height: 60-70vh on desktop, 50vh on mobile
  - Images should fill the available space (cover fit)
  
- **Features**:
  - Auto-play with 4-5 second intervals
  - Manual navigation (swipe on mobile, arrows on desktop)
  - Pagination dots indicator
  - Smooth transitions (fade or slide)
  
- **Captions**:
  - Overlay text on images (with semi-transparent backdrop for readability)
  - Position: Bottom third of image or side panel
  - Content: Descriptive text about the specific image/aspect of Talisay
  - Typography: Large, readable font with contrast
  
- **Responsive Behavior**:
  - Mobile: Touch swipe gestures, stacked layout
  - Desktop: Arrow navigation, hover effects
  - Maintain aspect ratio across devices

### Below Hero Section
- Statistics cards (similar to reference: Recurring Revenue, Total Employees, etc.)
  - Could show: Total species info, Research papers, Locations found, etc.
- Quick navigation cards
- Latest updates/news feed

---

## 📱 Responsive Design Specifications

### Mobile First Approach (320px - 767px)
- Single column layouts
- Hamburger menu for navigation
- Touch-friendly button sizes (min 44x44px)
- Stacked cards
- Full-width components
- Larger font sizes for readability
- Bottom navigation option for quick access

### Tablet (768px - 1023px)
- Two-column grid layouts
- Hybrid navigation (partial horizontal menu + hamburger)
- Adjusted spacing
- Responsive cards (2 per row)

### Desktop (1024px+)
- Multi-column layouts (3-4 columns)
- Full horizontal navigation
- Hover states and interactions
- Sidebar options
- Maximum content width (e.g., 1400px) with centered layout
- Responsive cards (3-4 per row)

---

## 🎭 3D Logo Header Implementation

### Technical Approach
```javascript
// Pseudo-code structure
<View style={styles.headerContainer}>
  {/* Navigation Menu Layer */}
  <View style={styles.navigationBar}>
    {/* Menu items */}
  </View>
  
  {/* 3D Logo Overlay */}
  <Pressable 
    style={styles.logoContainer}
    onPress={() => navigation.navigate('Home')}
  >
    <Image 
      source={require('./assets/logo-3d.png')}
      style={styles.logo3D}
    />
    {/* Shadow layers for depth effect */}
    <View style={styles.logoShadow1} />
    <View style={styles.logoShadow2} />
  </Pressable>
</View>
```

### Styling Specifications
- **Z-Index**: Logo at z-index: 1000, Navigation at z-index: 100
- **Position**: Absolute or fixed positioning for logo
- **Shadow**: Multiple shadow layers (elevation on Android, shadowOffset on iOS)
- **Transform**: Slight rotation or perspective for 3D effect
- **Animation**: React Native Reanimated for smooth hover/press animations

---

## 🌓 Dark Mode / Light Mode Implementation

### Theme Provider Structure
```javascript
// Theme Context
const ThemeContext = {
  light: {
    background: '#FFFFFF',
    card: '#F7FAFC',
    text: '#2D3748',
    primary: '#667EEA',
    // ... all color tokens
  },
  dark: {
    background: '#1A202C',
    card: '#2D3748',
    text: '#F7FAFC',
    primary: '#7C3AED',
    // ... all color tokens
  }
}
```

### Toggle Component
- Accessible toggle switch (React Native Paper or custom)
- Position: In Account page or header
- Persist preference: AsyncStorage
- System preference detection: `expo-appearance`
- Smooth transition animations between themes

---

## 📊 Component Examples (Based on Reference Design)

### Statistics Card
```javascript
<StatsCard
  icon="currency-usd"
  label="Recurring Revenue"
  value="2.5 B"
  color="blue"
/>
```

### Profile Section (Adaptable for About sections)
- Header image (banner)
- Profile/logo image
- Title and subtitle
- Social media links
- Key statistics in grid layout

### List Items (Publications, History entries)
- Card with status badge
- Title and category
- Secondary information (location, date, etc.)
- Action button or icon

### Chart Component (For Admin Analytics)
- Line charts for trends over time
- Bar charts for comparisons
- Donut/pie charts for distributions (gender ratio example)
- Time range filters (12 months, 30 days, 7 days)

---

## 🔐 Authentication Flow (For Account Page)

### Pages Needed
1. **Login Page**: Email/password, social login options
2. **Register Page**: Sign up form, terms acceptance
3. **Profile Page**: User information display/edit
4. **Logout**: Clear session, redirect to home

### States
- Authenticated: Show profile, logout option
- Unauthenticated: Show login/register options
- Loading: Show spinner/skeleton

---

## 📄 Content Pages Structure

### About Talisay Page
```
- Hero image of Talisay
- Quick facts sidebar
  - Scientific name: Terminalia catappa
  - Common names: Talisay, Indian Almond, etc.
  - Family: Combretaceae
  
- Sections:
  - Description
  - Distribution & Habitat
  - Botanical Characteristics
  - Nutritional Value
  - Medicinal Uses
  - Cultural Significance
  - Cultivation Tips
  - Gallery (grid of images)
  - References
```

### Publication Page
```
- Filter bar (Local/Foreign, Year, Topic)
- Search functionality
- Card grid layout
  - Publication title
  - Authors
  - Year
  - Category badge
  - Abstract preview
  - Link/PDF icon
- Pagination or infinite scroll
```

---

## 🚀 Performance Considerations

- **Image Optimization**: Use Expo Image with proper sizing and lazy loading
- **Code Splitting**: Dynamic imports for pages
- **Caching**: Cache images and API responses
- **Bundle Size**: Use Hermes JavaScript engine
- **Animations**: Use native driver for smooth 60fps animations
- **Web Optimization**: Use react-native-web optimizations

---

## 📦 Project Structure

```
talisay-ai-app/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx             # Home
│   │   ├── grade.tsx             # Grade
│   │   ├── history.tsx           # History
│   │   ├── admin.tsx             # Admin
│   │   ├── about-us.tsx          # About Us
│   │   ├── account.tsx           # Account
│   │   ├── about-talisay.tsx     # About Talisay
│   │   └── publication.tsx       # Publication
│   └── _layout.tsx               # Root layout
├── components/
│   ├── Header.tsx                # 3D Logo Header
│   ├── Navigation.tsx            # Menu Navigation
│   ├── Hero/
│   │   ├── Carousel.tsx          # Image carousel
│   │   └── CarouselItem.tsx
│   ├── Cards/
│   │   ├── StatsCard.tsx
│   │   ├── PublicationCard.tsx
│   │   └── InfoCard.tsx
│   ├── Charts/
│   │   ├── LineChart.tsx
│   │   └── PieChart.tsx
│   └── ThemeToggle.tsx
├── contexts/
│   ├── ThemeContext.tsx          # Theme provider
│   └── AuthContext.tsx           # Auth state
├── constants/
│   ├── Colors.ts                 # Color palette
│   └── Layout.ts                 # Layout constants
├── assets/
│   ├── images/
│   │   ├── logo-3d.png
│   │   └── talisay/              # Talisay images
│   └── fonts/
├── hooks/
│   ├── useTheme.ts
│   └── useResponsive.ts
└── app.json                      # Expo configuration
```

---

## 🎨 Design System Tokens

### Typography
```javascript
{
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  body: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 }
}
```

### Spacing Scale
```javascript
{
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
}
```

### Border Radius
```javascript
{
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  full: 9999
}
```

---

## ✅ Development Phases

### Phase 1: Foundation
- [ ] Set up Expo project with TypeScript
- [ ] Configure navigation structure
- [ ] Implement theme provider (dark/light)
- [ ] Create base components (Header, Navigation)
- [ ] Design 3D logo and implement overlay effect
- [ ] Set up responsive breakpoints

### Phase 2: Core Pages
- [ ] Home page with hero carousel
- [ ] About Talisay page with content sections
- [ ] Grade page
- [ ] History page
- [ ] About Us page with contact form

### Phase 3: Advanced Features
- [ ] Admin dashboard with analytics
- [ ] Publication page with filtering
- [ ] Account system (login/register/profile)
- [ ] Dark mode refinement
- [ ] Animations and transitions

### Phase 4: Polish & Optimization
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Cross-browser testing
- [ ] Mobile responsiveness fine-tuning
- [ ] APK build and testing

---

## 📱 Expo Configuration (app.json)

```json
{
  "expo": {
    "name": "Talisay AI",
    "slug": "talisay-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "platforms": ["ios", "android", "web"],
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.talisayai.app"
    }
  }
}
```

---

## 🎯 Key Features Checklist

### Must-Have Features
- ✅ Mobile-first responsive design
- ✅ Dark/Light mode with toggle
- ✅ 3D logo header with overlay effect
- ✅ Home page hero carousel (full-width, captioned)
- ✅ Horizontal navigation menu
- ✅ 8 main pages with proper routing
- ✅ Admin analytics with charts
- ✅ Publication filtering system
- ✅ Account system (login/register/profile)
- ✅ Contact form in About Us
- ✅ Smooth animations and transitions

### Nice-to-Have Features
- 🔸 Progressive Web App (PWA) support
- 🔸 Offline mode with cached content
- 🔸 Push notifications
- 🔸 Multi-language support
- 🔸 Search functionality across pages
- 🔸 Share functionality for publications
- 🔸 Bookmarking system
- 🔸 User comments/reviews section

---

## 🎨 Visual Design Guidelines

### Consistency
- Maintain 8-12px border radius throughout
- Use consistent icon set (e.g., Ionicons)
- Apply consistent spacing (8px base unit)
- Follow color palette strictly

### Visual Hierarchy
- Clear heading structure (H1 > H2 > H3)
- Primary actions use primary color
- Secondary actions use outline or ghost buttons
- Destructive actions use red accent

### Feedback & States
- Loading states for async operations
- Empty states with helpful messages
- Error states with recovery suggestions
- Success confirmations (toast/snackbar)

### Micro-interactions
- Button press animations (scale down slightly)
- Hover effects on desktop (color shift, shadow)
- Smooth page transitions
- Pull-to-refresh on mobile
- Skeleton loaders for content loading

---

## 🔍 Accessibility Requirements

- Screen reader support
- Proper heading hierarchy
- Sufficient color contrast (WCAG AA minimum)
- Touch targets minimum 44x44px
- Keyboard navigation support (web)
- Alt text for all images
- ARIA labels where needed
- Focus indicators
- Form validation with clear error messages

---

## 📊 Sample Data Structures

### Talisay Information
```typescript
interface TalisayInfo {
  scientificName: string;
  commonNames: string[];
  family: string;
  description: string;
  habitat: string;
  distribution: string[];
  characteristics: {
    height: string;
    bark: string;
    leaves: string;
    flowers: string;
    fruits: string;
  };
  nutritionalValue: NutritionalData[];
  medicinalUses: string[];
  culturalSignificance: string;
  images: ImageData[];
}
```

### Publication
```typescript
interface Publication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  category: 'local' | 'foreign';
  abstract: string;
  pdfUrl?: string;
  externalUrl?: string;
  keywords: string[];
}
```

### User Profile
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
  };
}
```

---

## 🚀 Getting Started Commands

```bash
# Install Expo CLI
npm install -g expo-cli

# Create new Expo project with TypeScript
npx create-expo-app talisay-ai-app --template expo-template-blank-typescript

# Navigate to project
cd talisay-ai-app

# Install dependencies
npx expo install react-navigation @react-navigation/native @react-navigation/native-stack
npx expo install react-native-paper react-native-safe-area-context
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install expo-image expo-linking expo-web-browser

# Start development server
npx expo start

# Run on web
npx expo start --web

# Build APK
eas build -p android --profile preview
```

---

## 📝 Final Notes

### Design Inspiration Summary
The attached recruitment platform images showcase:
- Clean card-based layouts
- Professional color schemes
- Clear data visualization
- Status indicators with color coding
- Multi-column responsive grids
- Tabbed navigation
- Profile/detail pages with statistics
- List views with action items

**Apply these patterns to the Talisay AI application while maintaining the scientific/educational nature of the content.**

### Brand Identity
- **Name**: Talisay AI
- **Focus**: Terminalia Catappa (Talisay fruit) information and research
- **Tone**: Educational, scientific, accessible
- **Visual Style**: Modern, clean, nature-inspired with professional dashboard elements

### Success Criteria
1. ✅ Application runs smoothly on Expo Go (mobile and web)
2. ✅ All 8 pages are functional and navigable
3. ✅ Hero carousel works flawlessly with captions
4. ✅ 3D logo effect is visually impressive and functional
5. ✅ Dark/light modes work seamlessly
6. ✅ Mobile experience is prioritized and polished
7. ✅ Desktop experience is fully responsive
8. ✅ Design matches the minimal, aesthetic style of references
9. ✅ Admin analytics display meaningful data visualizations
10. ✅ Account system allows login/logout/register flows

---

## 📞 Questions for Clarification (If Needed)

1. Should the Admin section require authentication?
2. What specific analytics should be shown in the Admin page?
3. Should publications be stored locally or fetched from an API?
4. Any specific branding colors or is the suggested palette acceptable?
5. Should the app support offline functionality?
6. Are there existing APIs or backends to integrate with?
7. What image assets are available for the Talisay carousel?
8. Should user registration include email verification?

---

**End of Comprehensive Project Specification**

This document serves as the complete blueprint for developing the Talisay AI Expo Go application. Follow each section methodically, prioritize mobile-first development, and refer to the attached design references for visual guidance.
