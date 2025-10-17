import { useEffect, useState } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
// import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/components/SplashScreen';
// import { 
//   registerForPushNotificationsAsync, 
//   savePushTokenToDatabase,
//   setupNotificationListeners 
// } from './src/services/notificationService';
// import { supabase } from './src/lib/supabase';

// Prevent auto-hiding splash screen
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide expo splash screen immediately
    ExpoSplashScreen.hideAsync();

    // Show custom splash for 2 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // TODO: Setup push notifications later
  // useEffect(() => {
  //   let isMounted = true;

  //   const setupPushNotifications = async () => {
  //     try {
  //       // Register for push notifications
  //       const token = await registerForPushNotificationsAsync();
  //       
  //       if (token && isMounted) {
  //         // Get current user
  //         const { data: { user } } = await supabase.auth.getUser();
  //         
  //         if (user) {
  //           // Save token to database
  //           await savePushTokenToDatabase(user.id, token);
  //         }
  //       }

  //       // Setup notification listeners
  //       const cleanup = setupNotificationListeners(
  //         (notification) => {
  //           console.log('Notification received in foreground:', notification);
  //         },
  //         (response) => {
  //           console.log('Notification tapped:', response);
  //           // TODO: Navigate to conversation if notification contains conversation_id
  //         }
  //       );

  //       return cleanup;
  //     } catch (error) {
  //       console.error('Error setting up push notifications:', error);
  //       // Don't crash the app if push notifications fail
  //     }
  //   };

  //   // Delay push notification setup to after app is fully loaded
  //   const timer = setTimeout(() => {
  //     setupPushNotifications().catch(err => {
  //       console.error('Push notification setup failed:', err);
  //     });
  //   }, 3000);

  //   return () => {
  //     clearTimeout(timer);
  //     isMounted = false;
  //   };
  // }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
