# 📱 Beneficial Inspections - Beta Build Instructions

## Configuration Files Created ✅
- ✅ `eas.json` - EAS Build configuration
- ✅ `app.json` - Updated with production settings

## Prerequisites

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Create Expo Account
- Go to https://expo.dev
- Sign up for a free account
- Verify your email

### 3. Login to Expo
```bash
cd /app/frontend
eas login
```
Enter your Expo credentials when prompted.

### 4. Configure Project (First Time Only)
```bash
cd /app/frontend
eas build:configure
```
This will:
- Link your project to Expo
- Generate a project ID (auto-updates app.json)
- Set up build profiles

---

## 🤖 Android Beta Build (Direct APK)

### Build APK for Direct Installation
```bash
cd /app/frontend
eas build -p android --profile preview
```

**Build Process:**
1. EAS will ask if you want to generate a new Android keystore
   - Select **Yes** (first time)
   - Keystore will be managed by Expo automatically
2. Build starts (takes ~10-20 minutes)
3. You'll get a link to download the APK when done

**Download & Distribute:**
1. Go to https://expo.dev/accounts/[your-account]/projects/beneficial-inspections/builds
2. Download the `.apk` file
3. Share the APK file or download link with beta testers

**Installation for Testers:**
1. Download APK on Android device
2. Enable "Install from Unknown Sources" in Settings
3. Tap APK file to install
4. Open "Beneficial Inspections" app

---

## 🍎 iOS Beta Build (Ad-Hoc Distribution)

### Requirements:
- Apple Developer Account ($99/year)
- Up to 100 registered device UDIDs for testing

### Build for iOS
```bash
cd /app/frontend
eas build -p ios --profile preview
```

**Build Process:**
1. EAS will prompt you to:
   - Login to your Apple Developer account
   - Generate signing certificates (automatic)
   - Register test devices
2. Build starts (takes ~15-30 minutes)
3. You'll get a link to download the `.ipa` when done

**Register Tester Devices:**
Before building, collect device UDIDs from testers:

**Method 1: Using Expo (Easiest)**
```bash
eas device:create
```
Send the generated link to testers. They open on their iPhone → their device gets registered.

**Method 2: Manual UDID Collection**
Testers can find their UDID:
1. Connect iPhone to Mac
2. Open Finder → Click iPhone
3. Click under device name to show UDID
4. Copy UDID and send to you

Add devices:
```bash
eas device:create --apple-team-id YOUR_TEAM_ID
```

**Installation for Testers:**
1. Download `.ipa` file
2. Use TestFlight (requires Apple Developer) or
3. Install via Xcode or third-party tools like Diawi

---

## 🚀 Build Both Platforms at Once
```bash
cd /app/frontend
eas build --platform all --profile preview
```

---

## 📊 Monitor Builds

### Check Build Status
```bash
eas build:list
```

### View Build Details
Go to: https://expo.dev/accounts/[your-account]/projects/beneficial-inspections/builds

---

## 🔄 Update Production Backend URL

**IMPORTANT:** Before building, update the backend URL in `/app/frontend/.env`:

```bash
EXPO_PUBLIC_BACKEND_URL=https://your-production-backend.com/api
```

Make sure your production backend is deployed and accessible!

---

## 🎯 Testing Checklist

### Before Distributing to Testers:
- [ ] Backend deployed to production URL
- [ ] `.env` file updated with production backend URL
- [ ] Square payment credentials updated (production keys)
- [ ] Test login/registration on build
- [ ] Test inspection workflow end-to-end
- [ ] Test payment processing
- [ ] Test report generation
- [ ] Test push notifications

### Tester Instructions Document:
Create a simple guide for testers:
1. How to install the app (APK for Android, IPA for iOS)
2. Test credentials (or registration flow)
3. What features to test
4. How to report bugs (email, form, etc.)

---

## 🆘 Troubleshooting

### Build Fails - Android
**Error: "No valid Android keystore"**
```bash
eas credentials
# Select Android → Keystore → Generate new
```

### Build Fails - iOS
**Error: "No provisioning profile"**
```bash
eas credentials
# Select iOS → Provisioning Profile → Generate new
```

### App Crashes on Launch
- Check backend URL is correct in `.env`
- Check backend is running and accessible
- Check console logs for errors

### Cannot Install on iOS
- Ensure device UDID is registered
- Check provisioning profile includes the device
- Rebuild after adding new devices

---

## 📝 Version Management

### Update Version for New Build
Edit `/app/frontend/app.json`:
```json
{
  "expo": {
    "version": "1.0.1",  // Increment this
    "ios": {
      "buildNumber": "2"  // Increment this
    },
    "android": {
      "versionCode": 2  // Increment this
    }
  }
}
```

Then rebuild:
```bash
eas build -p all --profile preview
```

---

## 🎉 Ready to Build!

**Quick Start:**
```bash
# 1. Login
cd /app/frontend
eas login

# 2. Configure (first time only)
eas build:configure

# 3. Build Android APK
eas build -p android --profile preview

# 4. Build iOS (if you have Apple Developer account)
eas build -p ios --profile preview
```

**Build time:** 10-30 minutes per platform

**Cost:** Free (Expo provides free build minutes for personal projects)

---

## 📧 Support
- Expo Documentation: https://docs.expo.dev/build/introduction/
- EAS Build Docs: https://docs.expo.dev/build/setup/

## 🔗 Useful Links
- Expo Dashboard: https://expo.dev
- Build History: https://expo.dev/accounts/[your-account]/projects/beneficial-inspections/builds
- Device Registration: https://expo.dev/accounts/[your-account]/devices
