# 📱 Talisay AI - APK Deployment Guide

## 🎯 Quick Answer to Your Questions

### **Q1: Will the APK work when laptop and phone are on different networks?**

**Short Answer:** Only if you use publicly accessible backend URLs.

**Explanation:**
```
❌ localhost:3000          → Only same device
❌ 192.168.1.10:3000      → Only same WiFi network  
✅ https://abc.ngrok.io   → Works anywhere
✅ https://your-app.com   → Works anywhere
```

### **Q2: Can the APK work when laptop is turned off?**

**It depends on backend location:**

| Backend Location | Laptop Off? | Different WiFi? | Mobile Data? |
|-----------------|-------------|-----------------|--------------|
| Localhost (your laptop) | ❌ No | ❌ No | ❌ No |
| ngrok (tunnels to laptop) | ❌ No | ✅ Yes | ✅ Yes |
| Cloud (Railway/Render/etc) | ✅ Yes | ✅ Yes | ✅ Yes |

**Key Concept:** 
- Your APK is just the **frontend** (the app UI)
- It still needs to **call APIs** for ML predictions and data storage
- Those APIs must be **reachable from the internet**

---

## 🚀 Recommended Path: Testing → Production

### **Phase 1: Quick Testing (ngrok)**

**What it does:** Creates temporary public URLs for your laptop's servers

**Pros:**
- ✅ Free and quick (5 minutes setup)
- ✅ Test APK on any network
- ✅ No code deployment needed

**Cons:**
- ❌ Laptop must stay on
- ❌ URLs change when you restart ngrok
- ❌ 40 connections/minute limit (free tier)

**Steps:**
```powershell
# 1. Run the setup script
.\setup-ngrok.ps1

# 2. Copy the ngrok URLs and update .env file

# 3. Build APK
.\build-apk.ps1
```

---

### **Phase 2: Production (Cloud Deployment)**

**What it does:** Deploys your backends to cloud servers

**Pros:**
- ✅ Laptop can be off
- ✅ Permanent URLs
- ✅ Scalable and reliable

**Recommended Services:**

#### **Node.js Backend (server/)** → **Railway** (Free tier)
- 500 hours/month free
- Easy GitHub deployment
- Automatic SSL/HTTPS

**Steps:**
1. Visit https://railway.app
2. Sign up with GitHub
3. Create new project → "Deploy from GitHub"
4. Select your repo → Choose `server` directory
5. Add environment variables (if needed)
6. Get deployment URL: `https://your-app.up.railway.app`

#### **Python ML API (ml/)** → **Render** (Free tier)
- Free tier available (spins down after inactivity)
- Supports Python/Flask
- Automatic SSL/HTTPS

**Steps:**
1. Visit https://render.com
2. Sign up with GitHub
3. New Web Service → Connect repository
4. Settings:
   - Root directory: `ml`
   - Build command: `pip install -r requirements.txt`
   - Start command: `python api.py`
5. Get deployment URL: `https://your-ml-api.onrender.com`

**Update .env:**
```env
EXPO_PUBLIC_API_URL=https://your-app.up.railway.app
EXPO_PUBLIC_ML_API_URL=https://your-ml-api.onrender.com
```

**Rebuild APK:**
```powershell
.\build-apk.ps1
```

---

## 📦 Understanding the Build Process

### **What is EAS (Expo Application Services)?**

- Cloud build service for Expo apps
- Builds APK on Expo's servers (not your laptop)
- Free tier: 30 builds/month
- No Android Studio required

### **Build Profiles**

1. **development** - With debugging tools, hot reload
   - Size: ~50-80 MB
   - Use: Testing connection to dev servers

2. **preview** (Recommended) - Optimized, no dev tools
   - Size: ~20-40 MB
   - Use: QA testing, sharing with testers

3. **production** - Fully optimized
   - Size: ~15-30 MB
   - Use: Final release, Play Store upload

---

## 🛠️ Step-by-Step Build Instructions

### **Option A: Quick Build with ngrok (Testing)**

```powershell
# Step 1: Start backends
# Terminal 1:
cd D:\talisay_ai\server
npm start

# Terminal 2:
cd D:\talisay_ai\ml
.\venv\Scripts\activate
python api.py

# Step 2: Setup ngrok tunnels
.\setup-ngrok.ps1

# Step 3: Update .env with ngrok URLs
# Edit .env file with the URLs from ngrok windows

# Step 4: Test URLs in browser
# Visit: https://YOUR-ML-URL.ngrok-free.app/api/info
# Should return JSON with ML API info

# Step 5: Build APK
.\build-apk.ps1
# Choose option 1 (preview)

# Step 6: Wait 10-20 minutes for build to complete

# Step 7: Download APK from link in terminal

# Step 8: Install on Android phone
```

### **Option B: Production Build (Cloud)**

```powershell
# Step 1: Deploy backends to cloud (see Phase 2 above)

# Step 2: Update .env with production URLs
EXPO_PUBLIC_API_URL=https://your-app.up.railway.app
EXPO_PUBLIC_ML_API_URL=https://your-ml-api.onrender.com

# Step 3: Verify URLs work
# Visit in browser, should return data

# Step 4: Build APK
.\build-apk.ps1
# Choose option 2 (production)

# Step 5: Download and install
```

