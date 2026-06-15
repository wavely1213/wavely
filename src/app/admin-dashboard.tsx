import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Stats = {
  users: number; owners: number; stores: number; posts: number;
  ads_review: number; ads_active: number; ads_paused: number;
  revenue_total: number; revenue_month: number;
};
type Ad = { id: string; store_id: string; format: string; monthly_fee: number; bid_amount: number; status: string; banner_image: string | null; headline: string | null; ends_at: string | null; stores: { name: string } | null };

export default function AdminDashboardScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [stats, setStats] = useState<Stats | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.rpc('admin_dashboard'),
      supabase.from('ads').select('id,store_id,format,monthly_fee,bid_amount,status,banner_image,headline,ends_at,stores(name)').in('status', ['under_review', 'active', 'paused']).order('created_at', { ascending: false }),
    ]);
    if (s && !(s as any).error) setStats(s as Stats);
    setAds((a as any[]) ?? []);
    setLoading(false);
  }, [isAdmin]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (fn: () => Promise<any>, id: string) => { setBusyId(id); await fn(); setBusyId(null); load(); };
  const approve = (id: string) => act(() => supabase.functions.invoke('ad-activate', { body: { ad_id: id, days: 30 } }), id);
  const reject = (id: string) => act(() => supabase.rpc('admin_reject_ad', { target: id }), id);
  const pause = (id: string) => act(() => supabase.rpc('admin_pause_ad', { target: id }), id);
  const resume = (id: string) => act(() => supabase.rpc('admin_resume_ad', { target: id }), id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/account'));
  const won = (n: number) => `${(n ?? 0).toLocaleString()}원`;

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <Header c={c} onBack={goBack} />
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>관리자만 볼 수 있어요</Text></View>
      </SafeAreaView>
    );
  }

  const review = ads.filter((a) => a.status === 'under_review');
  const active = ads.filter((a) => a.status === 'active');
  const paused = ads.filter((a) => a.status === 'paused');
  const metaTxt = (a: Ad) => (a.format === 'banner' ? `🖼 배너 · 월 ${won(a.monthly_fee)}` : `📈 입찰 ${won(a.bid_amount)}/클릭`);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <Header c={c} onBack={goBack} />
      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* 통계 */}
          <View style={styles.grid}>
            <Stat c={c} label="회원" value={stats?.users ?? 0} />
            <Stat c={c} label="사장님" value={stats?.owners ?? 0} />
            <Stat c={c} label="매장" value={stats?.stores ?? 0} />
            <Stat c={c} label="게시글" value={stats?.posts ?? 0} />
            <Stat c={c} label="노출중 광고" value={stats?.ads_active ?? 0} highlight />
            <Stat c={c} label="검토 대기" value={stats?.ads_review ?? 0} highlight />
          </View>
          <View style={[styles.revBox, { backgroundColor: c.primarySoft }]}>
            <View style={{ flex: 1 }}><Text style={[styles.revLabel, { color: c.primaryDeep }]}>이번 달 매출</Text><Text style={[styles.revVal, { color: c.primaryDeep }]}>{won(stats?.revenue_month ?? 0)}</Text></View>
            <View style={{ flex: 1 }}><Text style={[styles.revLabel, { color: c.primaryDeep }]}>누적 매출</Text><Text style={[styles.revVal, { color: c.primaryDeep }]}>{won(stats?.revenue_total ?? 0)}</Text></View>
          </View>

          {/* 바로가기 */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Pressable style={[styles.linkBtn, { borderColor: c.border }]} onPress={() => router.push('/admin-biz')}><Text style={[styles.linkTxt, { color: c.text }]}>📄 사업자 검토</Text></Pressable>
            <Pressable style={[styles.linkBtn, { borderColor: c.border }]} onPress={() => router.push('/reports')}><Text style={[styles.linkTxt, { color: c.text }]}>🚩 신고 관리</Text></Pressable>
          </View>

          {/* 검토 대기 */}
          <Text style={[styles.sect, { color: c.text }]}>🕒 검토 대기 {review.length > 0 ? `· ${review.length}` : ''}</Text>
          {review.length === 0 ? <Text style={[styles.empty, { color: c.textSecondary }]}>검토할 광고가 없어요</Text> : review.map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.name, { color: c.text }]}>{a.stores?.name ?? a.store_id}</Text>
              <Text style={[styles.meta, { color: c.textSecondary }]}>{metaTxt(a)} (결제완료)</Text>
              {a.banner_image ? <Image source={{ uri: a.banner_image }} style={styles.img} contentFit="cover" transition={150} /> : null}
              {a.headline ? <Text style={[styles.headline, { color: c.text }]}>“{a.headline}”</Text> : null}
              <View style={styles.btnRow}>
                <Pressable style={[styles.btn, { backgroundColor: c.verify }]} disabled={busyId === a.id} onPress={() => approve(a.id)}><Text style={styles.btnW}>✅ 승인 (노출)</Text></Pressable>
                <Pressable style={[styles.btn, { borderColor: '#E5484D', borderWidth: 1.5 }]} disabled={busyId === a.id} onPress={() => reject(a.id)}><Text style={[styles.btnR]}>반려</Text></Pressable>
              </View>
            </View>
          ))}

          {/* 노출중 */}
          <Text style={[styles.sect, { color: c.text }]}>📢 노출중 {active.length > 0 ? `· ${active.length}` : ''}</Text>
          {active.length === 0 ? <Text style={[styles.empty, { color: c.textSecondary }]}>노출중인 광고가 없어요</Text> : active.map((a) => (
            <View key={a.id} style={[styles.rowCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: c.text }]}>{a.stores?.name ?? a.store_id}</Text>
                <Text style={[styles.meta, { color: c.textSecondary }]}>{metaTxt(a)}{a.ends_at ? ` · ~${a.ends_at.slice(0, 10)}` : ''}</Text>
              </View>
              <Pressable style={[styles.smallBtn, { borderColor: '#FF9F40', borderWidth: 1.5 }]} disabled={busyId === a.id} onPress={() => pause(a.id)}><Text style={{ color: '#FF9F40', fontWeight: '800', fontSize: 12 }}>⏸ 비활성화</Text></Pressable>
            </View>
          ))}

          {/* 일시정지 */}
          {paused.length > 0 && (
            <>
              <Text style={[styles.sect, { color: c.text }]}>⏸ 일시정지 · {paused.length}</Text>
              {paused.map((a) => (
                <View key={a.id} style={[styles.rowCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: c.text }]}>{a.stores?.name ?? a.store_id}</Text>
                    <Text style={[styles.meta, { color: c.textSecondary }]}>{metaTxt(a)}</Text>
                  </View>
                  <Pressable style={[styles.smallBtn, { backgroundColor: c.primary }]} disabled={busyId === a.id} onPress={() => resume(a.id)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12 }}>▶ 재개</Text></Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ c, label, value, highlight }: { c: any; label: string; value: number; highlight?: boolean }) {
  return (
    <View style={[styles.statCard, { backgroundColor: highlight ? c.primarySoft : c.card, borderColor: highlight ? c.primary : c.border }]}>
      <Text style={[styles.statVal, { color: highlight ? c.primaryDeep : c.text }]}>{(value ?? 0).toLocaleString()}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Header({ c, onBack }: { c: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      <Text style={[styles.hTitle, { color: c.text }]}>📊 관리자 대시보드</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '31.5%', flexGrow: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  revBox: { flexDirection: 'row', borderRadius: 12, padding: 14, marginTop: 10 },
  revLabel: { fontSize: 12, fontWeight: '700' },
  revVal: { fontSize: 18, fontWeight: '900', marginTop: 2 },
  linkBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  linkTxt: { fontSize: 13, fontWeight: '800' },
  sect: { fontSize: 15, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  empty: { fontSize: 13, paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 2 },
  img: { width: '100%', height: 130, borderRadius: 10, marginTop: 10, backgroundColor: '#0002' },
  headline: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  btnW: { color: '#fff', fontWeight: '800' },
  btnR: { color: '#E5484D', fontWeight: '800' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9 },
});
