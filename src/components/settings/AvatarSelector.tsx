import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

interface AvatarSelectorProps {
  currentAvatarUrl: string | null;
  agentId: string;
  agentName: string;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
  isDarkMode: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  cardBg: string;
}

export function AvatarSelector({
  currentAvatarUrl,
  agentId,
  agentName,
  onAvatarUpdate,
  isDarkMode,
  textColor,
  mutedColor,
  borderColor,
  cardBg,
}: AvatarSelectorProps) {
  const [avatars, setAvatars] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAvatars();
  }, []);

  useEffect(() => {
    if (showDrawer) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showDrawer, slideAnim, fadeAnim]);

  const loadAvatars = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('brand')
        .list('avatars', {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('Error loading avatars:', error);
        return;
      }

      const avatarUrls = data
        .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        .map(file => {
          const { data: urlData } = supabase.storage
            .from('brand')
            .getPublicUrl(`avatars/${file.name}`);
          return urlData.publicUrl;
        });

      setAvatars(avatarUrls);
    } catch (error) {
      console.error('Error loading avatars:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('agents')
        .update({ avatar_url: avatarUrl })
        .eq('id', agentId);

      if (error) {
        console.error('Error updating avatar:', error);
        return;
      }

      onAvatarUpdate(avatarUrl);
      setShowDrawer(false);
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('agents')
        .update({ avatar_url: null })
        .eq('id', agentId);

      if (error) {
        console.error('Error removing avatar:', error);
        return;
      }

      onAvatarUpdate(null);
    } catch (error) {
      console.error('Error removing avatar:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(agentName);

  return (
    <View style={styles.container}>
      {/* Avatar Preview */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { borderColor }]}>
          {currentAvatarUrl ? (
            <Image
              source={{ uri: currentAvatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.initials, { color: mutedColor }]}>{initials}</Text>
          )}
        </View>
        {currentAvatarUrl && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveAvatar}
            disabled={updating}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Change Avatar Button */}
      <TouchableOpacity
        style={[styles.changeButton, { borderColor }]}
        onPress={() => setShowDrawer(true)}
        disabled={loading}
      >
        <Text style={[styles.changeButtonText, { color: textColor }]}>
          {loading ? 'Loading...' : 'Change'}
        </Text>
      </TouchableOpacity>

      {/* Avatar Selector Drawer */}
      <Modal
        visible={showDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowDrawer(false)}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => setShowDrawer(false)} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor: cardBg, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.drawerTitle, { color: textColor }]}>Choose an Avatar</Text>
              <TouchableOpacity onPress={() => setShowDrawer(false)}>
                <X size={24} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Avatar Grid */}
            <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={[styles.loadingText, { color: mutedColor }]}>Loading avatars...</Text>
                </View>
              ) : avatars.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: mutedColor }]}>No avatars available</Text>
                </View>
              ) : (
                <View style={styles.avatarGrid}>
                  {avatars.map((avatarUrl) => (
                    <TouchableOpacity
                      key={avatarUrl}
                      onPress={() => handleAvatarSelect(avatarUrl)}
                      disabled={updating}
                      style={[
                        styles.avatarOption,
                        {
                          borderColor: currentAvatarUrl === avatarUrl ? '#3b82f6' : borderColor,
                          borderWidth: currentAvatarUrl === avatarUrl ? 3 : 2,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.avatarOptionImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontSize: 18,
    fontWeight: '600',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 14,
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
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
});

