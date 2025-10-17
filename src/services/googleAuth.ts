import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  user?: any;
  url?: string;
}

export const initializeGoogleAuth = async (): Promise<void> => {
  // No initialization needed for Supabase OAuth
  console.log('Google Auth initialized for Supabase OAuth');
};

export const signInWithGoogle = async (): Promise<GoogleAuthResult> => {
  try {
    // For WebView, we need to use a URL that the WebView can handle
    // We'll use a custom scheme that the WebView can intercept
    const redirectTo = 'linquo://auth/callback';
    console.log('Using redirectTo URL for WebView:', redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Skip browser redirect since we'll handle it in WebView
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.url) {
      console.log('OAuth URL generated for WebView:', data.url);
      return { success: true, url: data.url };
    }

    return { success: false, error: 'No OAuth URL received' };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
};

export const signOutFromGoogle = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Google Sign Out Error:', error);
  }
};

export const isSignedInWithGoogle = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  } catch (error) {
    console.error('Check Google Sign-In Status Error:', error);
    return false;
  }
};

export const checkForOAuthSession = async (): Promise<GoogleAuthResult> => {
  try {
    // Wait a moment for any OAuth processing to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if there's a valid session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    if (session && session.user) {
      console.log('OAuth session found:', session.user.email);
      return { success: true, user: session.user };
    }
    
    return { success: false, error: 'No active session found' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Error checking session' };
  }
};
