# 🚀 QUICK START - Build Your APK

## 📋 What You Need

1. **Expo Account** (free)
   - Sign up: https://expo.dev/signup

2. **ngrok Account** (free)
   - Sign up: https://ngrok.com/signup
   - Download: https://ngrok.com/download

## ⚡ Fast Track (30 minutes)

### Step 1: Install Required Tools (5 min)

```powershell
# Install EAS CLI
npm install -g eas-cli

# Download ngrok from: https://ngrok.com/download
# Extract and add to PATH or move to project folder

# Authenticate ngrok (get token from ngrok dashboard)
ngrok config add-authtoken YOUR_NGROK_TOKEN_HERE
```

### Step 2: Start Your Backends (2 min)

**Terminal 1 - Node.js Server:**
```powershell
cd D:\talisay_ai\server
npm start
```

**Terminal 2 - Python ML API:**
```powershell
cd D:\talisay_ai\ml
.\venv\Scripts\activate
python api.py
```

Wait until both show "Server running..."

### Step 3: Setup ngrok (3 min)

```powershell
cd D:\talisay_ai
.\setup-ngrok.ps1
```

This opens 2 ngrok windows. Look for lines like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

Copy BOTH URLs (one for port 3000, one for port 5001).

### Step 4: Update .env File (2 min)

Open `D:\talisay_ai\.env` and update:

```env
EXPO_PUBLIC_API_URL=https://YOUR-3000-URL.ngrok-free.app
EXPO_PUBLIC_ML_API_URL=https://YOUR-5001-URL.ngrok-free.app
```

**Test URLs work:**
- Open in browser: `https://YOUR-5001-URL.ngrok-free.app/api/info`
- Should show JSON response

### Step 5: Build APK (18 min)

```powershell
cd D:\talisay_ai
.\build-apk.ps1
```

- Choose option `1` (preview)
- Login to Expo when prompted
- Wait 10-20 minutes for build to complete
- Copy the download URL from terminal

### Step 6: Install on Phone

1. Download APK using link from Step 5
2. Transfer to phone (or download directly on phone)
3. Enable "Install unknown apps" in Settings
4. Open APK file and install
5. Open "Talisay Oil" app

### Step 7: Test

- Create account or login
- Scan a Talisay fruit image
- Verify ML analysis works
- Check results are saved

---

## ⚠️ IMPORTANT

While testing with ngrok:
- ✅ Keep ngrok windows open
- ✅ Keep backend terminals running
- ✅ Keep laptop connected to internet
- ❌ Don't restart ngrok (URLs will change)

If ngrok URLs change, you MUST rebuild APK with new URLs.

---

## 🎯 Quick Commands Reference

```powershell
# Setup (one-time)
npm install -g eas-cli
ngrok config add-authtoken YOUR_TOKEN
eas login

# Every build:
1. Start backends (server + ml)
2. .\setup-ngrok.ps1
3. Update .env with ngrok URLs
4. .\build-apk.ps1
5. Download and install APK

# Check if everything works:
eas whoami                    # Should show your Expo username
ngrok version                 # Should show ngrok version
curl https://YOUR-ML-URL/api/info  # Should return JSON
```

---

## 🆘 Common Issues

**"eas: command not found"**
```powershell
npm install -g eas-cli
```

**"ngrok: command not found"**
- Download from https://ngrok.com/download
- Add to PATH or move to project folder

**"Network request failed" in APK**
- Check backends are running
- Check ngrok tunnels are active
- Test URLs in browser first

**Build fails**
```powershell
# Make sure you're logged in
eas login

# Try again
eas build --profile preview --platform android
```

---

## 📱 What Happens During Build?

1. ✅ Your code is uploaded to Expo servers
2. ✅ Expo creates native Android project
3. ✅ Installs dependencies
4. ✅ Bundles JavaScript code
5. ✅ Embeds your .env URLs into APK
6. ✅ Builds APK file
7. ✅ Provides download link

**Your laptop can sleep/turn off during build** - it happens in the cloud!

---

## 🔄 Future Builds

**If you change code:**
```powershell
.\build-apk.ps1
```

**If ngrok URLs change:**
```powershell
# Update .env with new URLs
.\build-apk.ps1
```

**For production (cloud deployment):**
```powershell
# Deploy backends to Railway/Render
# Update .env with permanent URLs
.\build-apk.ps1
# Choose option 2 (production)
```

---

## ✅ Success Checklist

Before building:
- [ ] Expo account created and logged in
- [ ] ngrok installed and authenticated
- [ ] Both backends running
- [ ] ngrok tunnels active
- [ ] .env file updated with ngrok URLs
- [ ] URLs tested in browser

After building:
- [ ] APK downloaded
- [ ] APK installed on phone
- [ ] App opens successfully
- [ ] Can login/register
- [ ] Can scan images
- [ ] ML analysis works
- [ ] Results save to history

---

**Ready? Run this:**
```powershell
cd D:\talisay_ai
.\setup-ngrok.ps1
```

Then follow the instructions! 🚀
