import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { handleGoogleAuthCallback, createDefaultOrganizationForGoogleUser } from '../../services/googleAuthHandler';

// URL polyfill for React Native
import 'react-native-url-polyfill/auto';

interface GoogleSignInWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const { width, height } = Dimensions.get('window');

export const GoogleSignInWebView: React.FC<GoogleSignInWebViewProps> = ({
  visible,
  onClose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const webViewRef = useRef<WebView>(null);

  // Custom user agent to bypass Google's WebView blocking
  const customUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'linquo://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true, // We'll handle the URL manually
        },
      });

      if (error) {
        onError(error.message);
        return;
      }

      if (data.url) {
        setCurrentUrl(data.url);
      } else {
        onError('No OAuth URL received');
      }
    } catch (error: any) {
      onError(error.message || 'Failed to initiate Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    console.log('WebView navigation to:', url);

    // Check if this is our callback URL
    if (url.includes('linquo://auth/callback') || url.includes('auth/callback')) {
      try {
        console.log('Callback URL detected, processing OAuth session...');
        
        // Close the WebView modal first
        onClose();
        
        // Parse the URL to extract OAuth parameters
        let urlObj;
        try {
          urlObj = new URL(url);
        } catch (urlError) {
          console.error('Failed to parse callback URL:', urlError);
          onError('Invalid callback URL received');
          return;
        }
        
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        
        if (error) {
          console.error('OAuth error in URL:', error);
          onError(`Authentication failed: ${error}`);
          return;
        }
        
        if (!code) {
          console.error('No authorization code found in callback URL');
          onError('Authentication failed: No authorization code received');
          return;
        }
        
        console.log('Authorization code found, exchanging for session...');
        
        // Exchange the authorization code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          onError(`Authentication failed: ${exchangeError.message}`);
          return;
        }
        
        if (!data.session) {
          console.error('No session returned from code exchange');
          onError('Authentication failed: No session created');
          return;
        }
        
        console.log('Session established successfully via code exchange');
        
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
              onError(orgResult.error || 'Failed to create organization');
              return;
            }
          }
          
          onSuccess();
        } else {
          onError(callbackResult.error || 'Authentication failed');
        }
      } catch (error: any) {
        console.error('Error in navigation state change:', error);
        onError(error.message || 'Error processing authentication');
      }
    }
  };

  const handleClose = () => {
    setCurrentUrl('');
    onClose();
  };

  React.useEffect(() => {
    if (visible) {
      handleGoogleSignIn();
    } else {
      setCurrentUrl('');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sign in with Google</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading Google Sign-In...</Text>
          </View>
        ) : currentUrl ? (
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={styles.webview}
            userAgent={customUserAgent}
            onNavigationStateChange={handleNavigationStateChange}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              onError('Failed to load Google Sign-In page');
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
            }}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}
            // Additional props to help bypass restrictions
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            // Custom headers to make it look like a real browser
            onShouldStartLoadWithRequest={(request) => {
              console.log('Should start load with request:', request.url);
              return true;
            }}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load Google Sign-In</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleGoogleSignIn}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  placeholder: {
    width: 32,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
