import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { UserCog, Settings, Code, ChevronRight } from 'lucide-react-native';

interface MoreScreenProps {
  onNavigate: (tab: 'agents' | 'settings' | 'installation') => void;
}

export default function MoreScreen({ onNavigate }: MoreScreenProps) {
  const { isDarkMode } = useTheme();

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const iconBg = isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)';

  const menuItems = [
    {
      id: 'agents' as const,
      icon: UserCog,
      title: 'Agents',
      description: 'Manage team members and permissions',
    },
    {
      id: 'settings' as const,
      icon: Settings,
      title: 'Settings',
      description: 'Manage your personal information and organization settings',
    },
    {
      id: 'installation' as const,
      icon: Code,
      title: 'Installation',
      description: 'Get the widget code for your website',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => onNavigate(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.menuCardContent}>
                  <View style={styles.leftContent}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                      <Icon size={20} color="#3b82f6" />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={[styles.menuTitle, { color: textColor }]}>{item.title}</Text>
                      <Text style={[styles.menuDescription, { color: mutedColor }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={mutedColor} style={styles.chevron} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  menuList: {
    gap: 12,
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 8,
  },
});

