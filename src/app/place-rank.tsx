import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Store = { id: string; name: string; category: string | null; address: string | null; naver_place_id: string | null; biz_verified: boolean };
type Snap = { keyword: string; rank: number | null; save_count: number | null; visitor_review: number | null; blog_review: number | null; snap_date: string };
type Analysis = { n1: number | null; n2: number | null; n3: number | null; save_count: number | null; visitor_review: number | null; blog_review: number | null; analyzed_at: string };

const UP = '#E5484D';   // 상승(▲) — 빨강 (플레이스 분석 관행)
const DOWN = '#3B82F6'; // 하락(▼) — 파랑

export default function PlaceRankScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [selStore, setSelStore] = useState<string>('');
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [placeIdInput, setPlaceIdInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const loadStore = useCallback(async (sid: string) => {
    // 테이블 미생성(07·08 SQL 미적용) 시에도 안전하게 빈 배열 처리
    const { data: r } = await supabase.from('place_rankings').select('keyword,rank,save_count,visitor_review,blog_review,snap_date').eq('store_id', sid).order('snap_date', { ascending: false });
    setSnaps((r as Snap[]) ?? []);
    const { data: a } = await supabase.from('place_analysis').select('n1,n2,n3,save_count,visitor_review,blog_review,analyzed_at').eq('store_id', sid).order('analyzed_at', { ascending: false }).limit(1);
    setAnalysis(((a as Analysis[]) ?? [])[0] ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data: st } = await supabase.from('stores').select('id,name,category,address,naver_place_id,biz_verified').eq('owner_id', session.user.id);
    const owned = ((st as Store[]) ?? []).filter((s) => s.biz_verified);
    setStores(owned);
    if (owned.length) {
      const sid = owned.some((s) => s.id === selStore) ? selStore : owned[0].id;
      setSelStore(sid);
      setPlaceIdInput(owned.find((s) => s.id === sid)?.naver_place_id ?? '');
      await loadStore(sid);
    }
    setLoading(false);
  }, [session, selStore, loadStore]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickStore = (sid: string) => {
    setSelStore(sid);
    setPlaceIdInput(stores.find((s) => s.id === sid)?.naver_place_id ?? '');
    setMsg('');
    loadStore(sid);
  };

  const savePlaceId = async () => {
    const v = placeIdInput.trim();
    if (!/^\d{5,}$/.test(v)) { setMsg('네이버 플레이스 ID(숫자)를 정확히 입력해주세요. 예: 2006014171'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.from('stores').update({ naver_place_id: v }).eq('id', selStore);
    setBusy(false);
    if (error) { setMsg('저장 실패: ' + error.message); return; }
    setMsg('✅ 네이버 매장이 연결됐어요. [분석 시작]을 누르면 노출 키워드 전체를 분석해드려요.');
    setStores((arr) => arr.map((s) => (s.id === selStore ? { ...s, naver_place_id: v } : s)));
  };

  // 온디맨드 분석: 요청 큐 적재 → 수집 서버 처리 완료까지 폴링
  const pollAnalysis = useCallback(async (reqId: string, tries: number) => {
    if (!aliveRef.current) return;
    if (tries > 40) { setAnalyzing(false); setMsg('지금 분석 서버가 응답하지 않아요. 잠시 후 다시 시도해주세요.'); return; }
    const { data } = await supabase.from('place_analysis_requests').select('status,error').eq('id', reqId).single();
    const st = (data as any)?.status;
    if (st === 'done') { if (!aliveRef.current) return; setAnalyzing(false); setMsg('✅ 분석이 완료됐어요!'); loadStore(selStore); return; }
    if (st === 'failed') { if (!aliveRef.current) return; setAnalyzing(false); setMsg('분석 실패: ' + ((data as any)?.error ?? '잠시 후 다시 시도해주세요')); return; }
    setTimeout(() => pollAnalysis(reqId, tries + 1), 3000);
  }, [selStore, loadStore]);

  const requestAnalysis = async () => {
    if (analyzing) return;
    setAnalyzing(true); setMsg('');
    const { data, error } = await supabase.from('place_analysis_requests').insert({ store_id: selStore, requested_by: session!.user.id }).select('id').single();
    if (error || !data) { setAnalyzing(false); setMsg('분석 요청 실패: ' + (error?.message ?? '잠시 후 다시 시도')); return; }
    setMsg('🔄 분석을 시작했어요. 노출 키워드 전체를 수집·분석 중이에요… (최대 1~2분)');
    pollAnalysis((data as any).id, 0);
  };

  // 키워드별 최신 + 직전(추이)
  const latestByKw = (kw: string) => { const rows = snaps.filter((s) => s.keyword === kw); return { latest: rows[0] ?? null, prev: rows[1] ?? null }; };
  const keywords = Array.from(new Set(snaps.map((s) => s.keyword)));
  const kwRows = keywords.map((kw) => {
    const { latest, prev } = latestByKw(kw);
    const delta = latest?.rank != null && prev?.rank != null ? prev.rank - latest.rank : null; // +면 상승
    return { kw, rank: latest?.rank ?? null, delta };
  }).sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

  const total = kwRows.length;
  const top3 = kwRows.filter((r) => r.rank != null && r.rank <= 3).length;
  const top10 = kwRows.filter((r) => r.rank != null && r.rank <= 10).length;
  const rising = kwRows.filter((r) => r.delta != null && r.delta > 0).length;
  const falling = kwRows.filter((r) => r.delta != null && r.delta < 0).length;
  const metric = analysis ?? (snaps[0] as any) ?? null; // 저장수·리뷰: 분석결과 우선, 없으면 최신 스냅
  const lastDate = snaps[0]?.snap_date ?? null;
  const hasData = snaps.length > 0;

  const curStore = stores.find((s) => s.id === selStore);
  const placeIdSet = !!curStore?.naver_place_id;

  if (loading) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>📈 플레이스 분석</Text>
        <View style={{ width: 40 }} />
      </View>

      {stores.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 42, marginBottom: 8 }}>🔒</Text>
          <Text style={{ color: c.text, fontWeight: '800', fontSize: 15, textAlign: 'center' }}>플레이스 분석은 인증 매장 사장님 전용이에요</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>내 매장의 네이버 플레이스 순위를 키워드별로{'\n'}분석해드려요. 사업주 인증 후 이용할 수 있어요.</Text>
          <Pressable onPress={() => router.push('/account-edit?biz=1')} style={[styles.cta, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>🔓 사업주 인증하고 이용하기</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* 매장 선택 (여러 개일 때) */}
          {stores.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
              {stores.map((s) => {
                const on = s.id === selStore;
                return <Pressable key={s.id} onPress={() => pickStore(s.id)} style={[styles.storeChip, { backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}><Text style={{ color: on ? c.onPrimary : c.text, fontWeight: '700', fontSize: 13 }}>{s.name}</Text></Pressable>;
              })}
            </ScrollView>
          )}

          {/* 내 매장 + 분석 시작 */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0, flex: 1 }]}>🏪 {curStore?.name ?? '내 매장'}</Text>
              {placeIdSet ? <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>네이버 연결됨 ✅</Text> : null}
            </View>

            {placeIdSet ? (
              <Pressable onPress={requestAnalysis} disabled={analyzing} style={[styles.analyzeBtn, { backgroundColor: c.primary, opacity: analyzing ? 0.7 : 1 }]}>
                {analyzing ? <ActivityIndicator color={c.onPrimary} size="small" /> : null}
                <Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 14.5 }}>{analyzing ? '  수집·분석 중…' : '🔍 분석 시작'}</Text>
              </Pressable>
            ) : (
              <>
                <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 8, lineHeight: 17 }}>내 매장의 네이버 플레이스를 한 번만 연결하면 자동으로 저장돼요. 네이버 지도에서 내 매장 URL의 숫자가 ID예요. (예: …/place/<Text style={{ fontWeight: '800', color: c.text }}>2006014171</Text>) 키워드는 따로 안 정해도 노출 키워드 전체를 자동으로 분석해드려요.</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="플레이스 ID (숫자)" placeholderTextColor={c.textSecondary} value={placeIdInput} onChangeText={setPlaceIdInput} keyboardType="number-pad" />
                  <Pressable onPress={savePlaceId} disabled={busy} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>연결</Text></Pressable>
                </View>
              </>
            )}
          </View>

          {msg ? <Pressable onPress={() => setMsg('')} style={{ marginBottom: 12 }}><Text style={{ color: msg.startsWith('✅') || msg.startsWith('🔄') ? c.primary : '#E5484D', fontWeight: '700', fontSize: 13, lineHeight: 18 }}>{msg}</Text></Pressable> : null}

          {placeIdSet && !hasData ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>아직 분석 결과가 없어요. 위 [🔍 분석 시작]을 누르면 노출 키워드 전체를 찾아 순위·N지수·저장·리뷰까지 분석해드려요. (분석에는 1~2분 걸려요)</Text>
            </View>
          ) : null}

          {hasData ? (
            <>
              {/* 요약 카운트 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row' }]}>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{total}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>총 키워드</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep }]}>{top3}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>TOP 3</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primary }]}>{top10}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>TOP 10</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: UP }]}>{rising}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>상승</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: DOWN }]}>{falling}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>하락</Text></View>
              </View>

              {/* 플레이스 지수 + 지표 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>플레이스 지수</Text>
                <View style={styles.statRow}>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 16 }]}>{analysis?.n1 ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N1 지수</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 16 }]}>{analysis?.n2 ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N2 지수</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 16 }]}>{analysis?.n3 ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N3 지수</Text></View>
                </View>
                <View style={[styles.statRow, { marginTop: 12 }]}>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.save_count ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>저장수</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.visitor_review ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>방문리뷰</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.blog_review ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>블로그</Text></View>
                </View>
                {lastDate ? <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 12, textAlign: 'right' }}>최근 분석 {analysis ? String(analysis.analyzed_at).slice(0, 16).replace('T', ' ') : lastDate}</Text> : null}
              </View>

              {/* 기본정보 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>기본정보</Text>
                <InfoRow c={c} label="플레이스명" value={curStore?.name ?? '-'} />
                <InfoRow c={c} label="카테고리" value={curStore?.category ?? '-'} />
                <InfoRow c={c} label="주소지" value={curStore?.address ?? '-'} />
                <InfoRow c={c} label="플레이스 ID" value={curStore?.naver_place_id ?? '-'} last />
              </View>

              {/* 키워드 순위 목록 */}
              <Text style={[styles.sectionTitle, { color: c.text }]}>키워드 순위 ({total})</Text>
              {kwRows.map((r) => (
                <View key={r.kw} style={[styles.kwRow, { borderColor: c.border }]}>
                  <View style={[styles.rankPill, { backgroundColor: r.rank != null && r.rank <= 3 ? c.primary : r.rank != null && r.rank <= 10 ? c.primarySoft : c.backgroundElement ?? c.background }]}>
                    <Text style={{ color: r.rank != null && r.rank <= 3 ? c.onPrimary : r.rank != null && r.rank <= 10 ? c.primaryDeep : c.textSecondary, fontWeight: '800', fontSize: 12.5 }}>{r.rank != null ? `${r.rank}위` : '권외'}</Text>
                  </View>
                  <Text style={{ color: c.text, fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>{r.kw}</Text>
                  {r.delta != null && r.delta !== 0 ? (
                    <Text style={{ color: r.delta > 0 ? UP : DOWN, fontWeight: '800', fontSize: 13 }}>{r.delta > 0 ? `▲${r.delta}` : `▼${-r.delta}`}</Text>
                  ) : <Text style={{ color: c.textSecondary, fontSize: 13 }}>-</Text>}
                </View>
              ))}
            </>
          ) : null}

          {/* 다른 매장 분석 (경쟁사) — 개발 중 */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 22 }]}>다른 매장 분석</Text>
          <View style={[styles.card, { backgroundColor: c.backgroundElement ?? c.card, borderColor: c.border, marginTop: 8, alignItems: 'center', paddingVertical: 22 }]}>
            <Text style={{ fontSize: 26 }}>🚧</Text>
            <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, marginTop: 8 }}>개발 중이에요</Text>
            <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>경쟁 매장·관심 매장의 순위 분석 기능을{'\n'}준비하고 있어요. 지금은 내 인증 매장만 분석돼요.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ c, label, value, last }: { c: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderColor: c.border }}>
      <Text style={{ color: c.textSecondary, fontSize: 13, width: 90 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 13, flex: 1, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  cta: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  storeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  smallBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  statRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  kwRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1 },
  rankPill: { minWidth: 44, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
});
