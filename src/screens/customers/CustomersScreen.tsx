import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Globe, Monitor, Smartphone, Tablet } from 'lucide-react-native';

interface Customer {
  id: string;
  display_name: string;
  email: string;
  status?: 'ACTIVE' | 'BLOCKED';
  country?: string;
  created_at: string;
  browser_name?: string;
  os_name?: string;
  device_type?: 'Desktop' | 'Mobile' | 'Tablet';
  city?: string;
  region?: string;
  is_returning?: boolean;
  total_visits?: number;
}

// Custom hook to fetch customers
const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentOrgId, setAgentOrgId] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (agentError) throw agentError;
      if (!agentData) throw new Error('Agent not found for user');
      setAgentOrgId(agentData.org_id);

      const { data, error: customersError } = await supabase
        .from('customers')
        .select('id, display_name, email, status, country, created_at, browser_name, os_name, device_type, city, region, is_returning, total_visits')
        .eq('org_id', agentData.org_id)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomers();

    if (!agentOrgId) return;

    const customerChannel = supabase
      .channel(`customers_changes_${agentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customers',
          filter: `org_id=eq.${agentOrgId}`,
        },
        (payload) => {
          if (payload.new) {
            setCustomers((prev) => [
              payload.new as Customer,
              ...prev.filter((c) => c.id !== payload.new?.id),
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `org_id=eq.${agentOrgId}`,
        },
        (payload) => {
          if (payload.new) {
            setCustomers((prev) => prev.map((c) => (c.id === payload.new?.id ? (payload.new as Customer) : c)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customerChannel);
    };
  }, [fetchCustomers, agentOrgId]);

  return { customers, loading, error, refresh: fetchCustomers };
};

export default function CustomersScreen() {
  const { isDarkMode } = useTheme();
  const { customers, loading, error, refresh } = useCustomers();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading customers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>Error: {error}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tap to Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Customers</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            View and manage your customer base and their conversation history
          </Text>
        </View>

        {/* Customer List */}
        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: mutedColor }]}>No customers yet</Text>
            <Text style={[styles.emptyStateText, { color: mutedColor }]}>
              Customers will appear here when they start conversations
            </Text>
          </View>
        ) : (
          <View style={styles.customerList}>
            {customers.map((customer) => (
              <View key={customer.id} style={[styles.customerCard, { backgroundColor: cardBg, borderColor }]}>
                {/* Customer Info */}
                <View style={styles.customerInfo}>
                  <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                    <Text style={[styles.avatarText, { color: mutedColor }]}>
                      {customer.display_name?.slice(0, 2).toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={[styles.customerName, { color: textColor }]}>{customer.display_name}</Text>
                    <Text style={[styles.customerEmail, { color: mutedColor }]}>{customer.email}</Text>
                  </View>
                </View>

                {/* Device & Location */}
                <View style={styles.section}>
                  <View style={styles.row}>
                    {customer.device_type === 'Mobile' && <Smartphone size={16} color="#3b82f6" />}
                    {customer.device_type === 'Tablet' && <Tablet size={16} color="#22c55e" />}
                    {customer.device_type === 'Desktop' && <Monitor size={16} color="#a855f7" />}
                    <Text style={[styles.rowText, { color: textColor }]}>
                      {customer.browser_name} on {customer.os_name || 'Unknown OS'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Globe size={14} color={mutedColor} />
                    <Text style={[styles.rowTextSmall, { color: mutedColor }]}>
                      {customer.city && customer.region
                        ? `${customer.city}, ${customer.region}`
                        : customer.country || 'Unknown'}
                    </Text>
                  </View>
                </View>

                {/* Behavior & Created */}
                <View style={styles.footer}>
                  <View style={styles.behaviorSection}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: customer.is_returning
                            ? isDarkMode
                              ? '#3b82f6'
                              : '#3b82f6'
                            : isDarkMode
                            ? '#334155'
                            : '#e2e8f0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: customer.is_returning ? '#ffffff' : mutedColor },
                        ]}
                      >
                        {customer.is_returning ? 'Returning' : 'New'}
                      </Text>
                    </View>
                    {customer.total_visits && customer.total_visits > 1 && (
                      <Text style={[styles.visitsText, { color: mutedColor }]}>
                        {customer.total_visits} visits
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.dateText, { color: mutedColor }]}>
                    {formatDate(customer.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
  errorText: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 12,
    textAlign: 'center',
  },
  customerList: {
    gap: 12,
  },
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
  },
  section: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowText: {
    fontSize: 13,
  },
  rowTextSmall: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  behaviorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  visitsText: {
    fontSize: 11,
  },
  dateText: {
    fontSize: 13,
  },
});

