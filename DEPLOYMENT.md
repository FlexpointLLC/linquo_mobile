# 🚀 Deployment Guide - Linquo Mobile App

Complete guide to deploy your mobile app to the App Store and Google Play Store.

## 📋 Pre-Deployment Checklist

### Before You Start
- [ ] App is fully tested on both iOS and Android
- [ ] All features work correctly
- [ ] No console errors or warnings
- [ ] Real-time features are working
- [ ] Authentication is secure
- [ ] Environment variables are configured
- [ ] App icons and splash screens are ready
- [ ] Privacy policy and terms are prepared

### Required Accounts
- [ ] Apple Developer Account ($99/year) - for iOS
- [ ] Google Play Developer Account ($25 one-time) - for Android
- [ ] Expo Account (free) - for EAS Build

## 🍎 iOS Deployment

### Step 1: Apple Developer Account Setup

1. **Create Apple Developer Account**
   - Go to [developer.apple.com](https://developer.apple.com)
   - Sign up ($99/year)
   - Complete enrollment process

2. **Create App Store Connect Record**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"
   - Fill in app information:
     - Platform: iOS
     - Name: Linquo
     - Primary Language: English
     - Bundle ID: com.linquo.app
     - SKU: linquo-app

### Step 2: Prepare App Assets

1. **App Icon** (1024x1024px)
   - Create high-res icon
   - No transparency
   - No rounded corners (Apple adds them)

2. **Screenshots** (Required sizes)
   - 6.7" iPhone: 1290 x 2796 pixels
   - 6.5" iPhone: 1242 x 2688 pixels
   - 5.5" iPhone: 1242 x 2208 pixels
   - 12.9" iPad: 2048 x 2732 pixels

3. **App Preview Video** (Optional but recommended)
   - 15-30 seconds
   - Show key features
   - No audio required

### Step 3: Build with EAS

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure EAS**
   ```bash
   eas build:configure
   ```

4. **Build for iOS**
   ```bash
   eas build --platform ios --profile production
   ```

5. **Wait for Build**
   - Build takes 15-30 minutes
   - You'll get a download link
   - Download the .ipa file

### Step 4: Submit to App Store

1. **Upload Build**
   ```bash
   eas submit --platform ios
   ```
   
   Or manually:
   - Download Transporter app
   - Upload .ipa file
   - Wait for processing

2. **Complete App Store Listing**
   - App name and subtitle
   - Description (4000 chars max)
   - Keywords
   - Support URL
   - Privacy policy URL
   - Screenshots
   - App category
   - Age rating

3. **Submit for Review**
   - Click "Submit for Review"
   - Answer questions
   - Wait 1-3 days for review

### Step 5: App Review Process

**What Apple Checks:**
- App functionality
- User interface
- Performance
- Privacy compliance
- Content policy

**Common Rejection Reasons:**
- Crashes or bugs
- Incomplete features
- Privacy policy missing
- Misleading description

**If Rejected:**
- Read feedback carefully
- Fix issues
- Resubmit

## 🤖 Android Deployment

### Step 1: Google Play Console Setup

1. **Create Developer Account**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Pay $25 one-time fee
   - Complete registration

2. **Create App**
   - Click "Create app"
   - Fill in details:
     - App name: Linquo
     - Default language: English
     - App or game: App
     - Free or paid: Free

### Step 2: Prepare App Assets

1. **App Icon** (512x512px)
   - PNG format
   - 32-bit with alpha
   - No rounded corners

2. **Feature Graphic** (1024x500px)
   - Showcases your app
   - Used in store listing

3. **Screenshots** (Required)
   - Phone: 320-3840px (at least 2)
   - 7" Tablet: 320-3840px (optional)
   - 10" Tablet: 320-3840px (optional)

### Step 3: Build with EAS

1. **Build for Android**
   ```bash
   eas build --platform android --profile production
   ```

2. **Wait for Build**
   - Build takes 10-20 minutes
   - Download .aab file

### Step 4: Submit to Google Play

1. **Upload Build**
   ```bash
   eas submit --platform android
   ```

   Or manually:
   - Go to Play Console
   - Production → Create new release
   - Upload .aab file

2. **Complete Store Listing**
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots
   - Feature graphic
   - App category
   - Content rating
   - Target audience
   - Privacy policy

3. **Content Rating**
   - Complete questionnaire
   - Get rating certificate

4. **Submit for Review**
   - Click "Submit for review"
   - Wait 1-3 days

### Step 5: App Review Process

**What Google Checks:**
- Policy compliance
- Content appropriateness
- Technical quality
- Metadata accuracy

**Common Rejection Reasons:**
- Policy violations
- Misleading information
- Privacy policy issues
- Crashes

## 🔄 Over-The-Air (OTA) Updates

### What are OTA Updates?
- Update JavaScript code without app store review
- Instant updates for users
- No need to resubmit to stores

### When to Use OTA
✅ **Good for:**
- Bug fixes
- UI tweaks
- Content updates
- Minor features

❌ **Not for:**
- Native code changes
- New permissions
- Major features

### How to Publish OTA Update

1. **Make your changes**
   ```bash
   # Edit your code
   ```

2. **Publish update**
   ```bash
   eas update --branch production --message "Bug fixes"
   ```

3. **Users get update**
   - Next time they open app
   - Or force reload
   - No app store needed!

## 📊 Version Management

### Semantic Versioning
```
1.0.0
│ │ │
│ │ └─ Patch (bug fixes)
│ └─── Minor (new features)
└───── Major (breaking changes)
```

### Update Version Numbers

1. **In app.json**
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "ios": {
         "buildNumber": "2"
       },
       "android": {
         "versionCode": 2
       }
     }
   }
   ```

2. **Build new version**
   ```bash
   eas build --platform all
   ```

## 🔐 Environment Variables for Production

### Production .env
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-production.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

### Staging .env
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-staging.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-staging-key
```

