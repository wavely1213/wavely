import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DongPicker } from '@/components/DongPicker';
import { mergeDongs } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const MARKET_CATS = ['디지털', '가구/인테리어', '의류', '유아동', '생활/주방', '취미/게임', '뷰티', '기타'];

type Item = { id: string; title: string; price: number; status: string; images: string[]; dong: string | null; created_at: string };

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return '방금'; if (d < 3600) return `${Math.floor(d / 60)}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`; return `${Math.floor(d / 86400)}일 전`;
}
const STATUS: Record<string, { label: string; color: string }> = {
  reserved: { label: '예약중', color: '#FF9F40' }, sold: { label: '거래완료', color: '#8A94A6' },
};

export default function MarketScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dong, setDong] = useState<string | null>(null);
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  // 검색어는 350ms 디바운스 후에만 쿼리(키 입력마다 DB 호출·경쟁 방지)
  useEffect(() => { const t = setTimeout(() => setDebSearch(search), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    supabase.rpc('dong_list').then(({ data }) => setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong))));
    let q = supabase.from('market_items').select('id,title,price,status,images,dong,created_at').order('created_at', { ascending: false }).limit(60);
    if (dong) q = q.eq('dong', dong);
    if (cat) q = q.eq('category', cat);
    if (debSearch.trim()) q = q.ilike('title', `%${debSearch.trim()}%`);
    const { data } = await q;
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }, [dong, cat, debSearch]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>🛒 중고거래</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.bar, { backgroundColor: c.card, borderColor: c.border }]}>
        <DongPicker value={dong} options={dongOptions} onChange={setDong} allLabel="춘천시 전체" />
        <View style={[styles.searchBox, { backgroundColor: c.background, borderColor: c.border }]}>
          <Text style={{ fontSize: 13 }}>🔍</Text>
          <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="검색" placeholderTextColor={c.textSecondary} value={search} onChangeText={setSearch} returnKeyType="search" />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.cats, { backgroundColor: c.card, borderColor: c.border }]} contentContainerStyle={{ gap: 7, paddingHorizontal: 14, alignItems: 'center' }}>
        {[null, ...MARKET_CATS].map((k) => {
          const on = cat === k;
          return (
            <Pressable key={k ?? 'all'} onPress={() => setCat(k)} style={[styles.catChip, { backgroundColor: on ? c.primary : c.background }]}>
              <Text style={[styles.catTxt, { color: on ? c.onPrimary : c.textSecondary }]}>{k ?? '전체'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && !refreshing ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : items.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          <View style={styles.center}><Text style={{ fontSize: 40, marginBottom: 6 }}>🛒</Text><Text style={{ color: c.textSecondary }}>아직 올라온 물건이 없어요. 첫 판매글을 올려보세요!</Text></View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          {items.map((it) => {
            const st = STATUS[it.status];
            return (
              <Pressable key={it.id} onPress={() => router.push(`/market/${it.id}`)} style={[styles.row, { borderColor: c.border }]}>
                <View style={[styles.thumb, { backgroundColor: c.primarySoft }]}>
                  {it.images?.[0] ? <Image source={{ uri: it.images[0] }} style={styles.thumbImg} contentFit="cover" transition={120} /> : <Text style={{ fontSize: 28, textAlign: 'center', lineHeight: 92 }}>📦</Text>}
                  {st ? <View style={[styles.stBadge, { backgroundColor: st.color }]}><Text style={styles.stTxt}>{st.label}</Text></View> : null}
                </View>
                <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                  <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{it.title}</Text>
                  <Text style={[styles.price, { color: c.text }]}>{it.price === 0 ? '나눔 🧡' : `${it.price.toLocaleString()}원`}</Text>
                  <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>{it.dong ? `📍${it.dong} · ` : ''}{ago(it.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => router.push(session ? '/market-new' : '/login')}>
        <Text style={styles.fabTxt}>＋ 판매하기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13.5 },
  cats: { borderBottomWidth: 1, maxHeight: 48 },
  catChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  catTxt: { fontSize: 12.5, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  row: { flexDirection: 'row', gap: 13, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  thumb: { width: 92, height: 92, borderRadius: 12, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  stBadge: { position: 'absolute', left: 5, bottom: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  stTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  title: { fontSize: 15, fontWeight: '600' },
  price: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  meta: { fontSize: 12, marginTop: 4 },
  fab: { position: 'absolute', right: 18, bottom: 28, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, boxShadow: '0 3px 8px rgba(0,0,0,0.2)', elevation: 5 },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
