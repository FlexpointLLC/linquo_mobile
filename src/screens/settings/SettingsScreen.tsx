import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { User, Building2, ArrowLeft, Palette, CreditCard, Bell, Shield, Upload, X } from 'lucide-react-native';
import { StatusBarNotification } from '../../components/common/StatusBarNotification';
import { WidgetSettingsContent } from '../../components/settings/WidgetSettingsContent';
import { BillingContent } from '../../components/settings/BillingContent';
import { AvatarSelector } from '../../components/settings/AvatarSelector';
import { SecurityContent } from '../../components/settings/SecurityContent';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

interface PersonalInfo {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  online_status: string;
  org_id: string;
  role: string;
  avatar_url?: string | null;
}

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url?: string | null;
  widget_show_logo_agents?: boolean;
  widget_text_line1?: string;
  widget_text_line2?: string;
  widget_button_text?: string;
  widget_icon_alignment?: string;
  widget_show_branding?: boolean;
  widget_dark_mode?: boolean;
  chat_header_name?: string;
  chat_header_subtitle?: string;
  welcome_message?: string;
  show_welcome_popup?: boolean;
  auto_reply_enabled?: boolean;
  auto_reply?: string;
  plan?: string;
}

interface SettingsScreenProps {
  onBack?: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'widget' | 'billing' | 'notifications'>('general');
  const [widgetSubTab, setWidgetSubTab] = useState<'main-screen' | 'conversation'>('main-screen');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [isSavingWidget, setIsSavingWidget] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [conversationCount, setConversationCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? 'rgba(51, 65, 85, 0.1)' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#0f172a' : '#f8fafc';

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#f43f5e', '#22c55e', '#eab308',
  ];

