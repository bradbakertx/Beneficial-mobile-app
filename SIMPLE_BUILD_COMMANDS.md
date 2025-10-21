# 🚀 Simple Build Commands for Beneficial Inspections

## ✅ Everything is Already Configured!

- Backend URL: `https://homepro-inspect.emergent.host/api`
- Expo Account: bradbakertx@gmail.com
- All code is ready in: `/app/frontend`

---

## 📱 Build Commands (Run These in Order)

### Step 1: Navigate to Project
```bash
cd /app/frontend
```

### Step 2: Login to Expo
```bash
eas login
```
- Email: `bradbakertx@gmail.com`
- Password: [Your Expo password]

### Step 3: Configure Project (First Time Only)
```bash
eas build:configure
```
- This links your project to Expo
- Just press Enter to accept defaults

### Step 4: Build Android APK
```bash
eas build -p android --profile preview
```
- Takes ~15-20 minutes
- You'll get a download link when done

### Step 5: Build iOS App (Optional - Requires Apple Developer Account)
```bash
eas build -p ios --profile preview
```
- Takes ~25-30 minutes
- Requires Apple Developer account ($99/year)
- You'll get a download link when done

---

## 🎯 What You Get

### Android:
- **File:** `beneficial-inspections.apk`
- **Size:** ~50-80 MB
- **Install:** Send to any Android phone, enable "Unknown Sources", install

### iOS:
- **File:** `beneficial-inspections.ipa`
- **Size:** ~50-80 MB
- **Install:** Requires TestFlight or device UDID registration

---

## 💡 Who Can Run These Commands?

**Anyone with:**
1. Access to a Mac or Linux computer with Terminal
2. Your Expo account login (bradbakertx@gmail.com + password)
3. 30 minutes of time

**Recommended:**
- Fiverr freelancer: Search "Expo EAS build" - Cost: $30-50
- Technical friend with command line experience
- Emergent support (ask if they can run builds for you)

---

## 🆘 Troubleshooting

### "eas: command not found"
Run this first:
```bash
npm install -g eas-cli
```

### "Permission denied"
Add `sudo` before the npm command:
```bash
sudo npm install -g eas-cli
```

### "No credentials found"
During build, EAS will ask to generate credentials automatically. Say YES.

---

## 📧 Support

- Expo Build Docs: https://docs.expo.dev/build/setup/
- Your builds: https://expo.dev/accounts/[your-account]/builds
- Emergent Support: support@emergent.com

---

## ✅ Ready to Build!

Your app is configured and ready. Just run the commands above and you'll have installable apps for iOS and Android!

**Estimated time:** 30 minutes hands-on + 30 minutes automated building = 1 hour total
