import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, MoreVertical, ArrowLeft, Edit, Trash2, X } from 'lucide-react-native';
import { StatusBarNotification } from '../../components/common/StatusBarNotification';

interface Agent {
  id: string;
  display_name: string;
  email: string;
  online_status: string;
  is_active: boolean;
  role?: string;
  is_superadmin?: boolean;
}

// Custom hook to fetch agents
const useAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentOrgId, setAgentOrgId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('org_id, role')
        .eq('user_id', user.id)
        .single();

      if (agentError) throw agentError;
      if (!agentData) throw new Error('Agent not found for user');
      
      setAgentOrgId(agentData.org_id);
      setCurrentUserRole(agentData.role || 'AGENT');

      const { data, error: agentsError } = await supabase
        .from('agents')
        .select('id, display_name, email, online_status, is_active, role, is_superadmin')
        .eq('org_id', agentData.org_id)
        .order('display_name');

      if (agentsError) throw agentsError;

      setAgents(data || []);
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAgents();

    if (!agentOrgId) return;

    const agentChannel = supabase
      .channel(`agents_changes_${agentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `org_id=eq.${agentOrgId}`,
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agentChannel);
    };
  }, [fetchAgents, agentOrgId]);

  return { agents, loading, error, refresh: fetchAgents, currentUserRole };
};

interface AgentsScreenProps {
  onBack?: () => void;
}

export default function AgentsScreen({ onBack }: AgentsScreenProps) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { agents, loading, error, refresh, currentUserRole } = useAgents();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showActionsDrawer, setShowActionsDrawer] = useState(false);
  const [showAddEditDrawer, setShowAddEditDrawer] = useState(false);
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
  });
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  const isOwner = currentUserRole === 'OWNER';

  useEffect(() => {
    const isAnyDrawerOpen = showActionsDrawer || showAddEditDrawer || showDeleteDrawer;
    if (isAnyDrawerOpen) {
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
    } else {
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
  }, [showActionsDrawer, showAddEditDrawer, showDeleteDrawer]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', role: 'AGENT' });
    setIsEditMode(false);
    setSelectedAgent(null);
  };

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

  const handleAddAgent = () => {
    resetForm();
    setIsEditMode(false);
    setShowAddEditDrawer(true);
  };

  const handleMorePress = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowActionsDrawer(true);
  };

  const handleEditAgent = () => {
    if (!selectedAgent) return;
    setShowActionsDrawer(false);
    setIsEditMode(true);
    setFormData({
      name: selectedAgent.display_name,
      email: selectedAgent.email,
      password: '',
      role: selectedAgent.role || 'AGENT',
    });
    setShowAddEditDrawer(true);
  };

  const handleDeleteAgent = () => {
    setShowActionsDrawer(false);
    setShowDeleteDrawer(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || (!isEditMode && !formData.password)) {
      showErrorNotification('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && selectedAgent) {
        // Update existing agent
        const { error: agentError } = await supabase
          .from('agents')
          .update({
            display_name: formData.name,
            email: formData.email,
            role: formData.role,
          })
          .eq('id', selectedAgent.id);

        if (agentError) throw agentError;

        showSuccessNotification('Agent updated successfully!');
        setShowAddEditDrawer(false);
        resetForm();
        await refresh();
      } else {
        // Create new agent
        const { data: agentData } = await supabase
          .from('agents')
          .select('org_id')
          .eq('user_id', user?.id)
          .single();

        if (!agentData) throw new Error('Organization not found');

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              display_name: formData.name,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user account');

        // Create agent record
        const { error: agentError } = await supabase.from('agents').insert({
          user_id: authData.user.id,
          display_name: formData.name,
          email: formData.email,
          org_id: agentData.org_id,
          online_status: 'OFFLINE',
          is_active: true,
          role: formData.role,
        });

        if (agentError) throw agentError;

        showSuccessNotification('Agent created successfully!');
        setShowAddEditDrawer(false);
        resetForm();
        await refresh();
      }
    } catch (error: any) {
      console.error('Error saving agent:', error);
      showErrorNotification(error.message || 'Failed to save agent');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedAgent) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('agents').delete().eq('id', selectedAgent.id);

      if (error) throw error;

      showSuccessNotification('Agent deleted successfully!');
      setShowDeleteDrawer(false);
      setSelectedAgent(null);
      await refresh();
    } catch (error: any) {
      console.error('Error deleting agent:', error);
      showErrorNotification(error.message || 'Failed to delete agent');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    if (role === 'OWNER') {
      return {
        bg: isDarkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.2)',
        text: isDarkMode ? '#c084fc' : '#a855f7',
      };
    }
    return {
      bg: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
      text: isDarkMode ? '#60a5fa' : '#3b82f6',
    };
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    if (isActive) {
      return {
        bg: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.2)',
        text: isDarkMode ? '#4ade80' : '#22c55e',
      };
    }
    return {
      bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      text: isDarkMode ? '#f87171' : '#ef4444',
    };
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading agents...</Text>
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
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: textColor }]}>Agents</Text>
            <Text style={[styles.subtitle, { color: mutedColor }]}>
              Manage your team members and their access to the dashboard
            </Text>
          </View>
          {isOwner && (
            <TouchableOpacity style={styles.addButton} onPress={handleAddAgent}>
              <Plus size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add Agent</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Agent List */}
        {agents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: mutedColor }]}>No agents yet</Text>
            <Text style={[styles.emptyStateText, { color: mutedColor }]}>
              Invite team members to get started
            </Text>
          </View>
        ) : (
          <View style={styles.agentList}>
            {agents.map((agent) => {
              const roleBadge = getRoleBadgeColor(agent.role);
              const statusBadge = getStatusBadgeColor(agent.is_active);
              const isCurrentUser = agent.email === user?.email;

              return (
                <View key={agent.id} style={[styles.agentCard, { backgroundColor: cardBg, borderColor }]}>
                  {/* Agent Info */}
                  <View style={styles.agentInfo}>
                    <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                      <Text style={[styles.avatarText, { color: mutedColor }]}>
                        {agent.display_name?.slice(0, 2).toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <View style={styles.agentDetails}>
                      <Text style={[styles.agentName, { color: textColor }]}>{agent.display_name}</Text>
                      <Text style={[styles.agentEmail, { color: mutedColor }]}>{agent.email}</Text>
                    </View>
                    {isOwner && !isCurrentUser && (
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleMorePress(agent)}
                      >
                        <MoreVertical size={20} color={mutedColor} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Role & Status */}
                  <View style={styles.badgeContainer}>
                    <View style={[styles.badge, { backgroundColor: roleBadge.bg }]}>
                      <Text style={[styles.badgeText, { color: roleBadge.text }]}>
                        {agent.role || 'AGENT'}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Actions Drawer */}
      <Modal
        visible={showActionsDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowActionsDrawer(false)}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => setShowActionsDrawer(false)} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Drawer Handle */}
            <View style={styles.drawerHandle} />

            {/* Agent Info */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
                <Text style={[styles.avatarText, { color: mutedColor }]}>
                  {selectedAgent?.display_name?.slice(0, 2).toUpperCase() || 'A'}
                </Text>
              </View>
              <View style={styles.drawerAgentInfo}>
                <Text style={[styles.drawerAgentName, { color: textColor }]}>{selectedAgent?.display_name}</Text>
                <Text style={[styles.drawerAgentEmail, { color: mutedColor }]}>{selectedAgent?.email}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.drawerActions}>
              <TouchableOpacity style={styles.drawerAction} onPress={handleEditAgent}>
                <Edit size={20} color={textColor} />
                <Text style={[styles.drawerActionText, { color: textColor }]}>Edit Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerAction} onPress={handleDeleteAgent}>
                <Trash2 size={20} color="#ef4444" />
                <Text style={[styles.drawerActionText, { color: '#ef4444' }]}>Delete Agent</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Add/Edit Agent Drawer */}
      <Modal
        visible={showAddEditDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowAddEditDrawer(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
            <Pressable style={styles.overlayPressable} onPress={() => setShowAddEditDrawer(false)} />
            <Animated.View
              style={[
                styles.drawerContainer,
                styles.formDrawer,
                { backgroundColor, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Header */}
              <View style={[styles.formHeader, { borderBottomColor: borderColor }]}>
                <Text style={[styles.formTitle, { color: textColor }]}>
                  {isEditMode ? 'Edit Agent' : 'Add Agent'}
                </Text>
                <TouchableOpacity onPress={() => setShowAddEditDrawer(false)}>
                  <X size={24} color={mutedColor} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
                {/* Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                    placeholder="Enter agent name"
                    placeholderTextColor={mutedColor}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                {/* Email */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Email *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                    placeholder="Enter email address"
                    placeholderTextColor={mutedColor}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isEditMode}
                  />
                </View>

                {/* Password (only for add) */}
                {!isEditMode && (
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: textColor }]}>Password *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: cardBg, borderColor, color: textColor }]}
                      placeholder="Enter password"
                      placeholderTextColor={mutedColor}
                      value={formData.password}
                      onChangeText={(text) => setFormData({ ...formData, password: text })}
                      secureTextEntry
                    />
                  </View>
                )}

                {/* Role */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: textColor }]}>Role *</Text>
                  <View style={styles.roleButtons}>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        { borderColor },
                        formData.role === 'AGENT' && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                      ]}
                      onPress={() => setFormData({ ...formData, role: 'AGENT' })}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          { color: formData.role === 'AGENT' ? '#ffffff' : textColor },
                        ]}
                      >
                        Agent
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        { borderColor },
                        formData.role === 'OWNER' && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                      ]}
                      onPress={() => setFormData({ ...formData, role: 'OWNER' })}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          { color: formData.role === 'OWNER' ? '#ffffff' : textColor },
                        ]}
                      >
                        Owner
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Bottom padding for scroll */}
                <View style={{ height: 24 }} />
              </ScrollView>

              {/* Footer */}
              <View style={[styles.formFooter, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor }]}
                  onPress={() => setShowAddEditDrawer(false)}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? 'Update Agent' : 'Add Agent'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Drawer */}
      <Modal
        visible={showDeleteDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowDeleteDrawer(false)}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => setShowDeleteDrawer(false)} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Drawer Handle */}
            <View style={styles.drawerHandle} />

            {/* Content */}
            <View style={styles.deleteContent}>
              <Text style={[styles.deleteTitle, { color: textColor }]}>Delete Agent</Text>
              <Text style={[styles.deleteMessage, { color: mutedColor }]}>
                Are you sure you want to delete <Text style={{ fontWeight: '600' }}>{selectedAgent?.display_name}</Text>?
                This action cannot be undone.
              </Text>
            </View>

            {/* Actions */}
            <View style={[styles.deleteActions, { borderTopColor: borderColor }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor }]}
                onPress={() => setShowDeleteDrawer(false)}
                disabled={isSaving}
              >
                <Text style={[styles.cancelButtonText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, isSaving && styles.deleteButtonDisabled]}
                onPress={confirmDelete}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
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
    paddingTop: 0,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerText: {
    marginBottom: 12,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  agentList: {
    gap: 12,
  },
  agentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  agentInfo: {
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
  agentDetails: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  agentEmail: {
    fontSize: 13,
  },
  moreButton: {
    padding: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  drawerAgentInfo: {
    flex: 1,
  },
  drawerAgentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  drawerAgentEmail: {
    fontSize: 13,
  },
  drawerActions: {
    paddingTop: 8,
  },
  drawerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  drawerActionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Form Drawer Styles
  formDrawer: {
    maxHeight: '85%',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formContent: {
    paddingHorizontal: 16,
  },
  formGroup: {
    marginTop: 16,
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
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Delete Drawer Styles
  deleteContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

