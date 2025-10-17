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

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const validateField = (field: string, value: string) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters long';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'Please enter a valid email address';
          }
        }
        break;

      case 'password':
        if (!value) {
          error = 'Password is required';
        } else {
          const passwordErrors = [];
          if (value.length < 8) passwordErrors.push('8+ characters');
          if (!/[A-Z]/.test(value)) passwordErrors.push('uppercase letter');
          if (!/[a-z]/.test(value)) passwordErrors.push('lowercase letter');
          if (!/\d/.test(value)) passwordErrors.push('number');
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) passwordErrors.push('special character');
          
          if (passwordErrors.length > 0) {
            error = `Password must include: ${passwordErrors.join(', ')}`;
          }
        }
        break;

      case 'organizationName':
        if (!value.trim()) {
          error = 'Organization name is required';
        } else if (value.trim().length < 2) {
          error = 'Organization name must be at least 2 characters long';
        }
        break;

      case 'organizationSlug':
        if (!value.trim()) {
          error = 'Organization URL is required';
        } else if (value.length < 3) {
          error = 'Organization URL must be at least 3 characters long';
        } else if (!/^[a-z0-9-]+$/.test(value)) {
          error = 'Organization URL can only contain lowercase letters, numbers, and hyphens';
        }
        break;
    }

    return error;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    
    // Auto-generate organization slug from name
    if (field === 'organizationName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
      setFormData(prev => ({ ...prev, organizationSlug: slug }));
      
      const slugError = validateField('organizationSlug', slug);
      setFieldErrors(prev => ({ ...prev, organizationSlug: slugError }));
    }
    
    if (field === 'organizationSlug') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({ ...prev, organizationSlug: slug }));
      
      const slugError = validateField('organizationSlug', slug);
      setFieldErrors(prev => ({ ...prev, organizationSlug: slugError }));
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError('');

    // Validate all fields
    const newFieldErrors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      organizationName: validateField('organizationName', formData.organizationName),
      organizationSlug: validateField('organizationSlug', formData.organizationSlug),
    };

    setFieldErrors(newFieldErrors);

    const hasErrors = Object.values(newFieldErrors).some(error => error !== '');

    if (hasErrors) {
      setError('Please fix the errors below before continuing.');
      setLoading(false);
      return;
    }

    let createdUserId: string | null = null;
    let createdOrgId: string | null = null;
    let createdAgentId: string | null = null;

    try {
      // STEP 1: Check for duplicate organization slug
      const slugToCheck = formData.organizationSlug.toLowerCase().trim();
      
      const { data: existingOrg, error: slugCheckError } = await supabase
        .from('organizations')
        .select('id, slug')
        .eq('slug', slugToCheck)
        .maybeSingle();

      if (slugCheckError) {
        throw new Error('Failed to validate organization URL. Please try again.');
      }

      if (existingOrg) {
        setFieldErrors(prev => ({ ...prev, organizationSlug: `Organization URL "${slugToCheck}" is already taken.` }));
        setError('Please fix the errors below.');
        setLoading(false);
        return;
      }

      // STEP 2: Check for existing email
      const emailToCheck = formData.email.toLowerCase().trim();
      
      const { data: existingAgent, error: emailCheckError } = await supabase
        .from('agents')
        .select('id, email')
        .eq('email', emailToCheck)
        .maybeSingle();

      if (emailCheckError && emailCheckError.code !== 'PGRST116') {
        throw new Error('Failed to validate email address. Please try again.');
      }

      if (existingAgent) {
        setFieldErrors(prev => ({ ...prev, email: `An account with email "${emailToCheck}" already exists.` }));
        setError('Please fix the errors below.');
        setLoading(false);
        return;
      }

      // STEP 3: Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailToCheck,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim(),
            display_name: formData.name.trim(),
          }
        }
      });

      if (authError) {
        let errorMessage = 'Failed to create account';
        if (authError.message.includes('User already registered')) {
          errorMessage = `An account with email "${emailToCheck}" already exists. Please try logging in instead.`;
        } else if (authError.message.includes('Password should be')) {
          errorMessage = `Password is too weak. ${authError.message}`;
        } else if (authError.message.includes('Invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else {
          errorMessage = `Account creation failed: ${authError.message}`;
        }
        throw new Error(errorMessage);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account - no user data');
      }

      createdUserId = authData.user.id;

      // STEP 4: Create Organization
      const organizationData = {
        name: formData.organizationName.trim(),
        slug: formData.organizationSlug.toLowerCase().trim(),
        brand_color: '#3B82F6',
        widget_text_line1: 'Hello there',
        widget_text_line2: 'How can we help?',
        widget_icon_alignment: 'right',
        widget_show_branding: true,
        widget_open_on_load: false,
        chat_header_name: 'Support Team',
        chat_header_subtitle: 'Typically replies within 1 min',
        widget_button_text: 'Start Chat'
      };

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert(organizationData)
        .select('*')
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      if (!orgData) {
        throw new Error('Failed to create organization - no data returned');
      }

      createdOrgId = orgData.id;

      // STEP 5: Create Agent Record
      const agentData = {
        user_id: createdUserId,
        display_name: formData.name.trim(),
        email: emailToCheck,
        online_status: 'OFFLINE',
        org_id: createdOrgId,
        role: 'OWNER'
      };

      const { data: agentRecord, error: agentError } = await supabase
        .from('agents')
        .insert(agentData)
        .select('*')
        .single();

      if (agentError) {
        throw new Error(`Failed to create agent: ${agentError.message}`);
      }

      if (!agentRecord) {
        throw new Error('Failed to create agent - no data returned');
      }

      createdAgentId = agentRecord.id;

      // STEP 6: Create Role (non-critical)
      try {
        const roleData = {
          org_id: createdOrgId,
          role_key: 'OWNER',
          permissions: {
            'agents:read': true, 'agents:write': true, 'agents:delete': true,
            'customers:read': true, 'customers:write': true, 'customers:delete': true,
            'conversations:read': true, 'conversations:write': true, 'conversations:delete': true,
            'messages:read': true, 'messages:write': true, 'messages:delete': true,
            'settings:read': true, 'settings:write': true
          }
        };

        const { data: roleRecord, error: roleError } = await supabase
          .from('roles')
          .insert(roleData)
          .select('*')
          .single();

        if (!roleError && roleRecord) {
          // Create Role Assignment
          const assignmentData = {
            org_id: createdOrgId,
            agent_id: createdAgentId,
            role_id: roleRecord.id,
          };

          await supabase
            .from('agent_role_assignments')
            .insert(assignmentData);
        }
      } catch (roleError) {
        console.warn('Role creation failed (non-critical):', roleError);
      }

      // Success! Navigation will be handled automatically by auth state change
      
    } catch (error: any) {
      console.error('Signup failed:', error);
      
      // Cleanup any created records
      try {
        if (createdAgentId && createdOrgId) {
          await supabase.from('agents').delete().eq('id', createdAgentId);
        }
        
        if (createdOrgId) {
          await supabase.from('organizations').delete().eq('id', createdOrgId);
        }
        
        if (createdUserId) {
          // Note: Can't delete auth user from client side, would need admin API
          console.warn('Auth user created but signup failed. User ID:', createdUserId);
        }
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      
      setError(error.message || 'An error occurred during signup');
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
        <View style={[styles.card, { backgroundColor: cardBg, paddingTop: insets.top + 100 }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: textColor }]}>Create Your Account</Text>
            <Text style={[styles.subtitle, { color: mutedText }]}>Set up your organization and start using Linquo</Text>
          </View>

          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Your Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }, fieldErrors.name && styles.inputError]}
                placeholder="John Doe"
                placeholderTextColor={mutedText}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                editable={!loading}
              />
              {fieldErrors.name ? (
                <Text style={styles.errorText}>{fieldErrors.name}</Text>
              ) : null}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }, fieldErrors.email && styles.inputError]}
                placeholder="john@company.com"
                placeholderTextColor={mutedText}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              {fieldErrors.email ? (
                <Text style={styles.errorText}>{fieldErrors.email}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Password</Text>
              <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor: inputBorder }, fieldErrors.password && styles.inputError]}>
                <TextInput
                  style={[styles.passwordInput, { color: textColor }]}
                  placeholder="Create a strong password"
                  placeholderTextColor={mutedText}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
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
              {fieldErrors.password ? (
                <Text style={styles.errorText}>{fieldErrors.password}</Text>
              ) : null}
            </View>

            {/* Organization Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Organization Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }, fieldErrors.organizationName && styles.inputError]}
                placeholder="Flexpoint LLC"
                placeholderTextColor={mutedText}
                value={formData.organizationName}
                onChangeText={(value) => handleInputChange('organizationName', value)}
                editable={!loading}
              />
              {fieldErrors.organizationName ? (
                <Text style={styles.errorText}>{fieldErrors.organizationName}</Text>
              ) : null}
            </View>

            {/* Organization Slug Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Organization URL</Text>
              <View style={styles.slugContainer}>
                <Text style={[styles.slugPrefix, { color: mutedText }]}>linquo.com/</Text>
                <TextInput
                  style={[styles.slugInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }, fieldErrors.organizationSlug && styles.inputError]}
                  placeholder="flexpoint-llc"
                  placeholderTextColor={mutedText}
                  value={formData.organizationSlug}
                  onChangeText={(value) => handleInputChange('organizationSlug', value)}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {fieldErrors.organizationSlug ? (
                <Text style={styles.errorText}>{fieldErrors.organizationSlug}</Text>
              ) : (
                <Text style={[styles.helperText, { color: mutedText }]}>This will be your organization's unique URL</Text>
              )}
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: isDarkMode ? '#ffffff' : '#0f172a' }, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={isDarkMode ? '#0f172a' : '#ffffff'} /> // Activity indicator color
              ) : (
                <Text style={[styles.buttonText, { color: isDarkMode ? '#0f172a' : '#ffffff' }]}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
              <Text style={[styles.dividerText, { color: mutedText }]}>Or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
            </View>

            {/* Google Sign Up Button */}
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
                  Already have an account?{' '}
                  <Text 
                    style={styles.footerLink}
                    onPress={() => navigation.goBack()}
                  >
                    Sign in
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
    minHeight: '100%',
    paddingVertical: 24,
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
  inputError: {
    borderColor: '#ef4444',
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
  slugContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slugPrefix: {
    fontSize: 14,
  },
  slugInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
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

