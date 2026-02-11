# 🏗️ Building Talisay AI APK - Complete Guide

## Prerequisites

1. **Install EAS CLI** (Expo Application Services)
   ```powershell
   npm install -g eas-cli
   ```

2. **Create Expo account** (free)
   - Visit: https://expo.dev/signup
   - Remember your credentials

3. **Install ngrok** (for backend access)
   - Download: https://ngrok.com/download
   - Signup for free account
   - Get your auth token

---

## 🌐 Step-by-Step: Setup Backend Access

### Option A: Using ngrok (Quick Testing)

1. **Install and authenticate ngrok:**
   ```powershell
   # After installing ngrok, authenticate
   ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
   ```

2. **Start your backends** (in separate terminals):
   ```powershell
   # Terminal 1: Node.js server
   cd D:\talisay_ai\server
   npm start

   # Terminal 2: Python ML API
   cd D:\talisay_ai\ml
   .\venv\Scripts\activate
   python api.py

   # Terminal 3: Expose Node.js server  
   ngrok http 3000

   # Terminal 4: Expose Python ML API
   ngrok http 5001
   ```

3. **Copy the ngrok URLs** (look like `https://abc123.ngrok-free.app`)

4. **Update `.env` file:**
   ```
   EXPO_PUBLIC_API_URL=https://YOUR-NGROK-URL-FOR-3000
   EXPO_PUBLIC_ML_API_URL=https://YOUR-NGROK-URL-FOR-5001
   ```

**⚠️ ngrok limitations:**
- Free URLs change every time you restart ngrok
- 40 connections/minute limit
- Good for testing only

### Option B: Deploy to Cloud (Recommended for Production)

**For Node.js Backend (Railway - Free Tier):**
1. Visit https://railway.app
2. Connect GitHub repo
3. Deploy `server` folder
4. Get deployment URL (e.g., `https://your-app.up.railway.app`)

**For Python ML API (Render - Free Tier):**
1. Visit https://render.com
2. Create Web Service from `ml` folder
3. Set Python environment
4. Get deployment URL

---

## 📦 Build APK

### Step 1: Login to Expo

```powershell
cd D:\talisay_ai
eas login
# Enter your Expo credentials
```

### Step 2: Configure EAS Build

```powershell
eas build:configure
```

This creates `eas.json` configuration file.

### Step 3: Build APK

**For testing (development build):**
```powershell
eas build --profile development --platform android
```

**For production (release build):**
```powershell
eas build --profile production --platform android
```

Build process:
- Takes 10-20 minutes
- Happens on Expo's cloud servers
- Downloads APK when complete

### Step 4: Download and Install

1. EAS will provide download link
2. Download APK to your phone
3. Enable "Install unknown apps" in Android settings
4. Install the APK

---

## 🧪 Testing Checklist

After installing APK:

- [ ] App opens successfully
- [ ] Can create account / login
- [ ] Can scan Talisay fruit images
- [ ] ML analysis works (connects to Python backend)
- [ ] Results save to history (connects to Node.js backend)
- [ ] Works on mobile data (not just WiFi)
- [ ] Works when laptop is off

---

## 🔧 Troubleshooting

**"Network request failed"**
- Check `.env` URLs are publicly accessible
- Test URLs in browser first
- Ensure backends are running

**"Unable to resolve host"**
- Backend URLs must be HTTPS (ngrok provides this)
- No localhost/127.0.0.1 in production URLs

**APK won't install**
- Enable "Install unknown apps" in Android settings
- Check Android version compatibility (should work Android 5.0+)

**ML predictions fail**
- Ensure Python API is running and accessible
- Check ML models are trained
- Test with: `curl https://YOUR-ML-URL/api/info`

---

## 🎯 Quick Start Commands

```powershell
# 1. Update backends with public URLs in .env
# 2. Login to Expo
eas login

# 3. Configure (first time only)
eas build:configure

# 4. Build APK
eas build --profile preview --platform android

# 5. Download and install on phone
```

---

## 📝 Notes

- **Development builds** include dev tools, larger size
- **Production builds** are optimized, smaller size
- **Preview builds** are good balance for testing
- Free Expo account: 30 builds/month
- Keep backends running while using APK!
