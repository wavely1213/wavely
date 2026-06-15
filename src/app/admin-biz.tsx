import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Pending = { id: string; nickname: string; biz_rep_name: string | null; biz_open_dt: string | null; biz_no: string | null; biz_cert_url: string; signed?: string | null };

function fmtDt(d: string | null) {
  if (!d || d.length !== 8) return d ?? '-';
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
}
function fmtNo(n: string | null) {
  if (!n || n.length !== 10) return n ?? '-';
  return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}`;
}

export default function AdminBizScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [list, setList] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    const { data } = await supabase.rpc('admin_pending_biz');
    const rows = (data as Pending[]) ?? [];
    // 등록증 서명 URL 발급
    const withUrls = await Promise.all(rows.map(async (r) => {
      const { data: s } = await supabase.storage.from('biz-docs').createSignedUrl(r.biz_cert_url, 600);
      return { ...r, signed: s?.signedUrl ?? null };
    }));
    setList(withUrls);
    setLoading(false);
  }, [isAdmin]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const review = async (id: string, approve: boolean) => {
    await supabase.rpc('admin_biz_review', { target: id, approve });
    load();
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: c.border }]}><Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable><Text style={[styles.hTitle, { color: c.text }]}>사업자 검토</Text><View style={{ width: 40 }} /></View>
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>관리자만 볼 수 있어요</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>📄 사업자 검토 {list.length > 0 ? `(${list.length})` : ''}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : list.length === 0 ? (
        <View style={styles.center}><Text style={{ fontSize: 36 }}>✅</Text><Text style={{ color: c.textSecondary, marginTop: 8 }}>검토할 사업자등록증이 없어요</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[styles.note, { color: c.textSecondary }]}>자동 인증이 안 된 건이에요. 등록증을 보고 직접 승인/반려해주세요.</Text>
          {list.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.nick, { color: c.text }]}>{p.nickname}</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: c.textSecondary }]}>OCR 추출</Text>
                <Text style={[styles.infoVal, { color: c.text }]}>번호 {fmtNo(p.biz_no)} · 대표 {p.biz_rep_name ?? '-'} · 개업 {fmtDt(p.biz_open_dt)}</Text>
              </View>
              {p.signed ? (
                <Image source={{ uri: p.signed }} style={styles.certImg} contentFit="contain" />
              ) : (
                <View style={[styles.certImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.backgroundElement }]}><Text style={{ color: c.textSecondary }}>등록증 불러오기 실패</Text></View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable style={[styles.approve, { backgroundColor: c.verify }]} onPress={() => review(p.id, true)}><Text style={{ color: '#fff', fontWeight: '800' }}>✅ 승인</Text></Pressable>
                <Pressable style={[styles.reject, { borderColor: '#E5484D' }]} onPress={() => review(p.id, false)}><Text style={{ color: '#E5484D', fontWeight: '800' }}>반려</Text></Pressable>
              </View>
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
  note: { fontSize: 12.5, marginBottom: 12, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  nick: { fontSize: 16, fontWeight: '800' },
  infoRow: { marginTop: 8, marginBottom: 10 },
  infoLabel: { fontSize: 11, fontWeight: '700' },
  infoVal: { fontSize: 13, fontWeight: '600', marginTop: 3, lineHeight: 19 },
  certImg: { width: '100%', height: 240, borderRadius: 10, backgroundColor: '#0003' },
  approve: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center' },
  reject: { flex: 1, paddingVertical: 13, borderRadius: 11, alignItems: 'center', borderWidth: 1.5 },
});
