# Square In-App Payments SDK Implementation Guide

## ✅ What Has Been Done

### 1. Package Installation
- ✅ Installed `react-native-square-in-app-payments@1.7.6`
- ✅ Added Square plugin to `app.json` with your Square App ID

### 2. Native Payment Screen Created
- ✅ Created `/app/frontend/app/inspections/payment-native.tsx`
- ✅ Uses Square In-App SDK instead of WebView
- ✅ Native card entry experience
- ✅ Proper error handling and success flows

### 3. Backend Already Ready
- ✅ Your backend endpoint `/inspections/{id}/create-payment` already accepts Square payment tokens
- ✅ No backend changes needed

---

## 🚧 What Needs to Be Done Next

### Step 1: Generate Native Builds

The Square In-App SDK requires **native modules** which means:
- ❌ **Cannot use Expo Go** (doesn't support custom native modules)
- ✅ **Must use Expo Dev Client** or eject to bare workflow

**Choose One Option:**

#### Option A: Use Expo Dev Client (Recommended)
```bash
cd /app/frontend

# Install expo-dev-client
yarn add expo-dev-client

# Build development client for iOS
npx expo prebuild
npx expo run:ios

# Build development client for Android
npx expo run:android
```

#### Option B: Use EAS Build (Cloud Build)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build dev client
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Step 2: Initialize Square SDK

Add initialization code to your app's root layout:

**File:** `/app/frontend/app/_layout.tsx`

```typescript
import * as SQIPCore from 'react-native-square-in-app-payments';
import { useEffect } from 'react';

// Add this inside your root component
useEffect(() => {
  const initializeSquare = async () => {
    try {
      await SQIPCore.setSquareApplicationId('sq0idp-KPprlVpEwx6PRpSM-38ruA');
      console.log('Square SDK initialized');
    } catch (error) {
      console.error('Square SDK initialization error:', error);
    }
  };

  initializeSquare();
}, []);
```

### Step 3: Replace Old Payment Screen

Rename files:
```bash
# Backup old WebView version
mv /app/frontend/app/inspections/payment.tsx /app/frontend/app/inspections/payment-webview-backup.tsx

# Use native SDK version
mv /app/frontend/app/inspections/payment-native.tsx /app/frontend/app/inspections/payment.tsx
```

OR update the navigation to use the new file (easier for testing both):
- Keep both files
- Test native version first on dev client
- Switch back to WebView version if needed

---

## 📱 Testing Instructions

### Test Card Numbers (Square Sandbox)
```
Visa (Success):
  Card: 4532 7591 3850 9431
  CVV: 111
  ZIP: 12345
  Exp: Any future date

Visa (Declined):
  Card: 4111 1111 1111 1111
  CVV: 111
  ZIP: 12345
  Exp: Any future date

Mastercard (Success):
  Card: 5105 1051 0510 5100
  CVV: 111
  ZIP: 12345
  Exp: Any future date
```

### Testing Flow
1. Build and install dev client on device/simulator
2. Login as Customer
3. Navigate to inspection with "Pay Now" button
4. Tap "Pay with Card"
5. Square native card entry UI should appear
6. Enter test card details
7. Submit payment
8. Should receive success message

---

## 🔧 Troubleshooting

### Issue: "Square In-App SDK not initialized"
**Solution:** Make sure `SQIPCore.setSquareApplicationId()` is called before using the SDK

### Issue: "Module not found: react-native-square-in-app-payments"
**Solution:** Run `npx expo prebuild` to generate native code

### Issue: "Invariant Violation: Native module cannot be null"
**Solution:** You're trying to use it in Expo Go. Must use dev client or bare workflow.

### Issue: Payment fails with "Invalid source_id"
**Solution:** Check that card nonce is being passed correctly to backend

---

## 🎨 UI/UX Features

The new native payment screen includes:
- ✅ Clean, professional UI matching app design
- ✅ Property address display
- ✅ Large, clear amount display
- ✅ "Pay with Card" button that launches Square SDK
- ✅ Secure payment badge
- ✅ Information card explaining the process
- ✅ Loading states
- ✅ Error handling with Square's native error display

---

## 📋 Complete File Changes

**Modified:**
- `/app/frontend/app.json` - Added Square plugin configuration
- `/app/frontend/package.json` - Added react-native-square-in-app-payments

**Created:**
- `/app/frontend/app/inspections/payment-native.tsx` - New native payment screen

**To Be Modified:**
- `/app/frontend/app/_layout.tsx` - Add Square SDK initialization
- `/app/frontend/app/inspections/payment.tsx` - Replace with native version OR keep both for testing

**Backend:**
- ✅ No changes needed! Already accepts Square tokens

---

## 🚀 Deployment Checklist

When ready for production:

1. **Test thoroughly** with Square sandbox
2. **Switch to production** Square credentials in backend
3. **Build production** apps via EAS or locally
4. **Submit to app stores** (iOS App Store, Google Play Store)
5. **Enable Apple Pay / Google Pay** (optional, requires additional setup)

---

## 💡 Benefits Over WebView

| Feature | WebView (Old) | In-App SDK (New) |
|---------|---------------|------------------|
| **UI** | Web-based | Native iOS/Android |
| **Speed** | Slower | Faster |
| **Experience** | Feels web-like | Feels native |
| **Apple Pay** | ❌ | ✅ (with setup) |
| **Google Pay** | ❌ | ✅ (with setup) |
| **Maintenance** | Custom HTML | SDK auto-updates |
| **Security** | HTTPS required | Built-in |

---

## 📞 Next Steps Summary

1. ✅ **Package installed** and configured
2. ✅ **Native screen created** and ready
3. ⏳ **Build dev client** (npx expo prebuild + run)
4. ⏳ **Initialize Square SDK** in app root
5. ⏳ **Test on physical device** or simulator
6. ⏳ **Deploy to app stores** when ready

**Current Status:** Ready for native build step. Cannot test with Expo Go.
