# 📱 Mobile Build Configuration Notes

## ✅ Fixes Applied to Emergent Environment

All necessary adjustments for EAS Build have been applied to the `/app/frontend` directory.

---

## 🔧 Changes Made:

### 1. **`.npmrc` File Created**
- Location: `/app/frontend/.npmrc`
- Content: `legacy-peer-deps=true`
- Purpose: Allows npm to install packages with peer dependency conflicts

### 2. **`.gitignore` Updated**
- Added `android/` and `ios/` folders
- Purpose: Prevents native folders from being committed (EAS Build generates them fresh using Prebuild)

### 3. **Dependencies Added to `package.json`**
- `react-native-worklets@0.5.1` - Required by react-native-reanimated
- `react-native-keyboard-controller@1.18.5` - Required by react-native-gifted-chat
- Purpose: Ensures all peer dependencies are installed

### 4. **Package Versions Aligned with Expo SDK 54**
- React: 19.1.0
- React Native: 0.81.5
- @types/react: ~19.1.10
- All Expo packages updated to SDK 54 compatible versions

---

## 📋 Image Requirements for App Icons

**IMPORTANT: When updating app icons, ensure:**

1. **Format:** True PNG files (not JPG renamed to .png)
2. **Dimensions:** 1024x1024 pixels (square)
3. **Files to update:**
   - `/app/frontend/assets/images/icon.png` - Main app icon
   - `/app/frontend/assets/images/adaptive-icon.png` - Android adaptive icon
   - `/app/frontend/assets/images/splash-icon.png` - Splash screen image

**Tools for creating proper icons:**
- Canva.com (free, easy to use)
- CloudConvert.com (JPG to PNG conversion)
- ILoveIMG.com (resize to 1024x1024)

---

## 🚀 Building for Production

### **Prerequisites:**
1. Images must be proper PNG format and square (1024x1024)
2. Expo account credentials
3. Production backend URL configured in `.env`

### **Build Commands:**

**Android APK (Direct Install):**
```bash
cd /app/frontend
eas build -p android --profile preview
```

**iOS IPA (Requires Apple Developer Account):**
```bash
cd /app/frontend
eas build -p ios --profile preview
```

**Both Platforms:**
```bash
cd /app/frontend
eas build --platform all --profile preview
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Missing peer dependency"
**Solution:** Already fixed with `.npmrc` and added dependencies

### Issue: "Gradle wrapper not found"
**Solution:** Already fixed - native folders excluded from git

### Issue: "Image format error"
**Solution:** Replace images with proper 1024x1024 PNG files

### Issue: "Package version mismatch"
**Solution:** All packages aligned with Expo SDK 54

---

## 🔄 When Updating the App

### **For Code Changes:**
1. Make your code changes in Emergent
2. Commit to GitHub
3. Run build command - should work without additional fixes

### **For Image Changes:**
1. Create 1024x1024 PNG files
2. Replace in `/app/frontend/assets/images/`
3. Commit and push
4. Run build command

### **No Need to:**
- ❌ Reinstall dependencies manually
- ❌ Fix peer dependency conflicts
- ❌ Remove native folders
- ❌ Configure .npmrc again

---

## 📊 Build Time Expectations

- **Android Build:** ~15-20 minutes
- **iOS Build:** ~25-30 minutes
- **First Build:** May take longer (credentials setup)
- **Subsequent Builds:** Faster (cached dependencies)

---

## 🎯 Build Success Indicators

### **Successful Build:**
- ✅ Dependencies install without errors
- ✅ Bundle JavaScript completes
- ✅ Gradle build succeeds (Android)
- ✅ Xcode build succeeds (iOS)
- ✅ Download link provided

### **What You Get:**
- **Android:** `.apk` file (50-80 MB)
- **iOS:** `.ipa` file (50-80 MB)

---

## 📧 Distribution

### **Android:**
- Share APK file directly
- Users install via "Unknown Sources"
- No Google Play Store needed for beta testing

### **iOS:**
- Requires TestFlight or device UDID registration
- Apple Developer Account ($99/year) required
- More complex distribution than Android

---

## 🔗 Useful Links

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **Expo Dashboard:** https://expo.dev
- **App.json Config:** https://docs.expo.dev/workflow/configuration/
- **Prebuild Info:** https://docs.expo.dev/workflow/prebuild/

---

## ✅ Configuration Status

**Last Updated:** {{date}}

- [x] .npmrc configured
- [x] .gitignore updated
- [x] Dependencies added
- [x] Package versions aligned
- [x] Native folders excluded
- [x] Production backend URL set
- [x] EAS Build configuration complete

**Status:** Ready for production builds ✨