---

## 📋 Pre-Build Checklist

Before building, ensure:

- [ ] Expo account created (https://expo.dev/signup)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in (`eas login`)
- [ ] Backend URLs in `.env` are correct and accessible
- [ ] Test URLs in browser first
- [ ] For ngrok: backends running + ngrok tunnels active
- [ ] For production: backends deployed and URLs permanent

---

## 🧪 Testing Your APK

After installing APK on phone:

### **1. Test Backend Connectivity**

Open app → Check for errors like:
- ❌ "Network request failed" → Backend not accessible
- ❌ "Unable to resolve host" → Wrong URL in .env
- ✅ App loads → Good!

### **2. Test Features**

- [ ] Login/Register works
- [ ] Can scan image (use camera or pick from gallery)
- [ ] ML analysis completes (Python ML API working)
- [ ] Results display correctly
- [ ] Results save to history (Node.js API working)
- [ ] Can view history

### **3. Test Network Scenarios**

- [ ] Works on WiFi
- [ ] Works on mobile data
- [ ] Works when laptop on different WiFi (if using cloud)
- [ ] Works when laptop is off (if using cloud)

---

## 🔧 Troubleshooting

### **"Network request failed"**
**Cause:** Backend not reachable  
**Fix:**
1. Open backend URL in phone browser
2. Should show data, not error
3. Check firewall/security settings
4. For ngrok: ensure tunnels are running

### **"Unable to resolve host"**
**Cause:** Invalid URL in .env  
**Fix:**
1. Verify URLs don't contain localhost/127.0.0.1
2. Ensure HTTPS (ngrok provides this automatically)
3. Rebuild APK after fixing .env

### **ML predictions fail**
**Cause:** Python ML API not responding  
**Fix:**
1. Test: `https://YOUR-ML-URL/api/info`
2. Ensure models are in `ml/models/` directory
3. Check Python API logs for errors

### **Build fails**
**Common causes:**
- Not logged in: `eas login`
- Network issues: Check internet connection
- Package issues: `npm install` then try again
- Expo account limits: Free tier = 30 builds/month

### **APK won't install**
**Fix:**
1. Enable "Install unknown apps" in Android settings
2. Check Android version (needs 5.0+)
3. Ensure APK downloaded completely

---

## 💡 Important Notes

### **Development vs Production**

| Aspect | Development (Expo Go) | Production (Standalone APK) |
|--------|----------------------|----------------------------|
| Installation | Expo Go app from Play Store | Custom APK file |
| Network | Same WiFi only | Any network |
| Backends | Can use localhost | MUST use public URLs |
| Build Required | No | Yes (via EAS) |
| Updates | Instant (scan QR) | Rebuild APK |

### **Cost Breakdown**

| Service | Free Tier | Cost After |
|---------|-----------|------------|
| Expo (EAS builds) | 30 builds/month | $29/month unlimited |
| Railway (Node.js) | 500 hrs/month | $5/month |
| Render (Python) | Free (with limitations) | $7/month |
| ngrok | 1 account, 40 req/min | $8/month |

**Recommendation for learning:** 
- Start with ngrok (free, temporary)
- Move to Railway + Render when ready for real users

---

## 🎓 Understanding the Architecture

```
┌─────────────────┐
│  Android Phone  │
│   (APK App)     │
└────────┬────────┘
         │ Internet/WiFi/Mobile Data
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         v                     v                     v
┌────────────────┐    ┌────────────────┐    ┌──────────────┐
│  Your Laptop   │    │    Railway     │    │   ngrok      │
│  localhost     │    │   (Cloud)      │    │  (Tunnel)    │
├────────────────┤    ├────────────────┤    ├──────────────┤
│ ❌ Not public  │    │ ✅ Public URL   │    │ ✅ Public URL│
│ Same WiFi only │    │ Always on      │    │ Laptop on    │
└────────────────┘    └────────────────┘    └──────────────┘
```

**Key Insight:**
- Your phone's APK is like a web browser
- It needs URLs to access data
- Those URLs must be reachable from where the phone is

---

## 📞 Need Help?

Common questions:
1. **ngrok vs Cloud?** → ngrok for testing, Cloud for production
2. **How long to build?** → 10-20 minutes on Expo servers
3. **Can I use Google Play?** → Yes, but use AAB format (not APK)
4. **How to update app?** → Rebuild APK with new version
5. **Free options?** → Yes! Railway, Render, ngrok all have free tiers

---

## ✅ Your Action Plan

**Today (Testing):**
1. ✅ Run `.\setup-ngrok.ps1`
2. ✅ Update `.env` with ngrok URLs
3. ✅ Run `.\build-apk.ps1`
4. ✅ Download and install APK
5. ✅ Test all features

**This Week (Production):**
1. ❗ Deploy Node.js to Railway
2. ❗ Deploy Python ML to Render
3. ❗ Update `.env` with production URLs
4. ❗ Rebuild APK
5. ❗ Share with users!

---

**Good luck! 🚀**
