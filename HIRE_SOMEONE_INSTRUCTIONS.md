# 📱 Instructions for Freelancer - Build Expo Apps

## Job Description for Fiverr/Upwork

**Title:** Build iOS & Android Apps from Expo React Native Project

**Description:**
I need someone to build my mobile app (iOS & Android) using Expo EAS. All code is ready and configured. You just need to run build commands and send me the APK and IPA files.

**Requirements:**
- Experience with Expo and EAS CLI
- Access to Terminal/Command Line
- 30 minutes of your time

**What I'll Provide:**
- Expo account credentials (email + password)
- Complete configured project
- All necessary files and instructions

**What You Need to Do:**
1. Run 4 simple commands in Terminal
2. Wait for builds to complete (automated, ~30 minutes)
3. Send me download links for APK (Android) and IPA (iOS)

**Budget:** $30-50
**Time:** 30 minutes hands-on + 30 minutes automated

---

## Information to Share with Freelancer

### Project Details
- **App Name:** Beneficial Inspections
- **Framework:** Expo React Native
- **Expo Account:** bradbakertx@gmail.com
- **Backend URL:** https://homepro-inspect.emergent.host/api (already configured)

### Commands They Need to Run

```bash
# 1. Navigate to project
cd /app/frontend

# 2. Login to Expo
eas login
# Use: bradbakertx@gmail.com
# Password: [YOU'LL PROVIDE SEPARATELY]

# 3. Configure project (first time only)
eas build:configure

# 4. Build Android APK
eas build -p android --profile preview

# 5. Build iOS (optional - requires Apple Developer account)
eas build -p ios --profile preview
```

### What They'll Deliver
1. **Android APK file** - Direct download link from Expo
2. **iOS IPA file** (if you have Apple Developer account) - Direct download link from Expo
3. **Build URLs** - Links to view builds on Expo dashboard

### Apple Developer Account (Optional for iOS)
- If you DON'T have Apple Developer account: Skip iOS build, Android only
- If you DO have Apple Developer account: Provide credentials when EAS asks

---

## Security Notes

**Safe to Share:**
- ✅ Expo account email: bradbakertx@gmail.com
- ✅ Expo account password (via secure channel)
- ✅ Apple Developer credentials (if needed, via secure channel)

**Keep Private:**
- ❌ Don't share source code publicly
- ❌ Change Expo password after build is complete (optional but recommended)

---

## Expected Timeline

1. **Hire freelancer:** 1-2 hours (finding the right person)
2. **Freelancer setup:** 10 minutes (installing tools if needed)
3. **Running commands:** 5 minutes (hands-on)
4. **Build time:** 15-30 minutes (automated)
5. **Total:** Less than 1 hour

---

## Verification Steps

Ask the freelancer to:
1. Send screenshot of successful build completion
2. Share Expo build URLs
3. Test download links work

---

## Alternative: Emergent Support

Before hiring, you can also ask Emergent support:
- "Can you run EAS build commands for my Expo project?"
- They may have this service available
- Could be faster and cheaper
- Email: support@emergent.com

---

## Fiverr Search Terms

Search on Fiverr for:
- "Expo app build"
- "EAS CLI build"
- "React Native Expo deployment"
- "Mobile app build Expo"

**Look for sellers with:**
- ✅ Experience with Expo/React Native
- ✅ Good reviews
- ✅ Quick turnaround (same day)
- ✅ $30-50 price range

---

## Questions Freelancers Might Ask

**Q: Do I need to write any code?**
A: No, all code is ready. Just run build commands.

**Q: Where is the project?**
A: It's hosted on Emergent platform at /app/frontend

**Q: Do you have Apple Developer account?**
A: [Answer: Yes or No. If No, skip iOS build]

**Q: What's the backend URL?**
A: Already configured: https://homepro-inspect.emergent.host/api

**Q: Any specific app icons or splash screens?**
A: Already configured in the project.

---

## Success Criteria

You'll know it's successful when you receive:
1. ✅ `.apk` file (Android) - You can install this on any Android phone
2. ✅ `.ipa` file (iOS, if applicable) - Requires TestFlight or device registration
3. ✅ Both apps connect to your production backend
4. ✅ You can test login and basic features

---

## Next Steps After Getting Apps

1. **Test the apps yourself first**
   - Install APK on Android phone
   - Test login with your owner account
   - Check if it connects to production backend

2. **Distribute to beta testers**
   - Send APK file directly (Android)
   - Use TestFlight for iOS beta testing

3. **Gather feedback**
   - Create a simple feedback form
   - Ask testers to report bugs
   - Note feature requests

---

## Contact

If freelancer has questions, they can:
- Check `/app/BUILD_INSTRUCTIONS.md` for detailed steps
- Check `/app/SIMPLE_BUILD_COMMANDS.md` for quick reference
- Review Expo documentation: https://docs.expo.dev/build/
