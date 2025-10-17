# Google Authentication Setup for Linquo Mobile App

This guide will help you set up Google OAuth authentication for the Linquo mobile app.

## Prerequisites

1. Google Cloud Console account
2. Supabase project with Auth enabled
3. Android development environment (for Android app)

## Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable APIs
1. Go to "APIs & Services" > "Library"
2. Search for and enable:
   - Google+ API
   - Google Sign-In API
   - Google Identity API

### 1.3 Create OAuth 2.0 Credentials

#### For Android:
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Select "Android" as application type
4. Fill in:
   - **Name**: Linquo Android
   - **Package name**: `com.linquo.app`
   - **SHA-1 certificate fingerprint**: Get this by running:
     ```bash
     cd android
     ./gradlew signingReport
     ```
5. Click "Create"
6. Download the `google-services.json` file
7. Place it in `android/app/google-services.json`

#### For Web (Required for React Native):
1. Click "Create Credentials" > "OAuth 2.0 Client ID"
2. Select "Web application" as application type
3. Fill in:
   - **Name**: Linquo Web
   - **Authorized redirect URIs**: 
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for development)
4. Click "Create"
5. Copy the **Client ID** (this is your `webClientId`)

## Step 2: Update Configuration

### 2.1 Update Google Auth Config
Edit `src/config/googleAuth.ts` and replace the placeholder values:

```typescript
export const GOOGLE_AUTH_CONFIG = {
  webClientId: 'YOUR_ACTUAL_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com', // If supporting iOS
  android: {
    packageName: 'com.linquo.app',
  },
};
```

### 2.2 Update Supabase Auth Settings
1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Enable "Google" provider
4. Add your Google OAuth credentials:
   - **Client ID**: Your Web Client ID from Google Console
   - **Client Secret**: Your Web Client Secret from Google Console
5. Add redirect URLs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
   - `com.linquo.app://auth/callback` (for mobile deep linking)

## Step 3: Android Configuration

### 3.1 Add Google Services Plugin
The `google-services.json` file should already be in place from Step 1.3.

### 3.2 Update Android Build Files
Make sure your `android/app/build.gradle` includes:

```gradle
apply plugin: 'com.google.gms.google-services'
```

And your `android/build.gradle` includes:

```gradle
classpath 'com.google.gms:google-services:4.3.15'
```

## Step 4: Test the Implementation

### 4.1 Build and Test
1. Clean and rebuild your Android project:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

2. Test Google Sign-In:
   - Tap "Continue with Google" on login/signup screens
   - Verify the Google sign-in flow works
   - Check that users are properly authenticated

### 4.2 Debug Common Issues

#### "Google Play Services not available"
- Make sure you're testing on a real device or emulator with Google Play Services
- Update Google Play Services on your device

#### "Invalid client ID"
- Double-check your `webClientId` in the config
- Ensure the SHA-1 fingerprint matches your app's signing certificate

#### "Redirect URI mismatch"
- Verify redirect URIs in both Google Console and Supabase
- Make sure the package name matches exactly

## Step 5: Production Setup

### 5.1 Release Certificate
For production, you'll need to:
1. Generate a release keystore
2. Get the SHA-1 fingerprint of your release certificate
3. Add this fingerprint to your Google Console OAuth client
4. Update your `google-services.json` with production settings

### 5.2 Environment Variables
Consider moving sensitive configuration to environment variables:

```typescript
export const GOOGLE_AUTH_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  // ... other config
};
```

## Troubleshooting

### Common Error Messages

1. **"Sign-in failed"**: Check your Google Console configuration
2. **"Network error"**: Verify internet connection and API enablement
3. **"Invalid package name"**: Ensure package name matches exactly
4. **"OAuth consent screen"**: Complete the OAuth consent screen setup in Google Console

### Debug Logs
Enable debug logging by adding to your app:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Enable debug logging
GoogleSignin.configure({
  // ... your config
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});
```

## Security Notes

1. Never commit `google-services.json` or client secrets to version control
2. Use environment variables for sensitive configuration
3. Regularly rotate your OAuth credentials
4. Monitor your Google Console for unusual activity

## Support

If you encounter issues:
1. Check the [React Native Google Sign-In documentation](https://github.com/react-native-google-signin/google-signin)
2. Verify your Google Console setup
3. Check Supabase Auth logs
4. Review the console logs in your app

---

**Note**: This setup is for Android. For iOS support, you'll need additional configuration including iOS OAuth client and Apple Developer account setup.
