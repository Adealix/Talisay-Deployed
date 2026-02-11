# Quick Start - Talisay ML Web Layout

## 🎯 What Was Done

Your Talisay ML project now has the **exact same look and design** as DaingGrader Web, including:
- ✅ TUP-T logo in top-left header
- ✅ Collapsible sidebar navigation (expands/collapses)
- ✅ Hero carousel with images and text panels
- ✅ Professional header with logos and user actions
- ✅ Smooth animations and transitions
- ✅ **Fully responsive** - works on desktop AND mobile!

## 🚀 Run the Project

### Start Expo
```bash
cd D:\talisay_ml
npx expo start
```

This will start the Expo development server and show you options to:
- Press `w` - Open in web browser
- Press `a` - Open on Android device/emulator
- Press `i` - Open on iOS device/simulator
- Scan QR code with Expo Go app

### Just Web
```bash
npx expo start --web
```

The app will open in your browser at `http://localhost:8081`

## 🎨 What You'll See

### On Desktop/Laptop (Web)
1. **Top Header Bar** (fixed at top)
   - Hamburger menu button (toggle sidebar)
   - TUP-T logo + Talisay ML logo
   - "Talisay ML - Oil Yield Prediction System" title
   - Login, Sign Up, Profile buttons on the right

2. **Sidebar** (left side, dark blue)
   - On desktop (>1024px): Always visible, toggles between expanded (256px) and collapsed (64px)
   - On mobile (<1024px): Hidden by default, slides in from left when hamburger clicked
   - Navigation items: Home, Scan, History, Proposal, About Us, Profile
   - Talisay logo at the top
   - Login button at the bottom

3. **Hero Carousel** (full-width at top)
   - 4 rotating image slides
   - Auto-plays every 5 seconds
   - Dark panel overlay with title and description
   - Dot navigation to jump between slides

4. **Quick Actions & Feature Cards** (below carousel)
   - Your existing Talisay ML content

### On Mobile Phone (Web or Native App)
- **Hamburger menu** in header to open sidebar
- **Sidebar slides in** from left as overlay
- **Touch outside** sidebar to close it
- **Icons only** buttons in header (no text on small screens)
- Same carousel and content, optimized for mobile

## 📱 Responsive Design

The layout automatically adapts to screen size:

| Screen Size | Sidebar Behavior | Header | Content |
|------------|------------------|---------|---------|
| < 640px (Mobile) | Hidden, slides in | Icons only, hamburger visible | Full width |
| 640px - 1023px (Tablet) | Hidden, slides in | Text + icons, hamburger visible | Padded |
| ≥ 1024px (Desktop) | Always visible, toggles width | Full layout, hamburger hidden | Max width 1152px |

## 🎮 How to Use

### Expand/Collapse Sidebar
- **Collapsed state**: Click anywhere on the thin sidebar to expand
- **Expanded state**: Click outside the sidebar to collapse

### Navigate
- Click any menu item in the sidebar
- Or use the header buttons (Login, Sign Up, Profile)
- Or use the Quick Action buttons on the homepage

### Carousel
- Auto-plays through 4 slides
- Click the dots at the bottom to jump to a specific slide
- Each slide shows a different aspect of Talisay ML

## 🎨 Customize

### Change Sidebar Color
Edit `src/components/layout/Sidebar.js`, line ~125:
```javascript
backgroundColor: '#1e3a5f',  // Change this!
```

### Change Carousel Images
Replace files in `assets/carousel/`:
- `slide1.jpg` - First slide
- `slide2.jpg` - Second slide
- `slide3.jpg` - Third slide
- `slide4.jpg` - Fourth slide

### Change Carousel Text
Edit `src/components/HeroCarousel.js`, lines 24-48:
```javascript
const slides = [
  {
    title: 'Your Title',
    description: 'Your description text here',
    imageSrc: require('../../../assets/carousel/slide1.jpg'),
  },
  // ... more slides
];
```

### Change Auto-play Speed
Edit `src/components/HeroCarousel.js`, line 52:
```javascript
const AUTOPLAY_MS = 5000;  // Change milliseconds (5000 = 5 seconds)
```

## 🐛 Troubleshooting

### Carousel images not showing?
Make sure the image files exist in `assets/carousel/`:
```
assets/
└── carousel/
    ├── slide1.jpg
    ├── slide2.jpg
    ├── slide3.jpg
    └── slide4.jpg
```

### Logos not showing?
Make sure these files exist in `assets/`:
```
assets/
├── tup-t-logo.png
└── talisay-logo.png
```

### Sidebar not working?
The sidebar only appears on web. Make sure you're running:
```bash
npm run web
```
Not `npm run android` or `npm run ios`

### Clear cache if needed:
```bash
npx expo start --web --clear
```

## 📚 Documentation

See these files for more details:
- `WEB_LAYOUT_README.md` - Complete documentation
- `DESIGN_CONVERSION_SUMMARY.md` - Design comparison with DaingGrader

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| TUP-T Logo | ✅ Implemented |
| Talisay Logo | ✅ Implemented |
| Collapsible Sidebar | ✅ Implemented |
| Hero Carousel | ✅ Implemented |
| Dark Overlay Panel | ✅ Implemented |
| Dot Navigation | ✅ Implemented |
| Auto-play Slides | ✅ Implemented |
| Fixed Header | ✅ Implemented |
| User Actions | ✅ Implemented |
| Smooth Animations | ✅ Implemented |
| Responsive Design | ✅ Implemented |
| Mobile Compatibility | ✅ Implemented |

## 🎉 You're All Set!

Run `npm run web` and enjoy your new DaingGrader-style layout!

---

**Need help?** Check the documentation files or review the component code in `src/components/layout/`
