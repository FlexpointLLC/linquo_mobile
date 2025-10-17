import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { Search, Sun, Moon, Bell, LogOut } from 'lucide-react-native';
import { SearchModal } from '../search/SearchModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

interface DashboardHeaderProps {
  onSelectConversation?: (conversationId: string, messageId?: string) => void;
  onOpenNotifications?: () => void;
}

export function DashboardHeader({ onSelectConversation, onOpenNotifications }: DashboardHeaderProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (showUserMenu) {
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
  }, [showUserMenu]);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const buttonBg = isDarkMode ? '#1e293b' : '#f1f5f9';

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut();
  };

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor: borderColor }]}>
      {/* Left: Avatar Menu */}
      <TouchableOpacity
        style={[styles.avatarButton, { backgroundColor: buttonBg }]}
        onPress={() => setShowUserMenu(true)}
      >
        <Text style={[styles.avatarText, { color: mutedColor }]}>
          {userInitials}
        </Text>
      </TouchableOpacity>

      {/* Right: Action Buttons */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowSearch(true)}>
          <Search size={16} color={mutedColor} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={toggleTheme}>
          {isDarkMode ? (<Moon size={16} color={mutedColor} />) : (<Sun size={16} color={mutedColor} />)}
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => onOpenNotifications?.()}>
          <Bell size={16} color={mutedColor} />
        </TouchableOpacity>
      </View>

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectConversation={(conversationId, messageId) => {
          if (onSelectConversation) {
            onSelectConversation(conversationId, messageId);
          }
        }}
      />

      {/* Bottom Drawer Modal */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="none"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <Animated.View 
          style={[
            styles.drawerOverlay,
            { opacity: fadeAnim }
          ]}
        >
          <Pressable 
            style={styles.overlayPressable}
            onPress={() => setShowUserMenu(false)}
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
            {/* Drawer Handle */}
            <View style={styles.drawerHandle} />

            {/* User Info */}
            <View style={[styles.userInfo, { borderBottomColor: borderColor }]}>
              <View style={[styles.avatarLarge, { backgroundColor: buttonBg }]}>
                <Text style={[styles.avatarLargeText, { color: mutedColor }]}>
                  {userInitials}
                </Text>
              </View>
              <Text style={[styles.userName, { color: textColor }]}>
                {userName}
              </Text>
              <Text style={[styles.userEmail, { color: mutedColor }]}>
                {userEmail}
              </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
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
  userInfo: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '600',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
});
