import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { Shield, Info } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface SecurityContentProps {
  userEmail: string;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cardBg: string;
  inputBg: string;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
}

export function SecurityContent({
  userEmail,
  isDarkMode,
  textColor,
  mutedColor,
  borderColor,
  cardBg,
  inputBg,
  onShowNotification,
}: SecurityContentProps) {
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    checkAuthMethod();
  }, []);

  useEffect(() => {
    if (showDeleteDrawer) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDeleteDrawer, slideAnim, fadeAnim]);

  const checkAuthMethod = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const providers = user.app_metadata?.providers || [];
      const hasEmail = providers.includes('email') || user.app_metadata?.provider === 'email';
      const hasGoogle = providers.includes('google') || user.app_metadata?.provider === 'google';
      
      const isGoogleOnly = hasGoogle && !hasEmail;
      setIsGoogleUser(isGoogleOnly);
    } catch (error) {
      console.error('Error checking auth method:', error);
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    // Clear previous errors
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // Validate required fields
    let hasErrors = false;
    if (!passwordForm.currentPassword) {
      setPasswordErrors(prev => ({ ...prev, currentPassword: 'Current password is required' }));
      hasErrors = true;
    }
    if (!passwordForm.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'New password is required' }));
      hasErrors = true;
    }
    if (!passwordForm.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your new password' }));
      hasErrors = true;
    }
    if (hasErrors) return;

    // Validate password match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }

    // Validate password length
    if (passwordForm.newPassword.length < 6) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Password must be at least 6 characters' }));
      return;
    }

    setSaving(true);
    
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setPasswordErrors(prev => ({ ...prev, currentPassword: 'Current password is incorrect' }));
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        if (error.message.includes('auth')) {
          setPasswordErrors(prev => ({ ...prev, currentPassword: 'Authentication failed. Please try again.' }));
        } else if (error.message.includes('password')) {
          setPasswordErrors(prev => ({ ...prev, newPassword: error.message }));
        } else {
          throw error;
        }
        return;
      }

      onShowNotification('Password updated successfully!', 'success');
      
      // Clear the form and errors
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      onShowNotification('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteDrawer(true);
  };

  const handleDeleteAccount = async () => {
    // Validate inputs
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('You must type "DELETE" to confirm');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: deletePassword
      });

      if (signInError) {
        setDeleteError('Incorrect password. Please try again.');
        setDeleting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDeleteError('You must be signed in to delete your account');
        setDeleting(false);
        return;
      }

      // Delete agent record
      const { error: agentError } = await supabase
        .from('agents')
        .delete()
        .eq('user_id', user.id);

      if (agentError) {
        console.error('Error deleting agent:', agentError);
        setDeleteError('Failed to delete account data. Please contact support.');
        setDeleting(false);
        return;
      }

      // Sign out
      await supabase.auth.signOut();

      setShowDeleteDrawer(false);
      onShowNotification('Account deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'An unexpected error occurred');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: cardBg }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Security Settings</Text>
      </View>

      {/* Change Password Card */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Change Password</Text>
          <Text style={[styles.cardDescription, { color: mutedColor }]}>
            Update your account password to keep your account secure.
          </Text>
        </View>

        {isGoogleUser ? (
          <View style={[styles.googleBanner, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)' }]}>
            <Info size={20} color="#3b82f6" />
            <View style={styles.googleBannerText}>
              <Text style={[styles.googleBannerTitle, { color: isDarkMode ? '#60a5fa' : '#2563eb' }]}>
                Google Authentication
              </Text>
              <Text style={[styles.googleBannerDescription, { color: isDarkMode ? '#93c5fd' : '#3b82f6' }]}>
                You are logging in using Google authentication. You cannot change your password because your account is managed by Google.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            {/* Current Password */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Current Password</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor, color: textColor },
                  passwordErrors.currentPassword && styles.inputError
                ]}
                placeholder="Enter current password"
                placeholderTextColor={mutedColor}
                secureTextEntry
                value={passwordForm.currentPassword}
                onChangeText={(text) => {
                  setPasswordForm(prev => ({ ...prev, currentPassword: text }));
                  setPasswordErrors(prev => ({ ...prev, currentPassword: '' }));
                }}
              />
              {passwordErrors.currentPassword ? (
                <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
              ) : null}
            </View>

            {/* New Password */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor, color: textColor },
                  passwordErrors.newPassword && styles.inputError
                ]}
                placeholder="Enter new password"
                placeholderTextColor={mutedColor}
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(text) => {
                  setPasswordForm(prev => ({ ...prev, newPassword: text }));
                  setPasswordErrors(prev => ({ ...prev, newPassword: '' }));
                }}
              />
              {passwordErrors.newPassword ? (
                <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Confirm New Password</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBg, borderColor, color: textColor },
                  passwordErrors.confirmPassword && styles.inputError
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={mutedColor}
                secureTextEntry
                value={passwordForm.confirmPassword}
                onChangeText={(text) => {
                  setPasswordForm(prev => ({ ...prev, confirmPassword: text }));
                  setPasswordErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
              />
              {passwordErrors.confirmPassword ? (
                <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={[styles.updateButton, saving && styles.updateButtonDisabled]}
              onPress={changePassword}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Shield size={16} color="#ffffff" />
                  <Text style={styles.updateButtonText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account Security Card */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Account Security</Text>
        </View>

        {/* Two-Factor Authentication */}
        <View style={styles.securityItem}>
          <View style={styles.securityItemText}>
            <Text style={[styles.securityItemTitle, { color: textColor }]}>Two-Factor Authentication</Text>
            <Text style={[styles.securityItemDescription, { color: mutedColor }]}>
              Add an extra layer of security to your account
            </Text>
          </View>
          <TouchableOpacity style={[styles.securityButton, { borderColor }]} disabled>
            <Text style={[styles.securityButtonText, { color: mutedColor }]}>Enable 2FA</Text>
          </TouchableOpacity>
          <Text style={[styles.comingSoonText, { color: mutedColor }]}>Coming soon</Text>
        </View>

        {/* Login Sessions */}
        <View style={styles.securityItem}>
          <View style={styles.securityItemText}>
            <Text style={[styles.securityItemTitle, { color: textColor }]}>Login Sessions</Text>
            <Text style={[styles.securityItemDescription, { color: mutedColor }]}>
              Manage your active login sessions
            </Text>
          </View>
          <TouchableOpacity style={[styles.securityButton, { borderColor }]} disabled>
            <Text style={[styles.securityButtonText, { color: mutedColor }]}>View Sessions</Text>
          </TouchableOpacity>
          <Text style={[styles.comingSoonText, { color: mutedColor }]}>Coming soon</Text>
        </View>

        {/* Account Deletion */}
        <View style={styles.securityItem}>
          <View style={styles.securityItemText}>
            <Text style={[styles.securityItemTitle, { color: textColor }]}>Account Deletion</Text>
            <Text style={[styles.securityItemDescription, { color: mutedColor }]}>
              Permanently delete your account and data
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccountClick}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Account Drawer */}
      <Modal
        visible={showDeleteDrawer}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowDeleteDrawer(false);
          setDeletePassword('');
          setDeleteConfirmation('');
          setDeleteError('');
        }}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable
            style={styles.overlayPressable}
            onPress={() => {
              setShowDeleteDrawer(false);
              setDeletePassword('');
              setDeleteConfirmation('');
              setDeleteError('');
            }}
          />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor: cardBg, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <View>
                <Text style={[styles.drawerTitle, { color: textColor }]}>Delete Account</Text>
                <Text style={[styles.drawerDescription, { color: mutedColor }]}>
                  Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.
                </Text>
              </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
              {/* Password Input */}
              <View style={styles.drawerFormGroup}>
                <Text style={[styles.drawerLabel, { color: textColor }]}>Enter your password</Text>
                <TextInput
                  style={[styles.drawerInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  placeholder="Enter your password to confirm"
                  placeholderTextColor={mutedColor}
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                />
              </View>

              {/* DELETE Confirmation */}
              <View style={[styles.deleteConfirmBox, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
                <Text style={[styles.deleteConfirmText, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
                  Type <Text style={styles.deleteConfirmHighlight}>DELETE</Text> to confirm
                </Text>
                <TextInput
                  style={[
                    styles.deleteConfirmInput,
                    {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(239, 68, 68, 0.3)',
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                    }
                  ]}
                  placeholder="Type DELETE to confirm"
                  placeholderTextColor={isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)'}
                  value={deleteConfirmation}
                  onChangeText={setDeleteConfirmation}
                  autoCapitalize="characters"
                />
              </View>

              {/* Error Message */}
              {deleteError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{deleteError}</Text>
                </View>
              ) : null}

              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.drawerFooter, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={[styles.drawerCancelButton, { borderColor }]}
                onPress={() => {
                  setShowDeleteDrawer(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
              >
                <Text style={[styles.drawerCancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.drawerDeleteButton,
                  (deleteConfirmation !== 'DELETE' || deleting) && styles.drawerDeleteButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.drawerDeleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  googleBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  googleBannerText: {
    flex: 1,
  },
  googleBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  googleBannerDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  formContainer: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityItem: {
    marginBottom: 24,
  },
  securityItemText: {
    marginBottom: 12,
  },
  securityItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityItemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  securityButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  securityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 12,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    flex: 1,
  },
  drawerContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  drawerDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  drawerFormGroup: {
    marginBottom: 16,
  },
  drawerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  drawerInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  deleteConfirmBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: 0,
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  deleteConfirmHighlight: {
    fontFamily: 'monospace',
    color: '#ef4444',
  },
  deleteConfirmInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  errorBox: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 14,
    color: '#ef4444',
  },
  drawerFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  drawerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  drawerCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawerDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  drawerDeleteButtonDisabled: {
    opacity: 0.5,
  },
  drawerDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

