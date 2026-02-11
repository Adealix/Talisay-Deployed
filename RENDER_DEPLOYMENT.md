# 🚀 Render.com Deployment Guide - Talisay AI

**FREE deployment with NO credit card required!** Perfect alternative when you can't use DigitalOcean.

## 🎁 What You Get (100% FREE)

- ✅ **Web Services**: Deploy Node.js backend (FREE)
- ✅ **Python Apps**: Deploy ML API (FREE)
- ✅ **MongoDB Atlas**: Database (FREE - no card needed)
- ✅ **Automatic HTTPS**: SSL certificates included
- ✅ **GitHub Integration**: Auto-deploy on push
- ❌ **Limitations**: Services sleep after 15 min inactivity (wake on request ~30 sec)

**Total Cost: $0/month forever** 🎉

---

## 📋 Table of Contents
1. [MongoDB Atlas Setup](#1-mongodb-atlas-setup-free)
2. [Deploy Node.js Backend](#2-deploy-nodejs-backend)
3. [Deploy Python ML API](#3-deploy-python-ml-api)
4. [Update Frontend URLs](#4-update-frontend-urls)
5. [Build APK](#5-build--test-apk)
6. [Dealing with Sleep Time](#6-dealing-with-sleep-time)

---

## 1. MongoDB Atlas Setup (FREE)

Same as before - MongoDB Atlas is free and needs no credit card!

### Step 1: Create Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up (NO credit card needed)
3. Choose **"Shared"** (M0 - Free forever)
4. Select AWS/Azure, closest region
5. Click **"Create Cluster"**

### Step 2: Create Database User
1. **Database Access** → **"Add New Database User"**
   - Username: `talisay_user`
   - Password: Generate strong password (SAVE IT!)
   - Role: **"Read and write to any database"**

### Step 3: Whitelist All IPs
1. **Network Access** → **"Add IP Address"**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
3. Click **"Confirm"**

### Step 4: Get Connection String
1. **Clusters** → **"Connect"** → **"Connect your application"**
2. Copy: `mongodb+srv://talisay_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
3. Replace `<password>` and add `/talisay` before `?`:
   ```
   mongodb+srv://talisay_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/talisay?retryWrites=true&w=majority
   ```

**Save this - you'll need it!**

---

## 2. Deploy Node.js Backend

### Step 1: Sign Up on Render
1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (easiest - or use email)
4. Authorize Render to access your repositories

### Step 2: Push Code to GitHub (if not already)
```powershell
# In your project root
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/talisay_ai.git
git push -u origin main
```

### Step 3: Create Web Service for Backend
1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   ```
   Name:           talisay-backend
   Region:         Singapore (or closest to you)
   Branch:         main
   Root Directory: server
   Runtime:        Node
   Build Command:  npm install
   Start Command:  node index.js
   ```

### Step 4: Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**:

```env
PORT=10000
MONGODB_URI=mongodb+srv://talisay_user:PASSWORD@cluster0.xxxxx.mongodb.net/talisay?retryWrites=true&w=majority
JWT_SECRET=your-random-secret-key-min-32-characters
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=pro.gadgetessence@gmail.com
SMTP_PASSWORD=sdcayquwhopecnfs
SMTP_FROM_EMAIL=pro.gadgetessence@gmail.com
SMTP_FROM_NAME=TalisayAI
CLOUDINARY_CLOUD_NAME=df6krceo0
CLOUDINARY_API_KEY=465713312957459
CLOUDINARY_API_SECRET=gK0WkuGPoUtjo69Ep4L8Yk0Pjhs
CLOUDINARY_FOLDER=talisay
```

⚠️ **IMPORTANT**: 
- Replace `PASSWORD` in MONGODB_URI
- Generate new `JWT_SECRET` (random 32+ chars)

### Step 5: Choose Free Plan
- **Instance Type**: Free
  - 512 MB RAM
  - Shared CPU
  - Sleeps after 15 min inactivity
  - 750 free hours/month

### Step 6: Deploy!
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. You'll get a URL: `https://talisay-backend.onrender.com`
4. Test: Open the URL (should see "Talisay AI Backend is running")

---

## 3. Deploy Python ML API

### Step 1: Create Another Web Service
1. Click **"New +"** → **"Web Service"**
2. Select your repository again
3. Configure:
   ```
   Name:           talisay-ml-api
   Region:         Singapore (same as backend)
   Branch:         main
   Root Directory: ml
   Runtime:        Python 3
   Build Command:  pip install -r requirements.txt
   Start Command:  python api.py
   ```

### Step 2: Add Environment Variables
```env
PORT=10000
MODEL_PATH=./models
```

### Step 3: Choose Free Plan
- Same as backend (Free tier, 512MB RAM)

### Step 4: Deploy!
1. Click **"Create Web Service"**
2. Wait 10-15 minutes (ML models take longer)
3. You'll get: `https://talisay-ml-api.onrender.com`
4. Test: Open `https://talisay-ml-api.onrender.com/api/info`

---

## 4. Update Frontend URLs

### Update `.env` in Project Root
```env
# Render.com Production URLs
EXPO_PUBLIC_API_URL=https://talisay-backend.onrender.com
EXPO_PUBLIC_ML_API_URL=https://talisay-ml-api.onrender.com
```

### Test Locally First
```powershell
npx expo start
```

1. Open web browser
2. Try login (will take ~30 sec first time if backend was sleeping)
3. Try ML scanning (will take ~30 sec first time if ML was sleeping)

---

## 5. Build & Test APK

### Step 1: Build Production APK
```powershell
eas build --platform android --profile production
```

### Step 2: Download & Install
1. Download APK from the link Expo provides
2. Install on your Android phone
3. Open app
4. **First launch**: Services might take 30 sec to wake up
5. Test login and scanning

---

## 6. Dealing with Sleep Time

### Understanding Free Tier Limitations

**The Problem:**
- Free services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up

### Solutions:

#### Option A: Keep Services Awake (FREE)
Use **UptimeRobot** (free service) to ping your apps every 5 minutes:

1. Go to [uptimerobot.com](https://uptimerobot.com) (free, no card needed)
2. Create account
3. Add two monitors:
   - URL: `https://talisay-backend.onrender.com`
   - URL: `https://talisay-ml-api.onrender.com/api/info`
   - Check interval: **5 minutes**
   
This keeps your apps awake 24/7! ✅

#### Option B: Show Loading Message
Add a friendly message in your app:
- "Waking up servers... This takes ~30 sec if inactive"
- Show loading animation

#### Option C: Upgrade Later (when you can)
- Render **Starter** plan: $7/month per service
- No sleep time, always instant response
- Only upgrade when you have income or can get a card

---

## 💰 Cost Comparison

### Render.com (This Guide)
```
Backend:       FREE (with 15min sleep)
ML API:        FREE (with 15min sleep)
MongoDB:       FREE (Atlas M0)
Total:         $0/month FOREVER
```

### DigitalOcean (Requires Credit Card)
```
Droplet:       $6/month ($200 student credit = 33 months free)
MongoDB:       FREE (Atlas M0)
Total:         $6/month (after credit expires)
```

**For students without credit cards: Render.com is perfect!** 🎓

---

## 🎯 Quick Start Checklist

- [ ] MongoDB Atlas account created (free, no card)
- [ ] MongoDB connection string saved
- [ ] Code pushed to GitHub
- [ ] Render.com account created (free, no card)
- [ ] Backend deployed on Render
- [ ] ML API deployed on Render
- [ ] Both services tested in browser
- [ ] .env updated with Render URLs
- [ ] UptimeRobot set up (optional, to prevent sleep)
- [ ] APK built with production URLs
- [ ] APK tested on mobile

---

## 🐛 Troubleshooting

### "First request is very slow"
- ✅ Normal! Free services sleep after 15 min inactivity
- ✅ Set up UptimeRobot to keep them awake
- ✅ Or upgrade to Starter plan ($7/month)

### "Build failed on Render"
1. Check logs in Render dashboard
2. Common issues:
   - Wrong Root Directory path
   - Missing dependencies in requirements.txt/package.json
   - Wrong Start Command

### "MongoDB connection error"
- Verify connection string is correct
- Check username/password
- Ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas

### "CORS error in APK"
- Backend needs CORS enabled (should already be configured)
- Test backend URL in browser first
- Make sure URLs in .env use `https://` not `http://`

---

## 📊 Render vs DigitalOcean

| Feature | Render (Free) | DigitalOcean (Paid) |
|---------|---------------|---------------------|
| **Cost** | $0/month | $6-17/month |
| **Credit Card** | ❌ Not required | ✅ Required |
| **Sleep Time** | ✅ 15min inactivity | ❌ Always on |
| **Setup** | Very easy | Medium (Linux) |
| **HTTPS** | ✅ Automatic | Requires setup |
| **Best For** | Students, prototypes | Production apps |

---

## 🚀 Upgrade Path (Future)

When you get a credit card or have income:

1. **Get GitHub Student Pack** → $200 DigitalOcean credit
2. Migrate to DigitalOcean Droplet ($6/month)
3. No sleep time, faster response
4. Or upgrade Render to Starter ($7/month per service)

But for now, **Render free tier is perfect for your project!** 🎉

---

## 🔗 Important Links

- **Render Dashboard**: [dashboard.render.com](https://dashboard.render.com)
- **MongoDB Atlas**: [cloud.mongodb.com](https://cloud.mongodb.com)
- **UptimeRobot** (keep awake): [uptimerobot.com](https://uptimerobot.com)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **GitHub**: [github.com](https://github.com)

---

## 🎉 Summary

You now have:
- ✅ **Free backend** hosting (Node.js)
- ✅ **Free ML API** hosting (Python)
- ✅ **Free database** (MongoDB Atlas)
- ✅ **Automatic HTTPS**
- ✅ **Auto-deploy** from GitHub
- ✅ **$0 cost** forever
- ❌ **No credit card** needed!

**Your app is LIVE and accessible 24/7!** 🌍✨

The only downside is the 30-second wake-up time after 15 minutes of inactivity, but that's a small price to pay for completely free hosting! 🚀
