import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Code, Copy, Check, ArrowLeft, FileText, Layers, Monitor } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface InstallationScreenProps {
  onBack?: () => void;
}

interface Platform {
  id: string;
  name: string;
  icon: any;
  description: string;
  instructions: string[];
}

export default function InstallationScreen({ onBack }: InstallationScreenProps) {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('html');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? 'rgba(51, 65, 85, 0.1)' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const primaryColor = '#3b82f6';

  const platforms: Platform[] = [
    {
      id: 'html',
      name: 'HTML',
      icon: FileText,
      description: 'Works on any static HTML website',
      instructions: [
        'Copy the universal embed code below',
        'Open your HTML file',
        'Paste the code before the closing </head> tag',
        'Save and refresh your website'
      ]
    },
    {
      id: 'react',
      name: 'React',
      icon: Layers,
      description: 'Perfect for React applications',
      instructions: [
        'Copy the universal embed code below',
        'Open your public/index.html file',
        'Paste it inside the <head> section',
        'The universal widget works perfectly with React'
      ]
    },
    {
      id: 'nextjs',
      name: 'Next.js',
      icon: Monitor,
      description: 'Optimized for Next.js projects',
      instructions: [
        'Copy the universal embed code below',
        'Paste it in your app/layout.tsx or pages/_document.tsx file',
        'Add it inside the <head> section',
        'The universal widget works perfectly with Next.js'
      ]
    },
    {
      id: 'framer',
      name: 'Framer',
      icon: Layers,
      description: 'Easy integration with Framer',
      instructions: [
        'Copy the universal embed code below',
        'Go to Site Settings → General → Custom Code',
        'Paste the code in "End of <head> tag"',
        'Publish your site'
      ]
    },
    {
      id: 'webflow',
      name: 'Webflow',
      icon: Monitor,
      description: 'Seamless Webflow integration',
      instructions: [
        'Copy the universal embed code below',
        'Go to Site Settings → Custom Code',
        'Paste the code in "Head Code"',
        'Publish your site'
      ]
    }
  ];

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (agentError) throw agentError;

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', agentData.org_id)
        .single();

      if (orgError) throw orgError;

      setOrganizationId(orgData.id);
      setOrganizationName(orgData.name);
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEmbedCode = () => {
    if (!organizationId) return '';
    const baseUrl = 'https://admin.linquo.app';
    return `<script id="linquo" async="true" src="${baseUrl}/widget.js?id=${organizationId}"></script>`;
  };

  const handleCopy = async (type: string) => {
    let textToCopy = '';
    
    if (type === 'orgId') {
      textToCopy = organizationId || '';
    } else {
      textToCopy = generateEmbedCode();
    }
    
    try {
      await Clipboard.setString(textToCopy);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, { color: mutedColor }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  const currentPlatform = platforms.find(p => p.id === selectedPlatform) || platforms[0];
  const IconComponent = currentPlatform.icon;

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Install Linquo Widget</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            Choose your platform and get the embed code to install Linquo chat widget on{' '}
            <Text style={{ fontWeight: '600' }}>{organizationName}</Text>
          </Text>
        </View>

        {/* Platform Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContainer}
        >
          {platforms.map((platform) => {
            const PlatformIcon = platform.icon;
            const isActive = selectedPlatform === platform.id;
            return (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.tab,
                  { borderColor },
                  isActive && [styles.tabActive, { backgroundColor: cardBg, borderColor: primaryColor }]
                ]}
                onPress={() => setSelectedPlatform(platform.id)}
              >
                <PlatformIcon size={16} color={isActive ? primaryColor : mutedColor} />
                <Text style={[styles.tabText, { color: isActive ? textColor : mutedColor }]}>
                  {platform.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Embed Code Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <IconComponent size={20} color={primaryColor} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: textColor }]}>
                  {currentPlatform.name} Integration
                </Text>
                <Text style={[styles.cardDescription, { color: mutedColor }]}>
                  {currentPlatform.description}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Copy Button */}
          <View style={styles.copyButtonContainer}>
            <TouchableOpacity
              style={[styles.copyButton, { borderColor }]}
              onPress={() => handleCopy(selectedPlatform)}
              disabled={!organizationId}
            >
              {copiedStates[selectedPlatform] ? (
                <>
                  <Check size={14} color="#22c55e" />
                  <Text style={[styles.copyButtonText, { color: '#22c55e' }]}>Copied!</Text>
                </>
              ) : (
                <>
                  <Copy size={14} color={textColor} />
                  <Text style={[styles.copyButtonText, { color: textColor }]}>Copy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Code Block */}
          <View style={[styles.codeBlock, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
            <Text style={[styles.codeText, { color: textColor }]}>
              {generateEmbedCode() || 'Loading embed code...'}
            </Text>
          </View>
        </View>

        {/* Installation Instructions Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.instructionsHeader}>
            <Code size={20} color={textColor} />
            <Text style={[styles.instructionsTitle, { color: textColor }]}>How to Install</Text>
          </View>
          <View style={styles.instructionsList}>
            {currentPlatform.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={[styles.stepNumber, { backgroundColor: primaryColor }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.instructionText, { color: textColor }]}>
                  {instruction}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Organization Details Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.orgHeader}>
            <View style={[styles.orgDot, { backgroundColor: primaryColor }]} />
            <Text style={[styles.orgTitle, { color: textColor }]}>Organization Details</Text>
          </View>
          <View style={styles.orgContent}>
            {/* Organization Name */}
            <View style={styles.orgField}>
              <Text style={[styles.orgFieldLabel, { color: mutedColor }]}>ORGANIZATION NAME</Text>
              <Text style={[styles.orgFieldValue, { color: textColor }]}>
                {organizationName}
              </Text>
            </View>
            
            {/* Organization ID */}
            <View style={styles.orgField}>
              <Text style={[styles.orgFieldLabel, { color: mutedColor }]}>ORGANIZATION ID</Text>
              <View style={styles.orgIdContainer}>
                <View style={[styles.orgIdBox, { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', borderColor }]}>
                  <Text style={[styles.orgIdText, { color: textColor }]} numberOfLines={1}>
                    {organizationId}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.orgCopyButton}
                  onPress={() => handleCopy('orgId')}
                >
                  {copiedStates['orgId'] ? (
                    <Check size={16} color="#22c55e" />
                  ) : (
                    <Copy size={16} color={mutedColor} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabsScrollView: {
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabActive: {
    borderWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  copyButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  codeBlock: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 12,
  },
  orgDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orgTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  orgContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  orgField: {
    gap: 8,
  },
  orgFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  orgFieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  orgIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgIdBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  orgIdText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  orgCopyButton: {
    padding: 8,
  },
});
