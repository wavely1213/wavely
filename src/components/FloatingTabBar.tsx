import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Shadow, Radius } from '@/constants/theme';
import { Icon, IconName } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Meta = { label: string; icon: IconName };
const TABS: Record<string, Meta> = {
  index: { label: '커뮤니티', icon: 'home' },
  explore: { label: '우리동네', icon: 'map' },
  chats: { label: '채팅', icon: 'chat' },
  account: { label: '내정보', icon: 'user' },
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const scheme = useScheme();
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [unread, setUnread] = useState(0);

  // 안 읽은 채팅 수 — 탭 이동/로그인 변화 시 + 15초 주기 갱신
  useEffect(() => {
    let alive = true;
    const fetchUnread = () => {
      if (!session) { setUnread(0); return; }
      supabase.rpc('unread_chat_count').then(({ data }) => { if (alive) setUnread(typeof data === 'number' ? data : 0); });
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [session, state.index]);

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: c.card, borderColor: c.border }]}>
        {state.routes.map((route, i) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const active = state.index === i;
          const tint = active ? c.primary : c.textSecondary;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const showBadge = route.name === 'chats' && unread > 0;
          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.tab, active && { backgroundColor: c.primarySoft }]}>
              <View>
                <Icon name={meta.icon} size={22} color={tint} strokeWidth={active ? 2.3 : 2} />
                {showBadge ? (
                  <View style={styles.badge}><Text style={styles.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
                ) : null}
              </View>
              <Text style={[styles.label, { color: tint }]}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 7, paddingVertical: 7, borderRadius: Radius.tabbar, borderWidth: 1,
    boxShadow: Shadow.float, elevation: 8,
  },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22 },
  label: { fontSize: 12.5, fontWeight: '800' },
  badge: { position: 'absolute', top: -6, right: -9, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
});
