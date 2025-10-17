import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

// Sun and Moon SVG icons as text (simplified)
const SunIcon = () => <Text style={styles.iconText}>☀️</Text>;
const MoonIcon = () => <Text style={styles.iconText}>🌙</Text>;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      // Navigation will be handled automatically by auth state change
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Unified background color matching branding
  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const cardBg = isDarkMode ? '#0f172a' : '#ffffff'; // Same as background for unified look
  const inputBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBorder = isDarkMode ? '#334155' : '#e2e8f0';
  const mutedText = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Logo and Theme Toggle */}
          <View style={[styles.topBar, { top: insets.top + 16 }]}>
            <Image
              source={require('../../../assets/Logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={[styles.themeToggle, { borderColor: inputBorder, backgroundColor: inputBg }]}
              onPress={toggleTheme}
            >
              {isDarkMode ? <MoonIcon /> : <SunIcon />}
            </TouchableOpacity>
          </View>

        {/* Card Content */}
        <View style={[styles.card, { backgroundColor: cardBg, paddingTop: insets.top - 84 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: textColor }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>Sign in to your Linquo account</Text>
          </View>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="john@company.com"
                placeholderTextColor={mutedText}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: textColor }]}>Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  style={[styles.passwordInput, { color: textColor }]}
                  placeholder="Enter your password"
                  placeholderTextColor={mutedText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: isDarkMode ? '#ffffff' : '#0f172a' }, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={isDarkMode ? '#0f172a' : '#ffffff'} /> // Activity indicator color
              ) : (
                <Text style={[styles.buttonText, { color: isDarkMode ? '#0f172a' : '#ffffff' }]}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
              <Text style={[styles.dividerText, { color: mutedText }]}>Or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[styles.googleButton, { borderColor: inputBorder, backgroundColor: cardBg }]}
              disabled={loading}
            >
              <Text style={[styles.googleButtonText, { color: textColor }]}>🔍 Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: mutedText }]}>
              Don't have an account?{' '}
              <Text 
                style={styles.footerLink}
                onPress={() => navigation.navigate('Signup' as never)}
              >
                Create one
              </Text>
            </Text>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cardHeader: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    height: 40,
  },
  passwordInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  eyeButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  button: {
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  googleButton: {
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    color: '#6366f1',
    fontWeight: '500',
  },
});

