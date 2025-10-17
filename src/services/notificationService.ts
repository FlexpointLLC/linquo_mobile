import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
}

/**
 * Register for push notifications and get the Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Project ID not found');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push notification token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Save push notification token to Supabase push_notifications table
 */
export async function savePushTokenToDatabase(
  userId: string, 
  token: string, 
  deviceType: 'ios' | 'android' = Platform.OS as 'ios' | 'android'
): Promise<boolean> {
  try {
    // Get agent ID and org_id from user ID
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('id, org_id')
      .eq('user_id', userId)
      .single();

    if (agentError || !agentData) {
      console.error('Error fetching agent:', agentError);
      return false;
    }

    // Check if token already exists
    const { data: existingToken, error: checkError } = await supabase
      .from('push_notifications')
      .select('id')
      .eq('push_token', token)
      .single();

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('push_notifications')
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('Error updating push token:', updateError);
        return false;
      }

      console.log('Push token updated successfully');
      return true;
    }

    // Insert new token
    const { error: insertError } = await supabase
      .from('push_notifications')
      .insert({
        agent_id: agentData.id,
        user_id: userId,
        org_id: agentData.org_id,
        push_token: token,
        device_type: deviceType,
        device_name: Device.deviceName || `${Platform.OS} Device`,
        is_active: true,
        last_used_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting push token:', insertError);
      return false;
    }

    console.log('Push token saved successfully');
    return true;
  } catch (error) {
    console.error('Error in savePushTokenToDatabase:', error);
    return false;
  }
}

/**
 * Setup push notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    onNotificationReceived?.(notification);
  });

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    onNotificationTapped?.(response);
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Send a local notification (for testing)
 */
export async function sendLocalNotification(title: string, body: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

