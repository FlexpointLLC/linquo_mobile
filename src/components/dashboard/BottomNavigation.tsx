import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MessageCircle, BarChart3, Sparkles, Users, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasUnreadMessages?: boolean;
}

const navItems = [
  { key: 'chats', label: 'Chat', icon: MessageCircle },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'ai', label: 'AI', icon: Sparkles },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'more', label: 'More', icon: MoreHorizontal },
];

export function BottomNavigation({ activeTab, onTabChange, hasUnreadMessages = false }: BottomNavigationProps) {
  const { isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const activeColor = isDarkMode ? '#ffffff' : '#0f172a';
  const inactiveColor = isDarkMode ? '#94a3b8' : '#64748b';

  const isMoreTabActive = ['agents', 'settings', 'installation'].includes(activeTab);

  return (
    <View style={[styles.container, { backgroundColor, borderTopColor: borderColor, paddingBottom: insets.bottom }]}>
      <View style={styles.nav}>
        {navItems.map(({ key, label, icon: Icon }) => {
          const isActive = key === 'more' ? isMoreTabActive : activeTab === key;
          const color = isActive ? activeColor : inactiveColor;
          const opacity = isActive ? 1 : 0.7;

          return (
            <TouchableOpacity
              key={key}
              style={styles.navItem}
              onPress={() => onTabChange(key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon size={20} color={color} opacity={opacity} />
                {/* Notification dot for Chat icon when there are unread messages */}
                {key === 'chats' && hasUnreadMessages && activeTab !== 'chats' && (
                  <View style={styles.notificationDot} />
                )}
              </View>
              <Text style={[styles.label, { color }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    zIndex: 40,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    left: 6,
    width: 8,
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
});

