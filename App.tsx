import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/components/SplashScreen';
import { supabase } from './src/lib/supabase';
import { handleGoogleAuthCallback, createDefaultOrganizationForGoogleUser } from './src/services/googleAuthHandler';
import NotificationService from './src/services/notificationService';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize notification service
      const notificationService = NotificationService.getInstance();
      await notificationService.initialize();

      // Show custom splash for 2 seconds
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000);

      return () => clearTimeout(timer);
    };

    initializeApp();
  }, []);

  // Listen for auth state changes and register device token when user logs in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, registering device token...');
        // Wait a moment to ensure auth is fully propagated
        setTimeout(async () => {
          const notificationService = NotificationService.getInstance();
          await notificationService.registerDeviceToken();
        }, 1000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  // Setup push notification listeners
  useEffect(() => {
    const notificationService = NotificationService.getInstance();

    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      notificationService.handleIncomingNotification(notification);
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      // Extract conversation_id from notification data if available
      const data = response.notification.request.content.data;
      if (data && data.conversation_id) {
        console.log('🔗 Navigating to conversation:', data.conversation_id);
        // TODO: Navigate to specific conversation
        // This would require navigation context or state management
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Handle app state changes to re-register device tokens
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground, re-register device token
        console.log('🔄 App became active, re-registering device token...');
        const notificationService = NotificationService.getInstance();
        notificationService.registerDeviceToken();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

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
