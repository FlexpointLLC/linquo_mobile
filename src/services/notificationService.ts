import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import messaging from '@react-native-firebase/messaging';

class NotificationService {
  private static instance: NotificationService;
  private lastUnreadCount: number = 0;
  private isInitialized: boolean = false;
  private deviceToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load last unread count from storage
    this.loadLastUnreadCount();
    
    // Configure notifications
    await this.configureNotifications();
    
    // Register device token with Supabase
    await this.registerDeviceToken();
    
    // Don't show static notification on app start - only show when there are unread messages
    console.log('Notification service initialized - will only show notifications for unread messages');
    
    this.isInitialized = true;
  }

  private async loadLastUnreadCount(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('lastUnreadCount');
      this.lastUnreadCount = stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error loading last unread count:', error);
      this.lastUnreadCount = 0;
    }
  }

  private async saveLastUnreadCount(count: number): Promise<void> {
    try {
      await AsyncStorage.setItem('lastUnreadCount', count.toString());
      this.lastUnreadCount = count;
    } catch (error) {
      console.error('Error saving last unread count:', error);
    }
  }

  public checkForNewMessages(currentUnreadCount: number): void {
    // Disabled - we now use FCM push notifications instead of local notifications
    // Just update the stored count for tracking
    this.saveLastUnreadCount(currentUnreadCount);
  }

  private async showNewMessageNotification(newMessagesCount: number): Promise<void> {
    const title = newMessagesCount === 1 ? 'New Message' : `${newMessagesCount} New Messages`;
    const body = newMessagesCount === 1 
      ? 'You have a new unread message' 
      : `You have ${newMessagesCount} new unread messages`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
        },
        trigger: null, // Show immediately
      });
      console.log(`🔔 Notification sent: ${title} - ${body}`);
    } catch (error) {
      console.error('Error showing dynamic notification:', error);
    }
  }

  public resetUnreadCount(): void {
    this.saveLastUnreadCount(0);
  }

  public getLastUnreadCount(): number {
    return this.lastUnreadCount;
  }

  public getDeviceToken(): string | null {
    return this.deviceToken;
  }

  // Method to handle incoming push notifications from Supabase
  public async handleIncomingNotification(notification: any): Promise<void> {
    try {
      console.log('Received push notification:', notification);
      
      // The notification will be handled by expo-notifications automatically
      // This method can be used for additional processing if needed
      
    } catch (error) {
      console.error('Error handling incoming notification:', error);
    }
  }

  private async configureNotifications(): Promise<void> {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('Notification permission status:', status);
      
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      console.log('Notification handler configured successfully');
    } catch (error) {
      console.error('Error configuring notifications:', error);
    }
  }

  public async registerDeviceToken(): Promise<void> {
    try {
      // Get FCM token
      let token: string;
      try {
        token = await messaging().getToken();
      } catch (firebaseError) {
        console.warn('Firebase not initialized, skipping device token registration:', firebaseError);
        return;
      }
      
      this.deviceToken = token;
      console.log('FCM token obtained:', this.deviceToken);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping device token registration');
        return;
      }

      // Get agent ID for current user
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (agentError || !agent) {
        console.log('No agent found for user, skipping device token registration');
        return;
      }

      // Register device token in Supabase
      const { error: insertError } = await supabase
        .from('agent_device_tokens')
        .upsert({
          agent_id: agent.id,
          device_token: this.deviceToken,
          platform: Platform.OS,
          app_version: '1.0.0',
          is_active: true,
        }, {
          onConflict: 'agent_id,device_token'
        });

      if (insertError) {
        console.error('Error registering device token:', insertError);
      } else {
        console.log('Device token registered successfully with Supabase');
      }

      // Also register for background notifications
      await this.setupBackgroundNotifications();
      
      // Setup FCM message handlers
      await this.setupFCMHandlers();

    } catch (error) {
      console.error('Error getting device token:', error);
    }
  }

  private async setupFCMHandlers(): Promise<void> {
    try {
      // Check if Firebase is available
      try {
        await messaging().getToken();
      } catch (firebaseError) {
        console.warn('Firebase not initialized, skipping FCM handlers:', firebaseError);
        return;
      }

      // Handle background messages - this is crucial for when app is cleared from recent apps
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('📱 FCM background message received (app cleared):', remoteMessage);
        
        // Show notification even when app is completely closed
        if (remoteMessage.notification) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: remoteMessage.notification.title || 'New Message',
              body: remoteMessage.notification.body || 'You have a new message',
              data: remoteMessage.data,
            },
            trigger: null,
          });
          console.log('🔔 Background notification scheduled');
        }
      });

      // Handle foreground messages
      const unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log('📱 FCM foreground message received:', remoteMessage);
        
        // Show local notification when app is in foreground
        if (remoteMessage.notification) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: remoteMessage.notification.title || 'New Message',
              body: remoteMessage.notification.body || 'You have a new message',
              data: remoteMessage.data,
            },
            trigger: null,
          });
        }
      });

      // Handle notification taps
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('👆 FCM notification tapped:', remoteMessage);
        this.handleIncomingNotification(remoteMessage);
      });

      // Check if app was opened from a notification
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log('🚀 App opened from notification:', remoteMessage);
            this.handleIncomingNotification(remoteMessage);
          }
        });

      console.log('FCM handlers set up successfully');
      
    } catch (error) {
      console.error('Error setting up FCM handlers:', error);
    }
  }

  private async setupBackgroundNotifications(): Promise<void> {
    try {
      // Set up background notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('📱 Background notification received:', notification);
          
          // Handle the notification data
          if (notification.request.content.data) {
            console.log('📊 Notification data:', notification.request.content.data);
          }
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          };
        },
      });

      // Listen for background notifications
      const backgroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('🔔 Background notification received:', notification);
        this.handleIncomingNotification(notification);
      });

      console.log('Background notification handler set up successfully');
      
    } catch (error) {
      console.error('Error setting up background notifications:', error);
    }
  }

}

export default NotificationService;