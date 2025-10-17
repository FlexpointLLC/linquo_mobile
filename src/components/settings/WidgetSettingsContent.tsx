import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';

interface OrganizationInfo {
  brand_color: string;
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

interface WidgetSettingsContentProps {
  organizationInfo: OrganizationInfo;
  setOrganizationInfo: (info: OrganizationInfo) => void;
  widgetSubTab: 'main-screen' | 'conversation';
  setWidgetSubTab: (tab: 'main-screen' | 'conversation') => void;
  isSaving: boolean;
  onSave: () => void;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cardBg: string;
  inputBg: string;
}

export function WidgetSettingsContent({
  organizationInfo,
  setOrganizationInfo,
  widgetSubTab,
  setWidgetSubTab,
  isSaving,
  onSave,
  isDarkMode,
  textColor,
  mutedColor,
  borderColor,
  cardBg,
  inputBg,
}: WidgetSettingsContentProps) {
  const isPaid = organizationInfo.plan === 'paid';
  const [showColorPicker, setShowColorPicker] = useState(false);

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#f43f5e', '#22c55e', '#eab308',
  ];

  return (
    <View style={[styles.container, { backgroundColor: cardBg }]}>
      {/* Nested Tabs */}
      <View style={[styles.subTabsContainer, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[
            styles.subTab,
            widgetSubTab === 'main-screen' && [styles.subTabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setWidgetSubTab('main-screen')}
        >
          <Text
            style={[
              styles.subTabText,
              { color: widgetSubTab === 'main-screen' ? textColor : mutedColor },
            ]}
          >
            Main Screen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subTab,
            widgetSubTab === 'conversation' && [styles.subTabActive, { borderBottomColor: '#3b82f6' }],
          ]}
          onPress={() => setWidgetSubTab('conversation')}
        >
          <Text
            style={[
              styles.subTabText,
              { color: widgetSubTab === 'conversation' ? textColor : mutedColor },
            ]}
          >
            Conversation
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Tab Content */}
      {widgetSubTab === 'main-screen' && (
        <View style={styles.tabContent}>
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

          {/* Brand Logo and Agents */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: textColor }]}>Brand Logo and Agents</Text>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                Show your brand logo and agent avatars in the widget
              </Text>
            </View>
            <Switch
              value={organizationInfo.widget_show_logo_agents || false}
              onValueChange={(value) => setOrganizationInfo({ ...organizationInfo, widget_show_logo_agents: value })}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Welcome Message Line 1 */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Welcome Message Line 1</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Hi! How can we help?"
              placeholderTextColor={mutedColor}
              value={organizationInfo.widget_text_line1 || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, widget_text_line1: text })}
            />
          </View>

          {/* Welcome Message Line 2 */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Welcome Message Line 2</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="We usually reply in a few minutes"
              placeholderTextColor={mutedColor}
              value={organizationInfo.widget_text_line2 || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, widget_text_line2: text })}
            />
          </View>

          {/* Button Text */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Button Text</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Send us a message"
              placeholderTextColor={mutedColor}
              value={organizationInfo.widget_button_text || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, widget_button_text: text })}
            />
          </View>

          {/* Icon Alignment (Pro) */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <View style={styles.labelWithBadge}>
                <Text style={[styles.toggleLabel, { color: textColor }]}>Icon Alignment</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>Pro</Text>
                </View>
              </View>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                Position of the widget icon (left or right)
              </Text>
            </View>
            <Text style={[styles.disabledValue, { color: mutedColor }]}>
              {(organizationInfo.widget_icon_alignment || 'right').charAt(0).toUpperCase() + (organizationInfo.widget_icon_alignment || 'right').slice(1)}
            </Text>
          </View>

          {/* Show Branding (Pro) */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <View style={styles.labelWithBadge}>
                <Text style={[styles.toggleLabel, { color: textColor }]}>Show Branding</Text>
                {!isPaid && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>Pro</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                {isPaid ? 'Toggle "Powered by Linquo" branding on/off' : 'Upgrade to Paid plan to hide branding'}
              </Text>
            </View>
            <Switch
              value={isPaid ? (organizationInfo.widget_show_branding || false) : true}
              onValueChange={(value) => isPaid && setOrganizationInfo({ ...organizationInfo, widget_show_branding: value })}
              disabled={!isPaid}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Dark Mode */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: textColor }]}>Dark Mode</Text>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                Set your widget theme
              </Text>
            </View>
            <Switch
              value={organizationInfo.widget_dark_mode || false}
              onValueChange={(value) => setOrganizationInfo({ ...organizationInfo, widget_dark_mode: value })}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      )}

      {/* Conversation Tab Content */}
      {widgetSubTab === 'conversation' && (
        <View style={styles.tabContent}>
          {/* Header Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Header Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Support Team"
              placeholderTextColor={mutedColor}
              value={organizationInfo.chat_header_name || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, chat_header_name: text })}
            />
          </View>

          {/* Header Subtitle */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Header Subtitle</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Typically replies within 1 min"
              placeholderTextColor={mutedColor}
              value={organizationInfo.chat_header_subtitle || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, chat_header_subtitle: text })}
            />
          </View>

          {/* Welcome Message */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Welcome Message</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, borderColor, color: textColor }]}
              placeholder="Hi there! 👋&#10;I'm [Username]. Welcome to the [org_name] sales team! What brings you here today?"
              placeholderTextColor={mutedColor}
              value={organizationInfo.welcome_message || ''}
              onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, welcome_message: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={[styles.helperText, { color: mutedColor }]}>
              Use [Username] for agent name and [org_name] for your organization name
            </Text>
          </View>

          {/* Pop Welcome Message */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: textColor }]}>Pop Welcome Message</Text>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                User can see it even without opening the widget
              </Text>
            </View>
            <Switch
              value={organizationInfo.show_welcome_popup || false}
              onValueChange={(value) => setOrganizationInfo({ ...organizationInfo, show_welcome_popup: value })}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Auto Reply */}
          <View style={styles.toggleGroup}>
            <View style={styles.toggleContent}>
              <Text style={[styles.toggleLabel, { color: textColor }]}>Auto Reply</Text>
              <Text style={[styles.toggleDescription, { color: mutedColor }]}>
                Automatically reply when a customer starts a conversation
              </Text>
            </View>
            <Switch
              value={organizationInfo.auto_reply_enabled || false}
              onValueChange={(value) => setOrganizationInfo({ ...organizationInfo, auto_reply_enabled: value })}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Auto Reply Message (conditional) */}
          {organizationInfo.auto_reply_enabled && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Auto Reply Message</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: inputBg, borderColor, color: textColor }]}
                placeholder="Thanks for reaching out! We'll get back to you as soon as possible."
                placeholderTextColor={mutedColor}
                value={organizationInfo.auto_reply || ''}
                onChangeText={(text) => setOrganizationInfo({ ...organizationInfo, auto_reply: text })}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <Text style={[styles.helperText, { color: mutedColor }]}>
                Use [Username] for agent name and [org_name] for your organization name
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Widget Settings</Text>
          )}
        </TouchableOpacity>
      </View>

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
                    organizationInfo.brand_color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    setOrganizationInfo({ ...organizationInfo, brand_color: color });
                    setShowColorPicker(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderRadius: 12,
  },
  subTabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomWidth: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    gap: 0,
  },
  formGroup: {
    marginBottom: 12,
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
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
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 12,
  },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  proBadge: {
    backgroundColor: '#a855f7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  disabledValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  previewCard: {
    marginTop: 24,
    marginBottom: 16,
    borderTopWidth: 1,
    paddingTop: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  previewContainer: {
    height: 400,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  widgetBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  widgetCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  widgetHeader: {
    padding: 16,
  },
  widgetHeaderContent: {
    gap: 2,
  },
  widgetHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  widgetHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  widgetBody: {
    padding: 16,
    gap: 12,
  },
  widgetWelcomeLine1: {
    fontSize: 16,
    fontWeight: '600',
  },
  widgetWelcomeLine2: {
    fontSize: 14,
    lineHeight: 20,
  },
  widgetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  widgetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

