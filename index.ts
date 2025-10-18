import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';

import App from './App';

// Register background message handler for when app is completely closed
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📱 FCM background message received (app closed):', remoteMessage);
  
  // When app is completely closed, FCM should handle the notification automatically
  // We just need to log it for debugging
  console.log('🔔 FCM will show notification automatically when app is closed');
  
  // Return a promise to keep the handler alive
  return Promise.resolve();
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
