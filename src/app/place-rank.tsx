import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Store = { id: string; name: string; naver_place_id: string | null; biz_verified: boolean };
type Kw = { id: string; keyword: string };
type Snap = { keyword: string; rank: number | null; save_count: number | null; visitor_review: number | null; blog_review: number | null; snap_date: string };

const MAX_KW = 5;

export default function PlaceRankScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [selStore, setSelStore] = useState<string>('');
  const [kws, setKws] = useState<Kw[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeIdInput, setPlaceIdInput] = useState('');
  const [newKw, setNewKw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStore = useCallback(async (sid: string) => {
    // 테이블 미생성(07_place_rank.sql 미적용) 시에도 안전하게 빈 배열 처리
    const { data: k } = await supabase.from('place_rank_keywords').select('id,keyword').eq('store_id', sid).order('created_at');
    setKws((k as Kw[]) ?? []);
    const { data: r } = await supabase.from('place_rankings').select('keyword,rank,save_count,visitor_review,blog_review,snap_date').eq('store_id', sid).order('snap_date', { ascending: false });
    setSnaps((r as Snap[]) ?? []);
  }, []);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data: st } = await supabase.from('stores').select('id,name,naver_place_id,biz_verified').eq('owner_id', session.user.id);
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
    setMsg('✅ 네이버 매장이 연결됐어요. 내일 새벽부터 순위가 수집돼요.');
    setStores((arr) => arr.map((s) => (s.id === selStore ? { ...s, naver_place_id: v } : s)));
  };

  const addKw = async () => {
    const v = newKw.trim();
    if (!v) return;
    if (kws.length >= MAX_KW) { setMsg(`키워드는 매장당 최대 ${MAX_KW}개까지예요.`); return; }
    if (kws.some((k) => k.keyword.toLowerCase() === v.toLowerCase())) { setMsg('이미 등록한 키워드예요.'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.from('place_rank_keywords').insert({ store_id: selStore, keyword: v });
    setBusy(false);
    if (error) { setMsg('등록 실패: ' + error.message); return; }
    setNewKw('');
    loadStore(selStore);
  };

  const delKw = async (id: string) => {
    await supabase.from('place_rank_keywords').delete().eq('id', id);
    loadStore(selStore);
  };

  // 키워드별 최신 + 직전 스냅(추이 화살표)
  const byKeyword = (kw: string) => {
    const rows = snaps.filter((s) => s.keyword === kw); // 이미 snap_date desc 정렬
    return { latest: rows[0] ?? null, prev: rows[1] ?? null };
  };
  const placeIdSet = !!stores.find((s) => s.id === selStore)?.naver_place_id;

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
          <Text style={{ color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>내 매장의 네이버 플레이스 순위를 키워드별로{'\n'}매일 추적해드려요. 사업주 인증 후 이용할 수 있어요.</Text>
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

          {/* 네이버 연결 */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>네이버 플레이스 연결 {placeIdSet ? '✅' : ''}</Text>
            <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 8, lineHeight: 17 }}>네이버 지도에서 내 매장을 열면 주소 URL에 있는 숫자가 플레이스 ID예요. (예: …/place/<Text style={{ fontWeight: '800', color: c.text }}>2006014171</Text>)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="플레이스 ID (숫자)" placeholderTextColor={c.textSecondary} value={placeIdInput} onChangeText={setPlaceIdInput} keyboardType="number-pad" />
              <Pressable onPress={savePlaceId} disabled={busy} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>{placeIdSet ? '변경' : '연결'}</Text></Pressable>
            </View>
          </View>

          {/* 추적 키워드 */}
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>추적 키워드 ({kws.length}/{MAX_KW})</Text>
            <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 10 }}>이 키워드로 검색했을 때 내 매장 순위를 추적해요.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: kws.length ? 12 : 0 }}>
              {kws.map((k) => (
                <View key={k.id} style={[styles.kwChip, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
                  <Text style={{ color: c.primaryDeep, fontWeight: '700', fontSize: 13 }}>{k.keyword}</Text>
                  <Pressable onPress={() => delKw(k.id)} hitSlop={6}><Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 14 }}> ✕</Text></Pressable>
                </View>
              ))}
            </View>
            {kws.length < MAX_KW && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="예: 춘천 닭갈비" placeholderTextColor={c.textSecondary} value={newKw} onChangeText={setNewKw} onSubmitEditing={addKw} returnKeyType="done" />
                <Pressable onPress={addKw} disabled={busy || !newKw.trim()} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy || !newKw.trim() ? 0.5 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>추가</Text></Pressable>
              </View>
            )}
          </View>

          {msg ? <Pressable onPress={() => setMsg('')} style={{ marginBottom: 12 }}><Text style={{ color: msg.startsWith('✅') ? c.primary : '#E5484D', fontWeight: '700', fontSize: 13 }}>{msg}</Text></Pressable> : null}

          {/* 순위 현황 */}
          <Text style={[styles.sectionTitle, { color: c.text }]}>순위 현황</Text>
          {!placeIdSet ? (
            <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 8 }}>먼저 위에서 네이버 플레이스를 연결해주세요.</Text>
          ) : kws.length === 0 ? (
            <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 8 }}>추적할 키워드를 추가하면 순위가 표시돼요.</Text>
          ) : snaps.length === 0 ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 8 }]}>
              <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>아직 수집된 데이터가 없어요.{'\n'}매일 새벽 자동 수집되며, 보통 하루 뒤부터 순위가 채워져요.</Text>
            </View>
          ) : (
            kws.map((k) => {
              const { latest, prev } = byKeyword(k.keyword);
              const delta = latest?.rank != null && prev?.rank != null ? prev.rank - latest.rank : null; // +면 상승
              return (
                <View key={k.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 14.5, flex: 1 }}>{k.keyword}</Text>
                    {latest?.rank != null ? (
                      <Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 20 }}>{latest.rank}위</Text>
                    ) : (
                      <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>순위권 밖</Text>
                    )}
                    {delta != null && delta !== 0 ? (
                      <Text style={{ color: delta > 0 ? '#11B981' : '#E5484D', fontWeight: '800', fontSize: 13, marginLeft: 6 }}>{delta > 0 ? `▲${delta}` : `▼${-delta}`}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                    <Text style={{ color: c.textSecondary, fontSize: 12 }}>저장 {latest?.save_count ?? '-'}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12 }}>방문리뷰 {latest?.visitor_review ?? '-'}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12 }}>블로그 {latest?.blog_review ?? '-'}</Text>
                    {latest ? <Text style={{ color: c.textSecondary, fontSize: 12, marginLeft: 'auto' }}>{latest.snap_date}</Text> : null}
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
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  cta: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  storeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  smallBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  kwChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
