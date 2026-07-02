import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function ago(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function NotificationsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100);
    setItems((data as any[]) ?? []);
    setLoading(false);
    // 열면 전체 읽음 처리
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const open = (n: any) => {
    // 서버/DB에서 온 링크는 신뢰하지 않고 내부 경로(/로 시작)만 허용 — 잘못된 값으로 인한 크래시 방지
    if (typeof n?.link === 'string' && n.link.startsWith('/')) {
      try { router.push(n.link as any); } catch {}
    }
  };
  const clearAll = async () => { if (session) { await supabase.from('notifications').delete().eq('user_id', session.user.id); load(); } };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="bell" size={16} color={c.text} strokeWidth={2} />
          <Text style={[styles.hTitle, { color: c.text }]}>알림</Text>
        </View>
        {items.length > 0 ? <Pressable onPress={clearAll} hitSlop={8}><Text style={{ color: c.textSecondary, fontSize: 12.5, fontWeight: '700' }}>모두 지우기</Text></Pressable> : <View style={{ width: 40 }} />}
      </View>

      {session ? (
        <Pressable onPress={() => router.push('/keywords')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.primarySoft, paddingHorizontal: 16, paddingVertical: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="bell" size={16} color={c.primaryDeep} strokeWidth={2} />
            <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 13.5 }}>키워드 알림 설정</Text>
          </View>
          <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 16 }}>›</Text>
        </Pressable>
      ) : null}

      {!session ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      ) : loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <View style={styles.center}><Icon name="bell" size={36} color={c.textSecondary} strokeWidth={2} /><Text style={{ color: c.textSecondary, marginTop: 8 }}>새 알림이 없어요</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {items.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)} style={[styles.row, { borderColor: c.border, backgroundColor: n.read ? 'transparent' : c.primarySoft }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.text }]}>{n.title}</Text>
                {n.body ? <Text style={[styles.body, { color: c.textSecondary }]} numberOfLines={1}>{n.body}</Text> : null}
              </View>
              <Text style={[styles.time, { color: c.textSecondary }]}>{ago(n.created_at)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 14.5, fontWeight: '700' },
  body: { fontSize: 13, marginTop: 3 },
  time: { fontSize: 11 },
});
