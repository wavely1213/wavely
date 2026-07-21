import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Icon } from '@/components/Icon';
import { AuthProvider } from '@/lib/auth';
import { IS_UI_PREVIEW } from '@/constants/theme';
import { AppThemeProvider, useScheme } from '@/lib/theme';

function PreviewBar() {
  if (!IS_UI_PREVIEW) return null;
  const exit = () => {
    try {
      const w: any = globalThis as any;
      w.localStorage?.setItem('wavely-ui-preview', '0');
      w.location?.reload();
    } catch {}
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FF9F40', paddingVertical: 6, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="search" size={12.5} color="#3A2400" strokeWidth={2} />
        <Text style={{ color: '#3A2400', fontWeight: '900', fontSize: 12.5 }}>검수 모드 — 테스트(draft) 값 미리보기 중</Text>
      </View>
      <Pressable onPress={exit} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ color: '#3A2400', fontWeight: '900', fontSize: 11.5 }}>검수 종료</Text>
        <Icon name="x" size={11.5} color="#3A2400" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function RootNav() {
  const scheme = useScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <PreviewBar />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
            <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
            <Stack.Screen name="write" options={{ presentation: 'modal' }} />
            <Stack.Screen name="store-new" options={{ presentation: 'modal' }} />
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <RootNav />
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
