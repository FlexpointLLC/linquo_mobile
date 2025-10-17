import { useEffect, useState } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
// import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/components/SplashScreen';
import { supabase } from './src/lib/supabase';
import { handleGoogleAuthCallback, createDefaultOrganizationForGoogleUser } from './src/services/googleAuthHandler';
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

      // Handle deep links for OAuth callbacks
      useEffect(() => {
        const handleDeepLink = async (url: string) => {
          console.log('Deep link received:', url);

          // Check if this is an OAuth callback
          if (url.includes('auth/callback')) {
            try {
              console.log('Processing OAuth callback from deep link...');
              
              // Wait a moment for the session to be established
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // PKCE code is in the URL; supabase-js finishes exchange automatically
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              
              if (sessionError) {
                console.error('Session error in deep link handler:', sessionError);
                return;
              }

              if (!session) {
                console.log('No session found in deep link handler, waiting...');
                // Wait longer and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
                
                if (retryError || !retrySession) {
                  console.error('Retry session error in deep link handler:', retryError);
                  return;
                }
              }

              console.log('Session found in deep link handler, processing callback...');

              // Handle the OAuth callback
              const callbackResult = await handleGoogleAuthCallback();

              if (callbackResult.success) {
                console.log('OAuth callback successful, user authenticated');

                // If this is a new user, create default organization
                if (callbackResult.needsOrganizationSetup && callbackResult.user) {
                  console.log('Creating default organization for new Google user...');
                  const orgResult = await createDefaultOrganizationForGoogleUser(callbackResult.user);

                  if (orgResult.success) {
                    console.log('Default organization created successfully');
                  } else {
                    console.error('Failed to create default organization:', orgResult.error);
                  }
                }

                // The user is now authenticated, the app will automatically navigate
              } else {
                console.error('OAuth callback failed:', callbackResult.error);
              }
            } catch (error) {
              console.error('Error handling OAuth callback:', error);
            }
          }
        };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle subsequent deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Also check once on cold start
    (async () => { 
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error('Error checking session on cold start:', error);
      }
    })();

    return () => {
      subscription?.remove();
    };
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
