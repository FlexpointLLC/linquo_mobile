import React, { useRef, useEffect } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial value for opacity: 0

  useEffect(() => {
    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 1000, // 1 second fade in
        useNativeDriver: true,
      }
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          /> */}
        </Animated.View>
      </View>
      <Text style={styles.tagline}>
        Free Live Chat Support for Every Business
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  tagline: {
    fontSize: 11,
    color: '#ffffff',
    position: 'absolute',
    bottom: 24,
  },
});

