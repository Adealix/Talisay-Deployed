# 🔧 APK Build Troubleshooting Checklist

## 📋 Pre-Build Verification

### ✅ Environment Setup

```powershell
# Check EAS CLI installed
eas --version
# Should show: eas-cli/X.X.X

# Check logged in
eas whoami
# Should show your Expo username, not "not logged in"

# Check ngrok installed
ngrok version
# Should show: ngrok version X.X.X
```

If any fail:
```powershell
npm install -g eas-cli    # Install EAS CLI
eas login                  # Login to Expo
# Download ngrok from https://ngrok.com/download
```

---

### ✅ Backend Servers Running

**Check Node.js Server (Port 3000):**
```powershell
# Should be running in a terminal
cd D:\talisay_ai\server
npm start
```

Look for: "Server is running on port 3000"

**Check Python ML API (Port 5001):**
```powershell
# Should be running in another terminal
cd D:\talisay_ai\ml
.\venv\Scripts\activate
python api.py
```

Look for: "Running on http://0.0.0.0:5001"

---

### ✅ ngrok Tunnels Active

```powershell
# Should have 2 ngrok windows open
# Terminal 1: ngrok http 3000
# Terminal 2: ngrok http 5001
```

Each should show:
```
Forwarding    https://XXXXX.ngrok-free.app -> http://localhost:3000
```

**Copy both URLs!**

---

### ✅ URLs Configuration

Open `D:\talisay_ai\.env`:

```env
EXPO_PUBLIC_API_URL=https://YOUR-3000-URL.ngrok-free.app
EXPO_PUBLIC_ML_API_URL=https://YOUR-5001-URL.ngrok-free.app
```

