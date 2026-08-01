import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Txt';

export function Avatar({ url, fallback = '🙂', size = 40, bg = '#0EA5E9' }: { url?: string | null; fallback?: string; size?: number; bg?: string }) {
  const r = size / 3.2;
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />;
  }
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: bg }]}>
      <Text style={{ fontSize: size * 0.5 }}>{fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
