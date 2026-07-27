import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DongPicker } from '@/components/DongPicker';
import { Icon } from '@/components/Icon';
import { mergeDongs } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export const PAY_TYPES: Record<string, string> = { hourly: '시급', daily: '일급', monthly: '월급', negotiable: '협의' };

// 웹 공유 테이블 job_posts ↔ 앱 내부 shape 어댑터 (앱 UI는 그대로, 데이터만 변환).
// 웹: kind hire/seek · wage_type '시급'/'일급'/'월급'/'협의' · wage. 앱: kind hiring/seeking · pay_type hourly/… · pay.
const WAGE_TO_PAYTYPE: Record<string, string> = { 시급: 'hourly', 일급: 'daily', 월급: 'monthly', 협의: 'negotiable' };
const PAYTYPE_TO_WAGE: Record<string, string> = { hourly: '시급', daily: '일급', monthly: '월급', negotiable: '협의' };
export function fromJobPost(r: any): any {
  if (!r) return r;
  return { ...r, kind: r.kind === 'seek' ? 'seeking' : 'hiring', pay_type: WAGE_TO_PAYTYPE[r.wage_type ?? ''] ?? 'hourly', pay: r.wage ?? null };
}
export function toJobPost(p: any): any {
  const seek = p.kind === 'seeking';
  return {
    kind: seek ? 'seek' : 'hire',
    title: p.title, body: p.body ?? null,
    wage: p.pay_type === 'negotiable' ? null : (p.pay ?? null), wage_type: PAYTYPE_TO_WAGE[p.pay_type ?? ''] ?? '시급',
    work_time: p.work_time ?? null, contact: p.contact ?? null, dong: p.dong ?? null,
    age_range: seek ? (p.age_range || null) : null, gender: seek ? (p.gender || null) : null,   // 익명 구직(나이대·성별)
  };
}
// 익명 구직 나이대(웹 JOB_AGEBANDS와 동일).
export const JOB_AGEBANDS = ['10대', '20대 초반', '20대 중반', '20대 후반', '30대 초반', '30대 중반', '30대 후반', '40대', '50대 이상'];
// job_posts 목록 select 컬럼(앱 목록용). 웹 JOB_SELECT와 호환.
export const JOBPOST_LIST_COLS = 'id,kind,title,wage,wage_type,work_time,dong,status,age_range,gender,boost,created_at';

type Job = { id: string; kind: string; title: string; pay_type: string | null; pay: number | null; work_time: string | null; dong: string | null; status: string; created_at: string; age_range?: string | null; gender?: string | null };

