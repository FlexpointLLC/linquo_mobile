# 🔥 Firebase FCM Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it: `linquo-push-notifications`
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Add Android App

1. In Firebase Console, click "Add app" → Android
2. **Package name**: `com.linquo.app`
3. **App nickname**: `Linquo Mobile`
4. **SHA-1**: Get this by running:
   ```bash
   cd android && ./gradlew signingReport
   ```
   Look for the SHA1 fingerprint under "Variant: debug"
5. Click "Register app"

## Step 3: Download Configuration Files

1. Download `google-services.json` from Firebase Console
2. Place it in: `android/app/google-services.json`

## Step 4: Get FCM Server Key

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Copy the **Server key** (starts with `AAAA...`)
3. Save this key - you'll need it for Supabase Edge Function

## Step 5: Update Android Configuration

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

Add to `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

## Step 6: Deploy Supabase Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref vzoteejdvffrdjprfpad
   ```

4. Set environment variables:
   ```bash
   supabase secrets set FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY_HERE
   ```

5. Deploy the function:
   ```bash
   supabase functions deploy push-notifications
   ```

## Step 7: Set up Database Trigger

Run the SQL in `supabase/functions/push-notifications/trigger.sql` in your Supabase SQL Editor.

## Step 8: Test the Setup

1. Build and install the app
2. Send a test message from another device
3. Check if notifications are received even when app is closed

## Troubleshooting

- **No notifications**: Check FCM server key and device token registration
- **Build errors**: Ensure `google-services.json` is in the correct location
- **Function errors**: Check Supabase Edge Function logs

## Next Steps

Once Firebase is set up, the app will:
- ✅ Register FCM tokens with Supabase
- ✅ Receive notifications even when app is closed
- ✅ Handle notification taps and navigation
- ✅ Work reliably across all Android devices
