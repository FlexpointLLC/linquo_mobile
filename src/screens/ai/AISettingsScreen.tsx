import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Save } from 'lucide-react-native';
import { StatusBarNotification } from '../../components/common/StatusBarNotification';

export default function AISettingsScreen() {
  const { isDarkMode } = useTheme();
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [companyInfo, setCompanyInfo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSettings, setInitialSettings] = useState({ isAiEnabled: false, companyInfo: '' });
  const [showNotification, setShowNotification] = useState(false);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const inputBg = isDarkMode ? '#0f172a' : '#f1f5f9';

  // Load existing AI settings
  useEffect(() => {
    loadAISettings();
  }, []);

  // Check for changes
  useEffect(() => {
    const currentSettings = { isAiEnabled, companyInfo };
    const hasChanged = JSON.stringify(currentSettings) !== JSON.stringify(initialSettings);
    setHasChanges(hasChanged);
  }, [isAiEnabled, companyInfo, initialSettings]);

  const loadAISettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const { data, error } = await supabase
        .from('organizations')
        .select('ai_enabled, ai_knowledge_base')
        .eq('id', agentData.org_id)
        .single();

      if (error) {
        console.error('Error loading AI settings:', error);
        return;
      }

      const settings = {
        isAiEnabled: data?.ai_enabled || false,
        companyInfo: data?.ai_knowledge_base || ''
      };

      setIsAiEnabled(settings.isAiEnabled);
      setCompanyInfo(settings.companyInfo);
      setInitialSettings(settings);
    } catch (error) {
      console.error('Error loading AI settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const { data: agentData } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) {
        Alert.alert('Error', 'Organization not found');
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          ai_enabled: isAiEnabled,
          ai_knowledge_base: companyInfo.trim()
        })
        .eq('id', agentData.org_id);

      if (error) {
        Alert.alert('Error', `Failed to save AI settings: ${error.message}`);
        return;
      }

      // Update initial settings to reflect saved state
      const newSettings = { isAiEnabled, companyInfo };
      setInitialSettings(newSettings);
      setHasChanges(false);
      
      // Show notification instead of alert
      setShowNotification(true);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      Alert.alert('Error', 'Failed to save AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading AI settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Status Bar Notification */}
      <StatusBarNotification
        message="Update Success"
        visible={showNotification}
        onHide={() => setShowNotification(false)}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Linquo AI</Text>
          <Text style={[styles.headerSubtitle, { color: mutedColor }]}>
            Configure AI-powered chat features for your organization
          </Text>
        </View>

        {/* Enable AI Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleDescriptionContainer}>
              <Text style={[styles.cardTitle, { color: textColor }]}>Turn on Linquo AI</Text>
              <Text style={[styles.cardDescriptionBelow, { color: mutedColor }]}>
                AI-powered Linquo chat makes your business running while you are away.
              </Text>
            </View>
            <Switch
              value={isAiEnabled}
              onValueChange={setIsAiEnabled}
              trackColor={{ false: isDarkMode ? '#334155' : '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#ffffff"
              ios_backgroundColor={isDarkMode ? '#334155' : '#e2e8f0'}
            />
          </View>
        </View>

        {/* AI Knowledge Base Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor },
            !isAiEnabled && styles.disabledCard
          ]}
        >
          <View style={styles.cardHeaderColumn}>
            <Text style={[styles.cardTitle, { color: textColor }]}>AI Knowledge Base</Text>
            <Text style={[styles.cardDescription, { color: mutedColor, marginTop: 8 }]}>
              Provide information about your company or product so AI can learn the basics and reply based on that.
            </Text>
          </View>
          <TextInput
            style={[
              styles.textarea,
              {
                backgroundColor: inputBg,
                borderColor,
                color: textColor,
              },
            ]}
            placeholder="e.g., Our company, Linquo, provides real-time customer support solutions. Our main product features include live chat, analytics dashboard, and agent management. We offer a 14-day free trial..."
            placeholderTextColor={mutedColor}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            editable={isAiEnabled}
            value={companyInfo}
            onChangeText={setCompanyInfo}
            maxLength={2000}
          />
          {isAiEnabled && (
            <View style={styles.textareaFooter}>
              <Text style={[styles.textareaFooterText, { color: mutedColor }]}>
                Help AI understand your business better
              </Text>
              <Text style={[styles.textareaFooterText, { color: mutedColor }]}>
                {companyInfo.length}/2000
              </Text>
            </View>
          )}
        </View>

        {/* Save Button at Bottom */}
        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#3b82f6' }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  disabledCard: {
    opacity: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleDescriptionContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardHeaderColumn: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardDescriptionBelow: {
    fontSize: 14,
    lineHeight: 20,
  },
  textarea: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 200,
    marginBottom: 8,
  },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textareaFooterText: {
    fontSize: 11,
  },
});
