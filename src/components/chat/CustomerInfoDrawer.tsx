import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { X, MapPin, Monitor, Activity, ChevronRight, Globe } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

interface CustomerInfoDrawerProps {
  visible: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerEmail: string;
}

interface CustomerData {
  id: string;
  display_name: string;
  email: string;
  status?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  device_type?: string;
  language?: string;
  is_returning?: boolean;
  total_visits?: number;
  last_visit?: string;
  referrer_url?: string;
  current_url?: string;
}

export function CustomerInfoDrawer({
  visible,
  onClose,
  customerId,
  customerName,
  customerEmail,
}: CustomerInfoDrawerProps) {
  const { isDarkMode } = useTheme();
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['location', 'device', 'activity', 'website']));
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Fade in backdrop and slide up drawer
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 90,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Fetch customer data
      fetchCustomerData();
    } else {
      // Fade out backdrop and slide down drawer
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomerData(data);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const sectionBg = isDarkMode ? '#1e293b' : '#f1f5f9';

  const Section = ({ 
    title, 
    icon: Icon, 
    children, 
    sectionKey 
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
    sectionKey: string;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <View style={[styles.section, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: sectionBg }]}>
              <Icon size={16} color={mutedColor} />
            </View>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
          </View>
          <Animated.View
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }]
            }}
          >
            <ChevronRight size={16} color={mutedColor} />
          </Animated.View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {children}
          </View>
        )}
      </View>
    );
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.drawerOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <Pressable 
          style={styles.overlayPressable}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.drawerContainer,
            { 
              backgroundColor,
              borderTopColor: borderColor,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <Text style={[styles.headerTitle, { color: textColor }]}>Customer Information</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[styles.loadingText, { color: mutedColor }]}>Loading customer details...</Text>
              </View>
            ) : (
              <View>
                {/* Customer Header */}
                <View style={[styles.customerHeader, { borderBottomColor: borderColor }]}>
                  <View style={[styles.avatarLarge, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.avatarText}>
                      {customerName?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Text style={[styles.customerName, { color: textColor }]}>{customerName}</Text>
                  <Text style={[styles.customerEmail, { color: mutedColor }]}>{customerEmail}</Text>
                  {customerData?.status && (
                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: customerData.status === 'online' ? '#10b981' : '#9ca3af' }
                      ]} />
                      <Text style={[styles.statusText, { color: mutedColor }]}>
                        {customerData.status}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location Section */}
                {(customerData?.country || customerData?.region || customerData?.city) && (
                  <Section title="Location" icon={MapPin} sectionKey="location">
                    {customerData.city && <InfoRow label="City" value={customerData.city} />}
                    {customerData.region && <InfoRow label="Region" value={customerData.region} />}
                    {customerData.country && <InfoRow label="Country" value={customerData.country} />}
                    {customerData.timezone && <InfoRow label="Timezone" value={customerData.timezone} />}
                  </Section>
                )}

                {/* Device & Browser Section */}
                {(customerData?.browser_name || customerData?.os_name || customerData?.device_type) && (
                  <Section title="Device & Browser" icon={Monitor} sectionKey="device">
                    {customerData.browser_name && (
                      <InfoRow 
                        label="Browser" 
                        value={`${customerData.browser_name}${customerData.browser_version ? ` ${customerData.browser_version}` : ''}`} 
                      />
                    )}
                    {customerData.os_name && (
                      <InfoRow 
                        label="Operating System" 
                        value={`${customerData.os_name}${customerData.os_version ? ` ${customerData.os_version}` : ''}`} 
                      />
                    )}
                    {customerData.device_type && (
                      <InfoRow label="Device Type" value={customerData.device_type} />
                    )}
                    {customerData.language && <InfoRow label="Language" value={customerData.language} />}
                  </Section>
                )}

                {/* Activity Section */}
                <Section title="Activity" icon={Activity} sectionKey="activity">
                  {customerData?.is_returning !== undefined && (
                    <InfoRow label="Visitor Type" value={customerData.is_returning ? 'Returning' : 'New'} />
                  )}
                  {customerData?.total_visits && (
                    <InfoRow label="Total Visits" value={customerData.total_visits.toString()} />
                  )}
                  {customerData?.last_visit && (
                    <InfoRow 
                      label="Last Visit" 
                      value={new Date(customerData.last_visit).toLocaleDateString()} 
                    />
                  )}
                </Section>

                {/* Website Activity Section */}
                {customerData?.referrer_url && (
                  <Section title="Website Activity" icon={Globe} sectionKey="website">
                    {customerData.referrer_url && <InfoRow label="Referrer" value={customerData.referrer_url} />}
                    {customerData.current_url && <InfoRow label="Current Page" value={customerData.current_url} />}
                  </Section>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    flex: 1,
  },
  drawerContainer: {
    height: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  customerHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  section: {
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 16,
  },
  infoLabel: {
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});
