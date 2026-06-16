import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: '신규', color: '#E5484D' },
  reviewing: { label: '확인중', color: '#FF9F40' },
  resolved: { label: '조치완료', color: '#11B981' },
  dismissed: { label: '반려', color: '#8A94A6' },
};
const TYPE_LABEL: Record<string, string> = { post: '게시글', comment: '댓글', review: '리뷰', store: '매장', place: '장소', user: '사용자', market: '중고거래 글', job: '구인구직 글' };

type Rp = { id: string; target_type: string; target_id: string; target_label: string | null; reason: string; detail: string | null; status: string; reporter_nick: string | null; created_at: string };

export default function ReportsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [list, setList] = useState<Rp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open'>('open');

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    const { data } = await supabase.from('reports').select('id,target_type,target_id,target_label,reason,detail,status,reporter_nick,created_at').order('created_at', { ascending: false }).limit(200);
    setList((data as Rp[]) ?? []);
    setLoading(false);
  }, [isAdmin]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (id: string, status: string) => { await supabase.from('reports').update({ status }).eq('id', id); load(); };

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: c.border }]}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
          <Text style={[styles.title, { color: c.text }]}>신고 관리</Text><View style={{ width: 40 }} />
        </View>
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>관리자만 볼 수 있어요</Text></View>
      </SafeAreaView>
    );
  }

  const shown = filter === 'open' ? list.filter((r) => r.status === 'new' || r.status === 'reviewing') : list;
  const newCount = list.filter((r) => r.status === 'new').length;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.title, { color: c.text }]}>🚩 신고 관리 {newCount > 0 ? `(${newCount})` : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        {(['open', 'all'] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.fBtn, { backgroundColor: filter === f ? c.primary : c.card, borderColor: filter === f ? c.primary : c.border }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: filter === f ? c.onPrimary : c.textSecondary }}>{f === 'open' ? '처리 대기' : '전체'}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {shown.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>{filter === 'open' ? '처리할 신고가 없어요 👍' : '신고 내역이 없어요'}</Text>
          ) : (
            shown.map((r) => {
              const st = STATUS[r.status] ?? STATUS.new;
              return (
                <View key={r.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.typeTag, { backgroundColor: c.primarySoft }]}><Text style={[styles.typeTxt, { color: c.primaryDeep }]}>{TYPE_LABEL[r.target_type] ?? r.target_type}</Text></View>
                    <Text style={[styles.reason, { color: c.text }]}>{r.reason}</Text>
                    <View style={{ flex: 1 }} />
                    <View style={[styles.statusTag, { backgroundColor: st.color }]}><Text style={styles.statusTxt}>{st.label}</Text></View>
                  </View>
                  {r.target_label ? <Text style={[styles.tgt, { color: c.textSecondary }]} numberOfLines={1}>대상: {r.target_label}</Text> : null}
                  {r.detail ? <Text style={[styles.detail, { color: c.text }]}>{r.detail}</Text> : null}
                  <Text style={[styles.by, { color: c.textSecondary }]}>신고자: {r.reporter_nick ?? '회원'}</Text>
                  <View style={styles.statusRow}>
                    {Object.keys(STATUS).map((k) => (
                      <Pressable key={k} onPress={() => setStatus(r.id, k)} style={[styles.stBtn, { borderColor: r.status === k ? STATUS[k].color : c.border, backgroundColor: r.status === k ? STATUS[k].color : 'transparent' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: r.status === k ? '#fff' : c.textSecondary }}>{STATUS[k].label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  fBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  empty: { fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeTxt: { fontSize: 11, fontWeight: '800' },
  reason: { fontSize: 14, fontWeight: '800' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  tgt: { fontSize: 12, marginTop: 7 },
  detail: { fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  by: { fontSize: 11, marginTop: 7 },
  statusRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 10 },
  stBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1 },
});
