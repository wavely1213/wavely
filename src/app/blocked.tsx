import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Row = { blocked_id: string; created_at: string; nickname: string | null; avatar_url: string | null };

export default function BlockedScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data: blocks } = await supabase.from('blocks').select('blocked_id, created_at').eq('blocker_id', session.user.id).order('created_at', { ascending: false });
    const ids = (blocks ?? []).map((b: any) => b.blocked_id);
    const profs: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', ids);
      (ps ?? []).forEach((p: any) => { profs[p.id] = p; });
    }
    setList((blocks ?? []).map((b: any) => ({ blocked_id: b.blocked_id, created_at: b.created_at, nickname: profs[b.blocked_id]?.nickname ?? null, avatar_url: profs[b.blocked_id]?.avatar_url ?? null })));
    setLoading(false);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unblock = async (blockedId: string) => {
    if (!session) return;
    setBusyId(blockedId);
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', blockedId);
    setBusyId(null);
    if (!error) setList((prev) => prev.filter((r) => r.blocked_id !== blockedId));
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>차단 사용자 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      {!session ? (
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      ) : loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : list.length === 0 ? (
        <View style={styles.center}><Text style={{ fontSize: 36 }}>🤝</Text><Text style={{ color: c.textSecondary, marginTop: 8 }}>차단한 사용자가 없어요</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          <Text style={[styles.note, { color: c.textSecondary }]}>차단을 해제하면 다시 채팅 요청·소통이 가능해져요.</Text>
          {list.map((r) => (
            <View key={r.blocked_id} style={[styles.row, { borderColor: c.border }]}>
              <Avatar url={r.avatar_url} fallback="🙂" size={40} bg={c.primarySoft} />
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{r.nickname ?? '알 수 없는 사용자'}</Text>
              <Pressable style={[styles.unblockBtn, { borderColor: c.primary }]} onPress={() => unblock(r.blocked_id)} disabled={busyId === r.blocked_id}>
                <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>{busyId === r.blocked_id ? '...' : '차단 해제'}</Text>
              </Pressable>
            </View>
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
  note: { fontSize: 12, paddingHorizontal: 16, paddingBottom: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  name: { flex: 1, fontSize: 15, fontWeight: '700' },
  unblockBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
});
