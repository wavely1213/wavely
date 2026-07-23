import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Icon } from '@/components/Icon';
import { AuthProvider } from '@/lib/auth';
import { IS_UI_PREVIEW } from '@/constants/theme';
import { AppThemeProvider, useScheme } from '@/lib/theme';
import { resolveNotiRoute } from '@/lib/notiRoute';

// 푸시 알림 탭 → 딥링크 이동(네이티브 전용). 콜드스타트 + 백그라운드 탭 모두 처리, id로 중복이동 방지.
function usePushRouting() {
  const router = useRouter();
  const handled = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: any;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const go = (resp: any) => {
          const id = resp?.notification?.request?.identifier;
          if (id) { if (handled.current.has(id)) return; handled.current.add(id); }
          const route = resolveNotiRoute(resp?.notification?.request?.content?.data?.link);
          if (route) { try { router.push(route as any); } catch {} }
        };
        const last = await Notifications.getLastNotificationResponseAsync();   // 종료 상태서 푸시로 실행
        if (last) go(last);
        sub = Notifications.addNotificationResponseReceivedListener(go);       // 백그라운드서 탭
      } catch {}
    })();
    return () => { try { sub?.remove?.(); } catch {} };
  }, [router]);
}

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
  usePushRouting();
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