// 익명 구직 신원 요약(나이대·성별). 둘 다 없으면 null.
function anonIdentity(j: Job) {
  if (j.kind !== 'seeking') return null;
  const parts = [j.age_range, j.gender ? `${j.gender}` : null].filter(Boolean);
  return parts.length ? `익명 · ${parts.join(' · ')}` : '익명';
}

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`; return `${Math.floor(d / 86400)}일 전`;
}
function payText(j: Job) {
  if (j.pay_type === 'negotiable' || !j.pay) return '협의';
  return `${PAY_TYPES[j.pay_type ?? ''] ?? ''} ${j.pay.toLocaleString()}원`;
}

export default function JobsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<'all' | 'hiring' | 'seeking'>('all');
  const [dong, setDong] = useState<string | null>(null);
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  // 검색어는 입력 즉시가 아니라 350ms 디바운스 후에만 쿼리(키 입력마다 DB 호출 방지)
  useEffect(() => { const t = setTimeout(() => setDebSearch(search), 350); return () => clearTimeout(t); }, [search]);
  const [sort, setSort] = useState<'recent' | 'wage'>('recent');

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    supabase.rpc('dong_list').then(({ data }) => setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong))));
    let q = supabase.from('job_posts').select(JOBPOST_LIST_COLS).eq('status', 'open').order('boost', { ascending: false }).order('created_at', { ascending: false }).limit(60);
    if (kind !== 'all') q = q.eq('kind', kind === 'hiring' ? 'hire' : 'seek');   // 앱 kind → 웹 kind
    if (dong) q = q.eq('dong', dong);
    if (debSearch.trim()) q = q.ilike('title', `%${debSearch.trim()}%`);
    const { data } = await q;
    setJobs(((data as any[]) ?? []).map(fromJobPost) as Job[]);   // 웹 shape → 앱 shape
    setLoading(false);
  }, [kind, dong, debSearch]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const TABS: { k: typeof kind; l: string }[] = [{ k: 'all', l: '전체' }, { k: 'hiring', l: '구인' }, { k: 'seeking', l: '구직' }];
  const SORTS: { k: 'recent' | 'wage'; l: string }[] = [{ k: 'recent', l: '최신순' }, { k: 'wage', l: '시급순' }];
  const wageHourly = (j: Job) => (j.pay == null ? -1 : j.pay_type === 'monthly' ? j.pay / 209 : j.pay_type === 'daily' ? j.pay / 8 : j.pay);
  const view = sort === 'wage'
    ? [...jobs].sort((a, b) => (((b as any).boost || 0) - ((a as any).boost || 0)) || (wageHourly(b) - wageHourly(a)))
    : jobs;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="briefcase" size={16} color={c.text} /><Text style={[styles.hTitle, { color: c.text }]}>알바</Text></View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: c.card, borderColor: c.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.k} onPress={() => setKind(t.k)} style={[styles.tab, { backgroundColor: kind === t.k ? c.primary : c.background }]}>
            <Text style={{ color: kind === t.k ? c.onPrimary : c.textSecondary, fontWeight: '700', fontSize: 13 }}>{t.l}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        {SORTS.map((so) => (
          <Pressable key={so.k} onPress={() => setSort(so.k)} style={styles.sortChip}>
            <Text style={{ color: sort === so.k ? c.primary : c.textSecondary, fontWeight: sort === so.k ? '800' : '600', fontSize: 12.5 }}>{so.l}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.dongBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <DongPicker value={dong} options={dongOptions} onChange={setDong} allLabel="춘천시 전체" />
        <View style={[styles.searchBox, { backgroundColor: c.background, borderColor: c.border }]}>
          <Icon name="search" size={13} color={c.textSecondary} />
          <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="검색 (예: 카페, 주말 단기)" placeholderTextColor={c.textSecondary} value={search} onChangeText={setSearch} returnKeyType="search" />
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : view.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          <View style={styles.center}><View style={{ marginBottom: 8 }}><Icon name="briefcase" size={40} color={c.textSecondary} /></View><Text style={{ color: c.textSecondary }}>{dong || debSearch ? '해당 조건의 공고가 없어요' : '아직 공고가 없어요. 첫 글을 올려보세요!'}</Text></View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 10 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} />}>
          {view.map((j) => {
            const boosted = !!(j as any).boost;
            const seek = j.kind === 'seeking';
            return (
              <Pressable key={j.id} onPress={() => router.push(`/jobs/${j.id}`)} style={[styles.card, { backgroundColor: c.card, borderColor: boosted ? c.primary : c.border, opacity: j.status === 'closed' ? 0.55 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.kindBadge, { backgroundColor: seek ? '#FFE7CC' : c.primarySoft }]}>
                    <Text style={{ color: seek ? '#D9730D' : c.primaryDeep, fontSize: 11, fontWeight: '800' }}>{seek ? '구직' : '구인'}</Text>
                  </View>
                  {boosted ? <View style={[styles.kindBadge, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontSize: 10.5, fontWeight: '800' }}>광고</Text></View> : null}
                  {j.status === 'closed' ? <View style={[styles.kindBadge, { backgroundColor: c.backgroundElement }]}><Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '800' }}>마감</Text></View> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: c.textSecondary, fontSize: 11.5 }}>{j.dong ? `${j.dong} · ` : ''}{ago(j.created_at)}</Text>
                </View>
                <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{j.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name="wallet" size={14} color={c.primaryDeep} />
                  <Text style={[styles.pay, { color: c.primaryDeep }]}>{payText(j)}{j.work_time ? ` · ${j.work_time}` : ''}</Text>
                </View>
                {seek && anonIdentity(j) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="lock" size={12} color={c.textSecondary} />
                    <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '600' }}>{anonIdentity(j)}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => router.push(session ? '/job-new' : '/login')}>
        <Text style={styles.fabTxt}>＋ 공고 올리기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  tabBar: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  dongBar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  card: { marginHorizontal: 12, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1, gap: 6 },
  sortChip: { paddingHorizontal: 8, paddingVertical: 6 },
  kindBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  title: { fontSize: 15.5, fontWeight: '700' },
  pay: { fontSize: 13.5, fontWeight: '700' },
  fab: { position: 'absolute', right: 18, bottom: 28, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 999, boxShadow: '0 3px 8px rgba(0,0,0,0.2)', elevation: 5 },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
