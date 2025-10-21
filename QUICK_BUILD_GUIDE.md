# 🚀 Quick Build Guide - Beneficial Inspections

## Prerequisites Setup (One-Time)
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
cd /app/frontend
eas login

# 3. Configure project (first time only)
eas build:configure
```

---

## 🤖 Android Build (APK for Direct Install)
```bash
cd /app/frontend
eas build -p android --profile preview
```
⏱️ **Build Time:** ~15 minutes  
📦 **Output:** `.apk` file you can share directly with testers  
📲 **Install:** Testers download APK → Enable "Unknown Sources" → Install

---

## 🍎 iOS Build (Requires Apple Developer Account)
```bash
cd /app/frontend

# First: Register tester devices (run once per tester)
eas device:create

# Then: Build the app
eas build -p ios --profile preview
```
⏱️ **Build Time:** ~25 minutes  
📦 **Output:** `.ipa` file  
📲 **Install:** Via TestFlight or enterprise distribution  
💰 **Cost:** Apple Developer Account ($99/year)

---

## 📦 Build Both Platforms
```bash
cd /app/frontend
eas build --platform all --profile preview
```

---

## 🔍 Check Build Status
```bash
# List all builds
eas build:list

# Or visit web dashboard
# https://expo.dev
```

---

## ⚡ Quick Troubleshooting

### "No credentials found"
```bash
eas credentials
# Select platform → Generate new credentials
```

### "Backend connection failed"
Check `/app/frontend/.env` has correct production URL:
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com/api
```

### iOS: "Device not registered"
```bash
eas device:create
# Send link to tester to register their device
```

---

## 📱 Distribution

### Android (Easiest)
1. Build completes → Download APK
2. Share APK file with testers via:
   - Email attachment
   - Google Drive / Dropbox link
   - Direct download link from Expo
3. Testers install directly

### iOS (More Complex)
**Option 1: TestFlight (Recommended)**
- Submit to App Store Connect
- Add testers via email
- They install via TestFlight app

**Option 2: Ad-Hoc**
- Register device UDIDs first
- Rebuild with registered devices
- Distribute `.ipa` file
- Install via Xcode/third-party tools

---

## 🎯 Complete Build Workflow

### First Time Setup (15 minutes)
```bash
npm install -g eas-cli
cd /app/frontend
eas login
eas build:configure
```

### Every New Build (15-30 minutes)
```bash
cd /app/frontend

# Update version in app.json (optional)
# "version": "1.0.1"
# "buildNumber": "2" (iOS)
# "versionCode": 2 (Android)

# Build
eas build -p android --profile preview  # or 'ios' or 'all'

# Wait for build to complete
# Download from Expo dashboard
# Distribute to testers
```

---

## 📋 Pre-Build Checklist

- [ ] Backend deployed to production
- [ ] `.env` updated with production backend URL
- [ ] Square production keys configured
- [ ] Test database has sample data
- [ ] Version number incremented in `app.json`

---

## 💡 Pro Tips

1. **Build overnight** - First builds take longer
2. **Android first** - Easier to test, no device registration
3. **Test yourself first** - Before sending to beta testers
4. **Keep build history** - Save APK/IPA files for each version
5. **Document changes** - Tell testers what's new in each build

---

## 🆘 Need Help?

**Full Documentation:** See `BUILD_INSTRUCTIONS.md`  
**Expo Docs:** https://docs.expo.dev/build/introduction/  
**Support:** https://expo.dev/support

---

## 🎉 You're Ready!

**Start building now:**
```bash
cd /app/frontend
eas build -p android --profile preview
```

Grab a coffee ☕ and your build will be ready in ~15 minutes!