  const showSuccessNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationType('success');
    setShowNotification(true);
  };

  const showErrorNotification = (message: string) => {
    setNotificationMessage(message);
    setNotificationType('error');
    setShowNotification(true);
  };

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch personal info
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id, user_id, display_name, email, online_status, org_id, role, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (agentError) throw agentError;
      if (!agentData) throw new Error('Agent not found');

      setPersonalInfo(agentData);

      // Fetch organization info
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id, name, slug, brand_color, logo_url,
          widget_show_logo_agents, widget_text_line1, widget_text_line2,
          widget_button_text, widget_icon_alignment, widget_show_branding,
          widget_dark_mode, chat_header_name, chat_header_subtitle,
          welcome_message, show_welcome_popup, auto_reply_enabled, auto_reply, plan
        `)
        .eq('id', agentData.org_id)
        .single();

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Organization not found');

      setOrganizationInfo(orgData);

      // Fetch conversation count
      const { count, error: countError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', agentData.org_id);

      if (!countError && count !== null) {
        setConversationCount(count);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const savePersonalInfo = async () => {
    if (!personalInfo) return;

    setIsSavingPersonal(true);
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          display_name: personalInfo.display_name,
          online_status: personalInfo.online_status,
        })
        .eq('id', personalInfo.id);

      if (error) throw error;

      showSuccessNotification('Personal information updated!');
    } catch (error: any) {
      console.error('Error updating personal info:', error);
      showErrorNotification(error.message || 'Failed to update personal info');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const saveOrganizationInfo = async () => {
    if (!organizationInfo) return;

    setIsSavingOrg(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organizationInfo.name,
          slug: organizationInfo.slug,
          brand_color: organizationInfo.brand_color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationInfo.id);

      if (error) throw error;

      showSuccessNotification('Organization information updated!');
    } catch (error: any) {
      console.error('Error updating organization info:', error);
      showErrorNotification(error.message || 'Failed to update organization info');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const saveWidgetSettings = async () => {
    if (!organizationInfo) return;

    setIsSavingWidget(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          brand_color: organizationInfo.brand_color,
          widget_show_logo_agents: organizationInfo.widget_show_logo_agents,
          widget_text_line1: organizationInfo.widget_text_line1,
          widget_text_line2: organizationInfo.widget_text_line2,
          widget_button_text: organizationInfo.widget_button_text,
          widget_icon_alignment: organizationInfo.widget_icon_alignment,
          widget_show_branding: organizationInfo.widget_show_branding,
          widget_dark_mode: organizationInfo.widget_dark_mode,
          chat_header_name: organizationInfo.chat_header_name,
          chat_header_subtitle: organizationInfo.chat_header_subtitle,
          welcome_message: organizationInfo.welcome_message,
          show_welcome_popup: organizationInfo.show_welcome_popup,
          auto_reply_enabled: organizationInfo.auto_reply_enabled,
          auto_reply: organizationInfo.auto_reply,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationInfo.id);

      if (error) throw error;

      showSuccessNotification('Widget settings updated!');
    } catch (error: any) {
      console.error('Error updating widget settings:', error);
      showErrorNotification(error.message || 'Failed to update widget settings');
    } finally {
      setIsSavingWidget(false);
    }
  };

  const handleLogoUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a logo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      
      // Check file size (max 1MB)
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an image smaller than 1MB.');
        return;
      }

      setUploadingLogo(true);

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const fileExt = asset.uri.split('.').pop() || 'png';
      const fileName = `${organizationInfo?.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('brand')
        .upload(filePath, decode(base64), {
          contentType: asset.mimeType || 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('brand')
        .getPublicUrl(filePath);

      // Update organization with logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', organizationInfo?.id);

      if (updateError) throw updateError;

      setOrganizationInfo({ ...organizationInfo!, logo_url: urlData.publicUrl });
      showSuccessNotification('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      showErrorNotification(error.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!organizationInfo?.logo_url) return;

    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove your organization logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingLogo(true);

              const { error } = await supabase
                .from('organizations')
                .update({ logo_url: null })
                .eq('id', organizationInfo.id);

              if (error) throw error;

              setOrganizationInfo({ ...organizationInfo, logo_url: null });
              showSuccessNotification('Logo removed successfully!');
            } catch (error: any) {
              console.error('Error removing logo:', error);
              showErrorNotification(error.message || 'Failed to remove logo');
            } finally {
              setUploadingLogo(false);
            }
          },
        },
      ]
    );
  };


  // Helper function to decode base64
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  if (loading || !personalInfo || !organizationInfo) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Back Button */}
      {onBack && (
        <View style={styles.backButtonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={16} color={textColor} opacity={0.7} />
            <Text style={[styles.backButtonText, { color: textColor, opacity: 0.7 }]}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: mutedColor }]}>
          Manage your personal information and organization settings
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'general' && [styles.tabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setActiveTab('general')}
        >
          <User size={20} color={activeTab === 'general' ? textColor : mutedColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'widget' && [styles.tabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setActiveTab('widget')}
        >
          <Palette size={20} color={activeTab === 'widget' ? textColor : mutedColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'billing' && [styles.tabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setActiveTab('billing')}
        >
          <CreditCard size={20} color={activeTab === 'billing' ? textColor : mutedColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && [styles.tabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Shield size={20} color={activeTab === 'notifications' ? textColor : mutedColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
      >
        {/* General Tab */}
        {activeTab === 'general' && (
          <>
            {/* Header */}
            <View style={styles.tabHeader}>
              <Text style={[styles.tabHeaderTitle, { color: textColor }]}>General</Text>
            </View>

            {/* Brand Logo Card */}
            <View style={[styles.horizontalCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.horizontalCardContent}>
                <View style={styles.horizontalCardText}>
                  <Text style={[styles.horizontalCardTitle, { color: textColor }]}>Brand Logo</Text>
                  <Text style={[styles.horizontalCardDescription, { color: mutedColor }]}>
                    Upload your organization logo (max 1MB)
                  </Text>
                </View>
                <View style={styles.horizontalCardActions}>
                  {organizationInfo.logo_url ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: organizationInfo.logo_url }}
                        style={[styles.imagePreview, { borderColor }]}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={handleLogoRemove}
                        disabled={uploadingLogo}
                      >
                        <X size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.uploadButton, uploadingLogo && styles.uploadButtonDisabled]}
                    onPress={handleLogoUpload}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <ActivityIndicator size="small" color="#3b82f6" />
                    ) : (
                      <Upload size={20} color="#3b82f6" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* My Avatar Card */}
            <View style={[styles.horizontalCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.horizontalCardContent}>
                <View style={styles.horizontalCardText}>
                  <Text style={[styles.horizontalCardTitle, { color: textColor }]}>My Avatar</Text>
                  <Text style={[styles.horizontalCardDescription, { color: mutedColor }]}>
                    Choose an avatar from our collection
                  </Text>
                </View>
                <AvatarSelector
                  currentAvatarUrl={personalInfo.avatar_url || null}
                  agentId={personalInfo.id}
                  agentName={personalInfo.display_name}
                  onAvatarUpdate={(newAvatarUrl) => {
                    setPersonalInfo({ ...personalInfo, avatar_url: newAvatarUrl });
                  }}
                  isDarkMode={isDarkMode}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={borderColor}
                  cardBg={cardBg}
                />
              </View>
            </View>

            {/* Personal Information Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#e2e8f0' }]}>
            <View style={styles.cardTitleContainer}>
              <User size={20} color={textColor} />
              <Text style={[styles.cardTitle, { color: textColor }]}>Personal Information</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Display Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Display Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="Your display name"
                placeholderTextColor={mutedColor}
                value={personalInfo.display_name}
                onChangeText={(text) => setPersonalInfo({ ...personalInfo, display_name: text })}
              />
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled, { backgroundColor: inputBg, borderColor, color: mutedColor }]}
                value={personalInfo.email}
                editable={false}
              />
              <Text style={[styles.helperText, { color: mutedColor }]}>Email cannot be changed here</Text>
            </View>

            {/* Online Status */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Online Status</Text>
              <View style={styles.statusButtons}>
                {['ONLINE', 'OFFLINE', 'AWAY'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusButton,
                      { borderColor },
                      personalInfo.online_status === status && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                    ]}
                    onPress={() => setPersonalInfo({ ...personalInfo, online_status: status })}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        { color: personalInfo.online_status === status ? '#ffffff' : textColor },
                      ]}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSavingPersonal && styles.saveButtonDisabled]}
              onPress={savePersonalInfo}
              disabled={isSavingPersonal}
            >
              {isSavingPersonal ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Personal Info</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Organization Information Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={[styles.cardHeader, { borderBottomColor: isDarkMode ? 'rgba(148, 163, 184, 0.1)' : '#e2e8f0' }]}>
            <View style={styles.cardTitleContainer}>
              <Building2 size={20} color={textColor} />
              <Text style={[styles.cardTitle, { color: textColor }]}>Organization Information</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {/* Organization Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Organization Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="Your organization name"
                placeholderTextColor={mutedColor}
                value={organizationInfo.name}
                onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, name: text })}
              />
            </View>

            {/* Organization Slug */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Organization Slug</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="your-org-slug"
                placeholderTextColor={mutedColor}
                value={organizationInfo.slug}
                onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, slug: text })}
                autoCapitalize="none"
              />
              <Text style={[styles.helperText, { color: mutedColor }]}>Used in URLs and API endpoints</Text>
            </View>

            {/* Brand Color */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Brand Color</Text>
              <View style={styles.colorInputContainer}>
                <TouchableOpacity
                  style={[styles.colorPreview, { backgroundColor: organizationInfo.brand_color, borderColor }]}
                  onPress={() => setShowColorPicker(true)}
                />
                <TextInput
                  style={[styles.input, styles.colorInput, { backgroundColor: inputBg, borderColor, color: textColor }]}
                  placeholder="#3B82F6"
                  placeholderTextColor={mutedColor}
                  value={organizationInfo.brand_color}
                  onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, brand_color: text })}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSavingOrg && styles.saveButtonDisabled]}
              onPress={saveOrganizationInfo}
              disabled={isSavingOrg}
            >
              {isSavingOrg ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Organization Info</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
          </>
        )}

        {/* Widget Settings Tab */}
        {activeTab === 'widget' && organizationInfo && (
          <>
            {/* Header */}
            <View style={styles.tabHeader}>
              <Text style={[styles.tabHeaderTitle, { color: textColor }]}>Widget Settings</Text>
            </View>

            <WidgetSettingsContent
            organizationInfo={organizationInfo}
            setOrganizationInfo={setOrganizationInfo}
            widgetSubTab={widgetSubTab}
            setWidgetSubTab={setWidgetSubTab}
            isSaving={isSavingWidget}
            onSave={saveWidgetSettings}
            isDarkMode={isDarkMode}
            textColor={textColor}
            mutedColor={mutedColor}
            borderColor={borderColor}
            cardBg={cardBg}
            inputBg={inputBg}
          />
          </>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && organizationInfo && (
          <BillingContent
            conversationCount={conversationCount}
            plan={organizationInfo.plan || 'free'}
            isDarkMode={isDarkMode}
            textColor={textColor}
            mutedColor={mutedColor}
            borderColor={borderColor}
            cardBg={cardBg}
            onShowNotification={showSuccessNotification}
          />
        )}

        {/* Security Tab */}
        {activeTab === 'notifications' && personalInfo && (
          <SecurityContent
            userEmail={personalInfo.email}
            isDarkMode={isDarkMode}
            textColor={textColor}
            mutedColor={mutedColor}
            borderColor={borderColor}
            cardBg={cardBg}
            inputBg={inputBg}
            onShowNotification={(message, type) => {
              if (type === 'success') {
                showSuccessNotification(message);
              } else {
                showErrorNotification(message);
              }
            }}
          />
        )}

        {/* Bottom padding for nav bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowColorPicker(false)}>
          <Pressable style={[styles.colorPickerContainer, { backgroundColor: cardBg, borderColor }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.colorPickerTitle, { color: textColor }]}>Choose a Color</Text>
            <ScrollView contentContainerStyle={styles.colorGrid}>
              {predefinedColors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    organizationInfo?.brand_color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    if (organizationInfo) {
                      setOrganizationInfo({ ...organizationInfo, brand_color: color });
                      setShowColorPicker(false);
                    }
                  }}
                />
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeButton, { borderColor }]}
              onPress={() => setShowColorPicker(false)}
            >
              <Text style={[styles.closeButtonText, { color: textColor }]}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status Bar Notification */}
      <StatusBarNotification
        message={notificationMessage}
        type={notificationType}
        visible={showNotification}
        onHide={() => setShowNotification(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  tabHeader: {
    marginBottom: 16,
  },
  tabHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorInput: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Horizontal Card Styles
  horizontalCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  horizontalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  horizontalCardText: {
    flex: 1,
  },
  horizontalCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  horizontalCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  horizontalCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  avatarPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerContainer: {
    width: '80%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

