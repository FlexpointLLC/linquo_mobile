import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StatusBarNotificationProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
}

export const StatusBarNotification: React.FC<StatusBarNotificationProps> = ({ 
  message, 
  visible,
  onHide 
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto hide after 2 seconds
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onHide) onHide();
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, opacity, onHide]);

  if (!visible) return null;

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : top;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: statusBarHeight,
          opacity,
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#22c55e', // Green-500
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