### Using EAS Secrets
```bash
# Set secret
eas secret:create --name SUPABASE_URL --value your-url

# Use in eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$SUPABASE_URL"
      }
    }
  }
}
```

## 📱 App Store Optimization (ASO)

### iOS App Store

**Title** (30 chars)
```
Linquo - Customer Support
```

**Subtitle** (30 chars)
```
Real-time Chat for Teams
```

**Keywords** (100 chars)
```
customer support,live chat,helpdesk,messaging,business,crm,communication,team,agent,service
```

**Description** (4000 chars)
- Start with key benefits
- List main features
- Include use cases
- End with call-to-action

### Google Play Store

**Short Description** (80 chars)
```
Manage customer conversations on-the-go with real-time chat and AI support
```

**Full Description** (4000 chars)
- Similar to iOS
- Use bullet points
- Include keywords naturally

## 🎯 Launch Checklist

### Week Before Launch
- [ ] Final testing on real devices
- [ ] All assets prepared
- [ ] Store listings written
- [ ] Privacy policy published
- [ ] Support email set up
- [ ] Marketing materials ready

### Launch Day
- [ ] Submit to both stores
- [ ] Monitor for approval
- [ ] Prepare announcement
- [ ] Set up analytics
- [ ] Monitor crash reports

### After Launch
- [ ] Respond to reviews
- [ ] Monitor analytics
- [ ] Fix critical bugs quickly
- [ ] Plan next update
- [ ] Gather user feedback

## 📈 Post-Launch Monitoring

### Key Metrics to Track
- Downloads
- Daily active users
- Retention rate
- Crash rate
- App store rating
- Review sentiment

### Tools to Use
- Expo Analytics
- Firebase Analytics
- App Store Connect Analytics
- Google Play Console Analytics

## 🐛 Handling Issues

### Critical Bug Found
1. Fix immediately
2. Test thoroughly
3. Build new version
4. Submit expedited review (if possible)
5. Or publish OTA update

### Negative Reviews
1. Respond professionally
2. Acknowledge issue
3. Explain fix timeline
4. Follow up when fixed

## 💰 Monetization (Future)

### Options
- In-app purchases
- Subscriptions
- Ads (not recommended for B2B)
- Premium features

### Implementation
```bash
# Install revenue cat
npm install react-native-purchases
```

## 🔄 CI/CD Pipeline (Advanced)

### GitHub Actions Example
```yaml
name: EAS Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: expo/expo-github-action@v7
      - run: npm install
      - run: eas build --platform all --non-interactive
```

## 📞 Support Resources

### Expo
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [Expo Forums](https://forums.expo.dev/)

### App Stores
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## 🎉 Congratulations!

Once approved, your app will be live on:
- 🍎 Apple App Store
- 🤖 Google Play Store

Users can download and start using it immediately!

---

**Questions?** Check the documentation or reach out to your development team.

**Good luck with your launch! 🚀**