**Critical checks:**
- ❌ No `localhost` or `127.0.0.1` for production builds
- ❌ No `http://192.168.x.x` (won't work on different networks)
- ✅ Must be `https://` (ngrok provides this)
- ✅ No trailing slash `/` at the end

---

### ✅ Test URLs in Browser

Before building, test each URL:

**Test Node.js API:**
```
https://YOUR-3000-URL.ngrok-free.app
```
Should show something (maybe "Cannot GET /" but not error)

**Test Python ML API:**
```
https://YOUR-5001-URL.ngrok-free.app/api/info
```
Should return JSON:
```json
{
  "status": "ok",
  "models": { ... }
}
```

**If you get ngrok warning page:**
- Click "Visit Site"
- This is normal for free tier
- Your app will work fine

---

## 🚨 Common Build Errors

### Error: "Not logged in"

```powershell
eas login
# Enter Expo credentials
```

### Error: "Project not configured"

```powershell
eas build:configure
```

### Error: "Invalid eas.json"

Delete `eas.json` and let script recreate it:
```powershell
Remove-Item eas.json
.\build-apk.ps1
```

### Error: "Build failed to compile"

Check `package.json` for missing dependencies:
```powershell
npm install
```

### Error: "Exceeded build limit"

Free Expo accounts: 30 builds/month
- Wait for monthly reset, or
- Upgrade to paid plan ($29/month)

---

## 🚨 Common APK Installation Errors

### "App not installed"

**Fix:**
1. Android Settings → Apps → Special access → Install unknown apps
2. Enable for your file manager/browser
3. Try installing again

### "Parse error"

**Causes:**
- Incomplete download
- Corrupted file
- Incompatible Android version

**Fix:**
1. Check Android version (needs 5.0+)
2. Re-download APK
3. Clear cache and try again

### "App keeps crashing"

**Fix:**
1. Uninstall APK
2. Clear app data
3. Reinstall APK
4. Check if backends are running

---

## 🚨 Common Runtime Errors

### "Network request failed"

**Debugging steps:**

1. **Test backend URLs in phone browser:**
   ```
   Open: https://YOUR-ML-URL.ngrok-free.app/api/info
   ```
   - ✅ Shows JSON → Backend OK
   - ❌ Error page → Backend not accessible

2. **Check ngrok tunnels are running:**
   - Look at ngrok windows
   - Should show "Connections..." activity
   - If closed, restart and rebuild APK

3. **Check .env file URLs:**
   - Must match current ngrok URLs
   - ngrok URLs change on restart (free tier)

4. **Check laptop backends still running:**
   - Node.js terminal should be active
   - Python terminal should be active
   - Restart if needed

### "Unable to resolve host"

**Cause:** Invalid URL in .env

**Fix:**
1. Verify URLs are in correct format
2. No `localhost` or `127.0.0.1`
3. Must be `https://` not `http://`
4. Rebuild APK after fixing .env

### "ML prediction timeout"

**Cause:** Python ML API slow or crashed

**Fix:**
1. Check Python terminal for errors
2. Restart ML API if needed
3. Test directly: `curl https://YOUR-ML-URL/api/info`
4. Check ML models exist in `ml/models/` folder

### "Cannot save to history"

**Cause:** Node.js server issue or authentication

**Fix:**
1. Check Node.js terminal for errors
2. Verify login is working
3. Check database connection (if using external DB)
4. Test: Open `https://YOUR-NODE-URL` in browser

---

## 🧪 Comprehensive Testing Checklist

### After Installing APK:

**Basic Functionality:**
- [ ] App opens without crashing
- [ ] Splash screen displays
- [ ] Home screen loads

**Authentication:**
- [ ] Can create new account
- [ ] Can login with credentials
- [ ] Can logout
- [ ] Session persists after closing app

**Camera/Image:**
- [ ] Can access camera
- [ ] Can take photo
- [ ] Can pick from gallery
- [ ] Image displays correctly

**ML Analysis:**
- [ ] Can submit image for analysis
- [ ] Loading indicator shows
- [ ] Results display (color, size, etc.)
- [ ] Confidence scores show
- [ ] No error messages

**History:**
- [ ] Analysis saves to history
- [ ] Can view history list
- [ ] Can view individual history item
- [ ] Images load in history
- [ ] Can delete history items

**Network Scenarios:**
- [ ] Works on WiFi
- [ ] Works on mobile data
- [ ] Works on different WiFi than laptop
- [ ] Still works after laptop screen locked
- [ ] Works with VPN (if you use one)

---

## 📊 Performance Checks

### Expected Response Times:

| Action | Expected Time | Slow Warning |
|--------|--------------|--------------|
| Login | < 2 seconds | > 5 seconds |
| Image upload | < 5 seconds | > 15 seconds |
| ML prediction | < 10 seconds | > 30 seconds |
| History load | < 3 seconds | > 10 seconds |

**If slow:**
- Check internet connection speed
- ngrok free tier has limitations
- Consider upgrading to cloud deployment

---

## 🔄 Recovery Procedures

### "Everything is broken"

**Nuclear option - Start fresh:**

```powershell
# 1. Close all terminals
# 2. Close ngrok windows

# 3. Restart backends
cd D:\talisay_ai\server
npm start                    # Terminal 1

cd D:\talisay_ai\ml
.\venv\Scripts\activate
python api.py                # Terminal 2

# 4. Restart ngrok
ngrok http 3000              # Terminal 3
ngrok http 5001              # Terminal 4

# 5. Update .env with NEW ngrok URLs

# 6. Rebuild APK
cd D:\talisay_ai
.\build-apk.ps1

# 7. Uninstall old APK from phone
# 8. Install new APK
```

---

## 📞 Getting Help

### Information to Gather:

When asking for help, provide:

1. **Error message** (exact text)
2. **When it happens** (during build? after install? when using feature?)
3. **Platform details:**
   - Android version
   - Phone model
   - Network type (WiFi/mobile data)
4. **Build details:**
   - Build profile used (development/preview/production)
   - EAS build URL
5. **Backend status:**
   - Are they running?
   - Are ngrok tunnels active?
   - Can you access URLs in browser?

### Quick Diagnostic Commands:

```powershell
# Check version info
eas --version
expo --version
node --version
python --version
ngrok version

# Check if logged in
eas whoami

# Check build history
eas build:list

# Test backend URLs
curl https://YOUR-ML-URL/api/info
curl https://YOUR-NODE-URL
```

---

## ✅ Verification Script

Copy and run this in PowerShell:

```powershell
Write-Host "=== Talisay AI Build Verification ===" -ForegroundColor Cyan

# Check EAS CLI
$eas = Get-Command eas -ErrorAction SilentlyContinue
if ($eas) { Write-Host "✅ EAS CLI installed" -ForegroundColor Green }
else { Write-Host "❌ EAS CLI not found" -ForegroundColor Red }

# Check Expo login
$whoami = eas whoami 2>&1
if ($whoami -notmatch "not logged in") {
    Write-Host "✅ Logged in to Expo as: $whoami" -ForegroundColor Green
} else {
    Write-Host "❌ Not logged in to Expo" -ForegroundColor Red
}

# Check ngrok
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrok) { Write-Host "✅ ngrok installed" -ForegroundColor Green }
else { Write-Host "❌ ngrok not found" -ForegroundColor Red }

# Check .env file
$envFile = "D:\talisay_ai\.env"
if (Test-Path $envFile) {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    $apiUrl = (Get-Content $envFile | Select-String "EXPO_PUBLIC_API_URL=" | Select-Object -First 1) -replace "EXPO_PUBLIC_API_URL=", ""
    $mlUrl = (Get-Content $envFile | Select-String "EXPO_PUBLIC_ML_API_URL=" | Select-Object -First 1) -replace "EXPO_PUBLIC_ML_API_URL=", ""
    
    if ($apiUrl -match "localhost|127.0.0.1") {
        Write-Host "⚠️  API URL is localhost (won't work for production)" -ForegroundColor Yellow
    } elseif ($apiUrl -match "ngrok") {
        Write-Host "✅ Using ngrok URL for API" -ForegroundColor Green
    } elseif ($apiUrl -match "http") {
        Write-Host "✅ Using cloud URL for API" -ForegroundColor Green
    }
    
    if ($mlUrl -match "localhost|127.0.0.1") {
        Write-Host "⚠️  ML URL is localhost (won't work for production)" -ForegroundColor Yellow
    } elseif ($mlUrl -match "ngrok") {
        Write-Host "✅ Using ngrok URL for ML" -ForegroundColor Green
    } elseif ($mlUrl -match "http") {
        Write-Host "✅ Using cloud URL for ML" -ForegroundColor Green
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== End Verification ===" -ForegroundColor Cyan
```

Save this as `verify-setup.ps1` and run before building!

---

## 🎯 Success Indicators

**You're ready to build when:**
- ✅ All verification checks pass
- ✅ Both backends running
- ✅ ngrok tunnels active showing forwarding URLs
- ✅ .env file has ngrok URLs (not localhost)
- ✅ URLs work in browser
- ✅ Logged in to Expo

**Your APK is working when:**
- ✅ Installs without errors
- ✅ Opens without crashing
- ✅ Can login/register
- ✅ Can scan and analyze images
- ✅ Results save to history
- ✅ Works on mobile data

---

**Need more help? Check:**
- [QUICK_BUILD.md](QUICK_BUILD.md) - Fast track guide
- [APK_DEPLOYMENT_GUIDE.md](APK_DEPLOYMENT_GUIDE.md) - Comprehensive guide
- [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) - Detailed instructions
