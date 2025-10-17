# Linquo Mobile App - Setup Guide

## 📱 Quick Start

This React Native mobile app connects to your existing Linquo backend (Supabase). Follow these steps to get started.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 20.x or higher installed
- ✅ npm or yarn package manager
- ✅ Expo CLI: `npm install -g expo-cli`
- ✅ A Supabase project (from your main Linquo app)
- ✅ iOS Simulator (Mac) or Android Studio (for testing)

## Step 1: Install Dependencies

```bash
cd linquo-mobile-app
npm install
```

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials from your main Linquo project:
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the Project URL and anon/public key

3. Update `.env` with your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Start Development Server

```bash
npm start
```

This will start the Expo development server and show a QR code.

## Step 4: Run on Device/Simulator

### Option A: Physical Device (Easiest)

1. Install **Expo Go** app:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from your terminal with:
   - iOS: Camera app
   - Android: Expo Go app

3. The app will load on your device!

### Option B: iOS Simulator (Mac only)

```bash
npm run ios
```

Requirements:
- Xcode installed
- iOS Simulator set up

### Option C: Android Emulator

```bash
npm run android
```

Requirements:
- Android Studio installed
- Android emulator configured and running

## Testing the App

### Test Credentials

Use the same credentials you use for your web dashboard:
- Email: Your agent email
- Password: Your agent password

### What to Test

1. **Login Flow**
   - Login with valid credentials
   - Check error handling with invalid credentials

2. **Conversations List**
   - View all conversations
   - Check unread counts
   - Pull to refresh
   - See AI conversation indicators

3. **Individual Chat**
   - Open a conversation
   - Send messages
   - Receive real-time updates
   - Check message timestamps

4. **Profile**
   - View profile information
   - Test logout functionality

## Project Structure

```
linquo-mobile-app/
├── src/
│   ├── screens/              # All app screens
│   │   ├── auth/            # Login, signup screens
│   │   │   └── LoginScreen.tsx
│   │   └── main/            # Main app screens
│   │       ├── ChatsScreen.tsx    # Conversations list
│   │       ├── ChatScreen.tsx     # Individual chat
│   │       └── ProfileScreen.tsx  # User profile
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── lib/                # Libraries and utilities
│   │   └── supabase.ts     # Supabase client setup
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── components/         # Reusable UI components (future)
│   └── hooks/             # Custom React hooks (future)
├── assets/                # Images, fonts, icons
├── App.tsx               # Root component
├── app.json             # Expo configuration
├── package.json         # Dependencies
└── .env                # Environment variables (create this)
```

## Common Issues & Solutions

### Issue: "Cannot connect to Metro bundler"

**Solution:**
```bash
# Clear cache and restart
npm start -- --clear
```

### Issue: "Network request failed" when logging in

**Solution:**
- Check your `.env` file has correct Supabase credentials
- Ensure your Supabase project is running
- Check your internet connection

### Issue: "Invariant Violation: requireNativeComponent"

**Solution:**
```bash
# Restart with cache clear
expo start -c
```

### Issue: iOS build fails

**Solution:**
```bash
# Update CocoaPods
cd ios
pod install
cd ..
```

### Issue: Android build fails

**Solution:**
```bash
# Clean gradle
cd android
./gradlew clean
cd ..
```

## Development Tips

### Hot Reload
- Shake your device to open the developer menu
- Enable "Fast Refresh" for instant updates

### Debugging
- Press `j` in the terminal to open Chrome DevTools
- Use `console.log()` for debugging
- Check the Expo Go app for error messages

### Testing Real-time Features
1. Open the web dashboard in a browser
2. Open the mobile app
3. Send messages from either platform
4. Watch them appear in real-time on both!

## Building for Production

### Prerequisites for Production Builds

1. **iOS:**
   - Mac computer
   - Apple Developer account ($99/year)
   - Xcode installed

2. **Android:**
   - Google Play Developer account ($25 one-time)
   - Android Studio installed

### Using EAS Build (Recommended)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure your project:
   ```bash
   eas build:configure
   ```

4. Build for iOS:
   ```bash
   eas build --platform ios
   ```

5. Build for Android:
   ```bash
   eas build --platform android
   ```

### Classic Expo Build

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## Environment-Specific Builds

### Development
```bash
npm start
```

### Staging
```bash
# Update .env with staging credentials
npm start
```

### Production
```bash
# Update .env with production credentials
eas build --platform all --profile production
```

## Next Steps

After getting the app running:

1. **Customize the UI**
   - Update colors in styles
   - Add your logo to assets
   - Customize splash screen

2. **Add Features**
   - Push notifications
   - File uploads
   - Voice messages
   - Dark mode

3. **Optimize Performance**
   - Add image caching
   - Implement pagination
   - Add offline support

4. **Deploy**
   - Submit to App Store
   - Submit to Play Store
   - Set up CI/CD

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Documentation](https://supabase.com/docs)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Expo documentation
3. Check Supabase status
4. Contact your development team

## License

Proprietary - All rights reserved

