# Linquo Mobile App

A React Native mobile application for the Linquo customer support platform, built with Expo.

## Features

- 🔐 **Secure Authentication** - Login with Supabase Auth
- 💬 **Real-time Conversations** - Live chat updates with customers
- 🤖 **AI Support Indicator** - See which conversations are handled by AI
- 📱 **Native Experience** - Smooth, native mobile UI
- 🔔 **Push Notifications** - Get notified of new messages (coming soon)
- 📊 **Offline Support** - Work even without internet (coming soon)

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **Expo** - Development and build tooling
- **TypeScript** - Type-safe development
- **Supabase** - Backend, auth, and real-time database
- **React Navigation** - Native navigation

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulators)
- Expo Go app (for testing on physical devices)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env` and add your Supabase credentials:
   ```bash
   cp .env.example .env
   ```
   
   Update the values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

## Running the App

### On iOS Simulator (Mac only)
```bash
npm run ios
```

### On Android Emulator
```bash
npm run android
```

### On Physical Device
1. Install the **Expo Go** app from App Store or Play Store
2. Scan the QR code from the terminal
3. The app will load on your device

## Project Structure

```
linquo-mobile-app/
├── src/
│   ├── screens/          # App screens
│   │   ├── auth/         # Authentication screens
│   │   └── main/         # Main app screens
│   ├── navigation/       # Navigation setup
│   ├── components/       # Reusable components
│   ├── lib/             # Libraries and utilities
│   │   └── supabase.ts  # Supabase client
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript types
├── App.tsx              # Root component
└── package.json         # Dependencies
```

## Key Features Implementation

### Real-time Updates
The app uses Supabase Realtime to subscribe to database changes:
- New messages appear instantly
- Conversation list updates in real-time
- Read receipts are synchronized

### Authentication Flow
- Secure login with email/password
- Session persistence with AsyncStorage
- Automatic token refresh
- Protected routes

### Message Threading
- Conversation list with unread counts
- Individual chat screens
- Message history
- AI conversation indicators

## Building for Production

### iOS (requires Mac and Apple Developer account)
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Using EAS Build (Recommended)
```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

## Troubleshooting

### Metro bundler issues
```bash
npm start -- --clear
```

### iOS build issues
```bash
cd ios && pod install && cd ..
```

### Android build issues
```bash
cd android && ./gradlew clean && cd ..
```

## Future Enhancements

- [ ] Push notifications
- [ ] Offline message queue
- [ ] File/image sharing
- [ ] Voice messages
- [ ] Dark mode
- [ ] Analytics dashboard
- [ ] Customer profiles
- [ ] Settings screen

## Contributing

This is part of the Linquo platform. For contribution guidelines, see the main repository.

## License

Proprietary - All rights reserved

