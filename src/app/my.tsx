import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { boardLabel } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Tab = 'posts' | 'reviews' | 'scraps' | 'market' | 'jobs';

export default function MyScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [scraps, setScraps] = useState<any[]>([]);
  const [market, setMarket] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const me = session.user.id;
    setLoading(true);
    if (tab === 'posts') {
      const { data } = await supabase.from('posts').select('id,title,board,dong,created_at').eq('author_id', me).order('created_at', { ascending: false }).limit(100);
      setPosts((data as any[]) ?? []);
    } else if (tab === 'reviews') {
      const { data } = await supabase.from('reviews').select('id,rating,body,store_id,place_id,verified,stores(name),places(name)').eq('author_id', me).order('created_at', { ascending: false }).limit(100);
      setReviews((data as any[]) ?? []);
    } else if (tab === 'scraps') {
      const { data: sc } = await supabase.from('scraps').select('target_type,target_id,created_at').eq('user_id', me).order('created_at', { ascending: false }).limit(100);
      const rows = (sc as any[]) ?? [];
      const byType: Record<string, string[]> = { post: [], place: [], store: [] };
      rows.forEach((r) => { if (byType[r.target_type]) byType[r.target_type].push(r.target_id); });
      const labels: Record<string, string> = {};
      if (byType.post.length) { const { data } = await supabase.from('posts').select('id,title').in('id', byType.post); (data as any[])?.forEach((p) => (labels[`post:${p.id}`] = p.title)); }
      if (byType.place.length) { const { data } = await supabase.from('places').select('id,name').in('id', byType.place.map(Number)); (data as any[])?.forEach((p) => (labels[`place:${p.id}`] = p.name)); }
      if (byType.store.length) { const { data } = await supabase.from('stores').select('id,name').in('id', byType.store); (data as any[])?.forEach((p) => (labels[`store:${p.id}`] = p.name)); }
      setScraps(rows.map((r) => ({ ...r, label: labels[`${r.target_type}:${r.target_id}`] ?? '삭제된 항목' })));
    } else if (tab === 'market') {
      const { data } = await supabase.from('market_items').select('id,title,price,status,images,created_at').eq('seller_id', me).order('created_at', { ascending: false }).limit(100);
      setMarket((data as any[]) ?? []);
    } else if (tab === 'jobs') {
      const { data } = await supabase.from('jobs').select('id,kind,title,status,created_at').eq('author_id', me).order('created_at', { ascending: false }).limit(100);
      setJobs((data as any[]) ?? []);
    }
    setLoading(false);
  }, [session, tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const TYPE_EMOJI: Record<string, string> = { post: '📝', place: '📍', store: '🏪' };
  const openTarget = (type: string, tid: string) => router.push(`/${type}/${tid}` as any);

  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: c.border }]}><Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable><Text style={[styles.hTitle, { color: c.text }]}>내 활동</Text><View style={{ width: 40 }} /></View>
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={goBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>내 활동</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabs, { borderColor: c.border }]} contentContainerStyle={{ alignItems: 'center' }}>
        {([['posts', '📝 내 글'], ['reviews', '⭐ 리뷰'], ['scraps', '🔖 스크랩'], ['market', '🛒 내 판매'], ['jobs', '💼 내 공고']] as [Tab, string][]).map(([k, lbl]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}>
            <Text style={{ color: tab === k ? c.primary : c.textSecondary, fontWeight: '800', fontSize: 13.5 }}>{lbl}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {tab === 'posts' && (posts.length === 0 ? <Empty c={c} emoji="📝" txt="아직 쓴 글이 없어요" /> : posts.map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)} style={[styles.row, { borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{p.title}</Text>
                <Text style={[styles.rowSub, { color: c.textSecondary }]}>{p.board === 'promo' ? '📢 홍보' : boardLabel(p.board)}{p.dong ? ` · 📍${p.dong}` : ''}</Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
            </Pressable>
          )))}

          {tab === 'reviews' && (reviews.length === 0 ? <Empty c={c} emoji="⭐" txt="아직 쓴 리뷰가 없어요" /> : reviews.map((r) => (
            <Pressable key={r.id} onPress={() => openTarget(r.store_id ? 'store' : 'place', r.store_id ?? r.place_id)} style={[styles.row, { borderColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{r.stores?.name ?? r.places?.name ?? '매장'}</Text>
                <Text style={[styles.rowSub, { color: c.textSecondary }]} numberOfLines={1}>{'⭐'.repeat(r.rating)}{r.verified ? ' ✅' : ''} {r.body ?? ''}</Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
            </Pressable>
          )))}

          {tab === 'scraps' && (scraps.length === 0 ? <Empty c={c} emoji="🔖" txt="스크랩한 항목이 없어요" /> : scraps.map((s, i) => (
            <Pressable key={`${s.target_type}-${s.target_id}-${i}`} onPress={() => openTarget(s.target_type, s.target_id)} style={[styles.row, { borderColor: c.border }]}>
              <Text style={{ fontSize: 18 }}>{TYPE_EMOJI[s.target_type] ?? '🔖'}</Text>
              <Text style={[styles.rowTitle, { color: c.text, flex: 1 }]} numberOfLines={1}>{s.label}</Text>
              <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
            </Pressable>
          )))}

          {tab === 'market' && (market.length === 0 ? <Empty c={c} emoji="🛒" txt="올린 판매글이 없어요" /> : market.map((m) => (
            <Pressable key={m.id} onPress={() => router.push(`/market/${m.id}`)} style={[styles.row, { borderColor: c.border, opacity: m.status === 'sold' ? 0.55 : 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{m.title}</Text>
                <Text style={[styles.rowSub, { color: c.textSecondary }]}>{m.price === 0 ? '나눔' : `${m.price.toLocaleString()}원`}{m.status === 'reserved' ? ' · 예약중' : m.status === 'sold' ? ' · 거래완료' : ' · 판매중'}</Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
            </Pressable>
          )))}

          {tab === 'jobs' && (jobs.length === 0 ? <Empty c={c} emoji="💼" txt="올린 공고가 없어요" /> : jobs.map((j) => (
            <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={[styles.row, { borderColor: c.border, opacity: j.status === 'closed' ? 0.55 : 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{j.title}</Text>
                <Text style={[styles.rowSub, { color: c.textSecondary }]}>{j.kind === 'hiring' ? '🙋 구인' : '✋ 구직'}{j.status === 'closed' ? ' · 마감' : ' · 모집중'}</Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
            </Pressable>
          )))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Empty({ c, txt, emoji }: { c: any; txt: string; emoji?: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 48, gap: 8 }}>
      {emoji ? <Text style={{ fontSize: 38 }}>{emoji}</Text> : null}
      <Text style={{ color: c.textSecondary, textAlign: 'center', fontSize: 13.5 }}>{txt}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { borderBottomWidth: 1, flexGrow: 0 },
  tab: { paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12.5, marginTop: 3 },
});
