import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { APP_NAME, APP_TAGLINE } from '@/constants/app';

const BRAND = '#7C5CFC';

/**
 * 앱 첫 진입 시 보이는 부팅(스플래시) 화면.
 * 보라 배경 + 중앙 아이콘 + 이름 → 잠깐 보이고 부드럽게 사라집니다.
 */
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(iconOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true })
        .start(({ finished }) => { if (finished) setVisible(false); });
    }, 1500);
    return () => clearTimeout(t);
  }, [iconOpacity, iconScale, overlayOpacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <Animated.View style={{ alignItems: 'center', opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
        <Image source={require('@/assets/images/wavely-logo.png')} style={styles.icon} contentFit="contain" />
        <Text style={styles.name}>{APP_NAME}</Text>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// 호환용 (기존 import 유지)
export function AnimatedIcon() {
  return <Image source={require('@/assets/images/wavely-logo.png')} style={styles.icon} contentFit="contain" />;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  iconBox: { width: 104, height: 104, borderRadius: 28, overflow: 'hidden' },
  icon: { width: 110, height: 110, borderRadius: 28, boxShadow: '0 8px 24px rgba(0,0,0,0.28)' },
  name: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 18, letterSpacing: 1 },
  tagline: { color: '#ffffffcc', fontSize: 13, fontWeight: '600', marginTop: 6 },
});
