// 데스크톱 웹 3-Column 셸 (디자인 핸드오프 §1). width >= 1024 에서만 사용.
// 좌: Sidebar(232) / 센터: 자식(Tabs 화면) / 우: RightRail(320, >=1180에서만).
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { Assets, Colors, Radius } from '@/constants/theme';
import { StripBanner } from '@/components/StripBanner';

export const DESKTOP_MIN = 1024;
export const RAIL_MIN = 1180;

const NAV = [
  { key: 'index', label: '커뮤니티', icon: '🏠', path: '/' },
  { key: 'explore', label: '우리동네', icon: '📍', path: '/explore' },
  { key: 'chats', label: '채팅', icon: '💬', path: '/chats' },
  { key: 'account', label: '내정보', icon: '👤', path: '/account' },
] as const;

function activeKey(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/index')) return 'index';
  if (pathname.startsWith('/explore')) return 'explore';
  if (pathname.startsWith('/chats')) return 'chats';
  if (pathname.startsWith('/account')) return 'account';
  return 'index';
}

export function DesktopSidebar() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const { session, profile } = useAuth();
  const pathname = usePathname();
  const cur = activeKey(pathname);

  return (
    <View style={{ width: 232, borderRightWidth: 1, borderColor: c.border, backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 18, gap: 6 }}>
      {/* 로고 */}
      <Pressable onPress={() => router.navigate('/')} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 6, marginBottom: 6 }}>
        {Assets.logo ? <Image source={{ uri: Assets.logo }} style={{ width: 30, height: 30, borderRadius: 8 }} /> : <Text style={{ fontSize: 22 }}>🌊</Text>}
        <Text style={{ fontSize: 20, fontWeight: '900', color: c.primaryDeep }}>와벨리</Text>
      </Pressable>

      {/* 위치 */}
      <View style={{ paddingHorizontal: 8, paddingVertical: 8, borderRadius: Radius.list, backgroundColor: c.background, marginBottom: 4 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.text }}>강원 춘천시</Text>
        <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 1 }}>우리 동네 커뮤니티</Text>
      </View>

      {/* 네비 */}
      {NAV.map((n) => {
        const on = cur === n.key;
        return (
          <Pressable key={n.key} onPress={() => router.navigate(n.path as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 11, borderRadius: Radius.list, backgroundColor: on ? c.primarySoft : 'transparent' }}>
            <Text style={{ fontSize: 17, opacity: on ? 1 : 0.7 }}>{n.icon}</Text>
            <Text style={{ fontSize: 14.5, fontWeight: on ? '800' : '600', color: on ? c.primaryDeep : c.text }}>{n.label}</Text>
          </Pressable>
        );
      })}

      {/* 글쓰기 */}
      <Pressable onPress={() => router.push(session ? '/write' : '/login')} style={{ marginTop: 8, backgroundColor: c.primary, borderRadius: Radius.button, paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 14.5 }}>✏️ 글쓰기</Text>
      </Pressable>

      {/* 사장님 센터 (다크 카드 → 광고/분석) */}
      <Pressable onPress={() => router.push(session ? '/place-rank' : '/login')} style={{ marginTop: 10, backgroundColor: '#1C1930', borderRadius: Radius.card, padding: 13 }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13.5 }}>📈 사장님 센터</Text>
        <Text style={{ color: '#C4B5FD', fontSize: 11, marginTop: 3, lineHeight: 16 }}>광고 집행 · 플레이스 분석 · N지수</Text>
      </Pressable>

      <View style={{ flex: 1 }} />

      {/* 유저 미니 */}
      {session ? (
        <Pressable onPress={() => router.navigate('/account')} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 6, paddingVertical: 8, borderTopWidth: 1, borderColor: c.border }}>
          <View style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={{ width: 30, height: 30 }} /> : <Text>🙂</Text>}
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }} numberOfLines={1}>{profile?.nickname ?? '회원'}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => router.push('/login')} style={{ borderTopWidth: 1, borderColor: c.border, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13.5 }}>로그인 / 가입</Text>
        </Pressable>
      )}
    </View>
  );
}

export function DesktopRightRail() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const { session } = useAuth();
  return (
    <View style={{ width: 320, borderLeftWidth: 1, borderColor: c.border, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* 광고 */}
        <StripBanner scheme={scheme} />

        {/* 인기글 */}
        <Pressable onPress={() => router.push('/hot')} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: Radius.card, padding: 14 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '900', color: c.text }}>🔥 지금 인기글</Text>
          <Text style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 4 }}>우리 동네에서 가장 뜨거운 이야기</Text>
          <Text style={{ fontSize: 12, color: c.primaryDeep, fontWeight: '800', marginTop: 8 }}>인기글 보기 ›</Text>
        </Pressable>

        {/* 사장님 CTA */}
        {!session && (
          <Pressable onPress={() => router.push('/login')} style={{ backgroundColor: c.primarySoft, borderRadius: Radius.card, padding: 14 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '900', color: c.primaryDeep }}>우리 동네, 전부 보기</Text>
            <Text style={{ fontSize: 11.5, color: c.primaryDeep, marginTop: 4, lineHeight: 16 }}>로그인하면 모든 글·매장·채팅을 이용할 수 있어요</Text>
          </Pressable>
        )}

        <Text style={{ fontSize: 10.5, color: c.textSecondary, paddingHorizontal: 4, lineHeight: 16 }}>와벨리 · 춘천 동네 커뮤니티{'\n'}© 2026 Wavely</Text>
      </ScrollView>
    </View>
  );
}
