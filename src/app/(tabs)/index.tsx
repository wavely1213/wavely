import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { DongPicker } from '@/components/DongPicker';
import { StripBanner } from '@/components/StripBanner';
import { boardLabel, mergeDongs, parseHashtags } from '@/constants/app';
import { Assets, Colors, UI } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const CHIPS: { key: string | null; label: string }[] = [
  { key: null, label: '전체' },
  { key: 'free', label: '자유' },
  { key: 'promo', label: '홍보' },
  { key: 'owner', label: '사장님' },
  { key: 'staff', label: '직장인' },
];

type Post = {
  id: string;
  board: string;
  dong: string | null;
  title: string;
  body_preview: string | null;
  image_url: string | null;
  media_type: string | null;
  place_name: string | null;
  created_at: string;
  anonymous: boolean;
  profiles: { nickname: string; avatar_url: string | null } | null;
  comments: { count: number }[];
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`;
  return `${Math.floor(diff / 86400)}일`;
}

// 비로그인 위치 확보 (웹: navigator, 네이티브: expo-location). 실패/거부 시 null.
async function getAnonLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') {
      return await new Promise((res) => {
        const g = (globalThis as any).navigator?.geolocation;
        if (!g) return res(null);
        g.getCurrentPosition(
          (p: any) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => res(null),
          { timeout: 8000, maximumAge: 300000 },
        );
      });
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function CommunityScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const params = useLocalSearchParams<{ tag?: string | string[] }>();
  const tag = Array.isArray(params.tag) ? params.tag[0] : params.tag;

  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dong, setDong] = useState<string | null>(null); // null = 춘천시 전체
  const [dongOptions, setDongOptions] = useState<string[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [anonDong, setAnonDong] = useState<string | null>(null); // 비로그인: 감지된 내 동네
  const [anonDenied, setAnonDenied] = useState(false); // 비로그인: 위치 권한 거부

  // 동 목록 (게시글 많은 순) — 상위 24개만 칩으로
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.rpc('dong_list').then(({ data }) => {
      setDongOptions(mergeDongs(((data as any[]) ?? []).map((d) => d.dong)));
    });
  }, []);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    // 비로그인: 위치 기반으로 '내 동네' 글만, 최신 제목 2개. 사진·본문·댓글 차단, 나머지 블러.
    if (!session) {
      const loc = await getAnonLocation();
      if (!loc) { setAnonDenied(true); setAnonDong(null); setPosts([]); setLoading(false); return; }
      setAnonDenied(false);
      const { data: nd } = await supabase.rpc('nearest_dong', { p_lat: loc.lat, p_lng: loc.lng });
      const dong = typeof nd === 'string' ? nd : null;
      setAnonDong(dong);
      let pq = supabase.from('posts').select('id,title,dong,board,created_at').order('created_at', { ascending: false }).limit(2);
      if (dong) pq = pq.eq('dong', dong);
      const { data } = await pq;
      setPosts((data as unknown as Post[]) ?? []);
      setLoading(false);
      return;
    }
    // 로그인: 전체 (목록은 미리보기, 본문 필터·댓글수 포함)
    const sel = 'id,board,dong,title,body_preview,image_url,media_type,place_name,created_at,anonymous,profiles(nickname,avatar_url),comments(count)';
    let q = supabase.from('posts').select(sel).order('created_at', { ascending: false }).limit(50);
    if (tag) q = q.ilike('body', `%#${tag}%`);
    else {
      if (dong) q = q.eq('dong', dong);
      if (active) q = q.eq('board', active);
      if (search.trim()) q = q.or(`title.ilike.%${search.trim()}%,body.ilike.%${search.trim()}%`);
    }
    const { data } = await q;
    setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  }, [active, dong, tag, search, session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const [notifUnread, setNotifUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    if (!session) { setNotifUnread(0); return; }
    supabase.rpc('unread_notif_count').then(({ data }) => setNotifUnread(typeof data === 'number' ? data : 0));
  }, [session]));

  const goWrite = () => router.push(session ? `/write?dong=${encodeURIComponent(dong ?? '')}` : '/login');
  const setTag = (t: string | undefined) => router.setParams({ tag: t });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.topbar, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }]}>
        {Assets.logo ? <Image source={{ uri: Assets.logo }} style={{ width: 30, height: 30, borderRadius: 7, marginRight: 9 }} contentFit="contain" /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.loc, { color: c.text }]}>
            강원 춘천시{dong ? ` · ${dong}` : ''} <Text style={{ color: c.textSecondary, fontSize: 13 }}>▾</Text>
          </Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>{dong ? `${dong} 동네 커뮤니티` : '우리 동네 커뮤니티 · 익명으로 편하게'}</Text>
        </View>
        <Pressable onPress={() => router.push(session ? '/notifications' : '/login')} hitSlop={8} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          {notifUnread > 0 ? <View style={styles.notifBadge}><Text style={styles.notifBadgeTxt}>{notifUnread > 9 ? '9+' : notifUnread}</Text></View> : null}
        </Pressable>
      </View>

      {/* 동네(동) 선택 + 검색 */}
      {!tag && (
        <View style={[styles.dongBar, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <DongPicker value={dong} options={dongOptions} onChange={(d) => { setDong(d); }} allLabel="춘천시 전체" />
          <View style={[styles.searchBox, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={{ fontSize: 13 }}>🔍</Text>
            <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="글 검색" placeholderTextColor={c.textSecondary} value={search} onChangeText={setSearch} returnKeyType="search" />
            {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Text style={{ color: c.textSecondary, fontSize: 13 }}>✕</Text></Pressable> : null}
          </View>
        </View>
      )}

      {tag ? (
        // 해시태그 검색 중 배너
        <View style={[styles.tagBanner, { backgroundColor: c.primarySoft }]}>
          <Text style={[styles.tagBannerTxt, { color: c.primaryDeep }]}>#{tag} 로 검색 중</Text>
          <Pressable onPress={() => setTag(undefined)} hitSlop={8}>
            <Text style={[styles.tagClear, { color: c.primaryDeep }]}>✕ 전체보기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.chips, { backgroundColor: c.card, borderColor: c.border }]}>
          {CHIPS.map((b) => {
            const on = active === b.key;
            return (
              <Pressable key={b.label} onPress={() => setActive(b.key)} style={[styles.chip, { backgroundColor: on ? c.primary : c.background }]}>
                <Text style={[styles.chipTxt, { color: on ? c.onPrimary : c.textSecondary }]}>{b.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 게시판 상단 스트립 배너 광고 */}
      {!tag && <StripBanner scheme={scheme} />}

      {/* 빠른 메뉴 (로그인 시) */}
      {session && !tag ? (
        <View style={[styles.quickRow, { backgroundColor: c.card, borderColor: c.border }]}>
          {[
            { icon: '🔥', label: '인기글', to: '/hot' },
            { icon: '🛒', label: '중고거래', to: '/market' },
            { icon: '💼', label: '구인구직', to: '/jobs' },
            { icon: '🔔', label: '키워드', to: '/keywords' },
          ].map((q) => (
            <Pressable key={q.to} onPress={() => router.push(q.to as any)} style={styles.quickItem}>
              <View style={[styles.quickIcon, { backgroundColor: c.primarySoft }]}><Text style={{ fontSize: 21 }}>{q.icon}</Text></View>
              <Text style={[styles.quickLabel, { color: c.text }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}><ActivityIndicator color={c.primary} /></View>
      ) : !session ? (
        anonDenied ? (
          <View style={[styles.centerBox, { paddingHorizontal: 32 }]}>
            <Text style={{ fontSize: 44, marginBottom: 6 }}>📍</Text>
            <Text style={[styles.emptyTitle, { color: c.text, textAlign: 'center' }]}>내 동네 글을 보려면{'\n'}위치 권한이 필요해요</Text>
            <Text style={[styles.emptySub, { color: c.textSecondary, textAlign: 'center', marginTop: 4 }]}>위치 기반으로 우리 동네 이야기를 보여드려요</Text>
            <Pressable onPress={() => load()} style={[styles.wallBtn, { backgroundColor: c.primary, marginTop: 16 }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 14 }}>📍 위치 다시 시도</Text></Pressable>
            <Pressable onPress={() => router.push('/login')} style={{ marginTop: 14 }}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>또는 로그인 / 가입하기 ›</Text></Pressable>
          </View>
        ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* 내 동네 헤더 */}
          <View style={[styles.dongHeader, { backgroundColor: c.primarySoft }]}>
            <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 13.5 }}>📍 {anonDong ? `${anonDong} 이웃들의 글` : '내 주변 글'}</Text>
            <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 2 }}>비로그인은 우리 동네 글 제목만 볼 수 있어요</Text>
          </View>
          {/* 비로그인: 내 동네 최신 제목 2개만 */}
          {posts.length === 0 ? (
            <Text style={{ color: c.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 18 }}>아직 이 동네 글이 없어요</Text>
          ) : posts.map((p) => (
            <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)} style={[styles.post, { backgroundColor: c.card, borderColor: c.border, paddingVertical: UI.postPaddingV }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                {p.dong ? <View style={[styles.tag, { backgroundColor: c.background }]}><Text style={[styles.tagTxt, { color: c.textSecondary }]}>📍{p.dong}</Text></View> : null}
                <Text style={[styles.time, { color: c.textSecondary, marginLeft: 'auto' }]}>{timeAgo(p.created_at)}</Text>
              </View>
              <Text style={[styles.title, { color: c.text, marginTop: 6 }]} numberOfLines={1}>{p.title}</Text>
            </Pressable>
          ))}
          {/* 블러 월 — 로그인 유도 */}
          <View style={{ position: 'relative', marginTop: 4 }}>
            <View pointerEvents="none" style={Platform.OS === 'web' ? ({ filter: 'blur(6px)' } as any) : { opacity: 0.25 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.post, { backgroundColor: c.card, borderColor: c.border, paddingVertical: UI.postPaddingV }]}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: UI.postThumb, height: UI.postThumb, borderRadius: 10, backgroundColor: c.backgroundElement }} />
                    <View style={{ flex: 1, gap: 7, justifyContent: 'center' }}>
                      <View style={{ height: 12, width: '50%', borderRadius: 6, backgroundColor: c.backgroundElement }} />
                      <View style={{ height: 14, width: '85%', borderRadius: 7, backgroundColor: c.backgroundElement }} />
                      <View style={{ height: 11, width: '70%', borderRadius: 6, backgroundColor: c.backgroundElement }} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
            {/* 오버레이 CTA */}
            <View style={styles.wallOverlay} pointerEvents="box-none">
              <Pressable onPress={() => router.push('/login')} style={[styles.wallCard, { backgroundColor: c.card, borderColor: c.primary }]}>
                <Text style={{ fontSize: 30 }}>🔒</Text>
                <Text style={{ color: c.text, fontWeight: '900', fontSize: 16, marginTop: 8 }}>우리 동네 이야기, 전부 보기</Text>
                <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>로그인하면 모든 글·사진·댓글을 볼 수 있어요{'\n'}무료로 우리 동네 이웃과 함께해요</Text>
                <View style={[styles.wallBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 14 }}>로그인 / 가입하기</Text></View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
        )
      ) : posts.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 44, marginBottom: 4 }}>{search ? '🔍' : '📝'}</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{search ? `‘${search}’ 검색 결과가 없어요` : tag ? `#${tag} 글이 없어요` : dong ? `${dong} 글이 아직 없어요` : '아직 글이 없어요'}</Text>
          <Text style={[styles.emptySub, { color: c.textSecondary }]}>{search ? '다른 검색어로 찾아보세요' : dong ? `${dong}의 첫 글을 남겨보세요!` : '첫 글을 남겨보세요!'}</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 150 }}>
          {posts.map((p) => {
            const tags = parseHashtags(`${p.title} ${p.body_preview ?? ''}`);
            return (
              <Pressable key={p.id} onPress={() => router.push(`/post/${p.id}`)} style={[styles.post, { backgroundColor: c.card, borderColor: c.border, paddingVertical: UI.postPaddingV }]}>
                <View style={styles.row}>
                  {p.image_url ? (
                    p.media_type === 'video' ? (
                      <View style={[styles.thumb, { width: UI.postThumb, height: UI.postThumb, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 26 }}>▶️</Text>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>영상</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: p.image_url }} style={[styles.thumb, { width: UI.postThumb, height: UI.postThumb, backgroundColor: c.primarySoft }]} contentFit="cover" transition={150} />
                    )
                  ) : null}
                  <View style={styles.content}>
                    <View style={styles.head}>
                      <Avatar url={p.anonymous ? null : p.profiles?.avatar_url} fallback={p.anonymous ? '🕶️' : '🙂'} size={24} bg={c.primarySoft} />
                      <Text style={[styles.nick, { color: c.text }]}>{p.anonymous ? '익명' : (p.profiles?.nickname ?? '회원')}</Text>
                      <View style={[styles.tag, { backgroundColor: p.board === 'promo' ? '#FFE7CC' : c.primarySoft }]}>
                        <Text style={[styles.tagTxt, { color: p.board === 'promo' ? '#D9730D' : c.primary }]}>{p.board === 'promo' ? '📢 홍보' : boardLabel(p.board)}</Text>
                      </View>
                      {p.dong ? <View style={[styles.tag, { backgroundColor: c.background }]}><Text style={[styles.tagTxt, { color: c.textSecondary }]}>📍{p.dong}</Text></View> : null}
                      <View style={styles.headRight}>
                        {session ? <Text style={[styles.meta, { color: c.textSecondary }]}>💬 {p.comments?.[0]?.count ?? 0}</Text> : null}
                        <Text style={[styles.time, { color: c.textSecondary }]}>{timeAgo(p.created_at)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{p.title}</Text>
                    {p.body_preview ? <Text style={[styles.body, { color: c.textSecondary }]} numberOfLines={2}>{p.body_preview}</Text> : null}
                    {p.place_name ? (
                      <View style={[styles.placeChip, { backgroundColor: c.background }]}>
                        <Text style={[styles.placeChipTxt, { color: c.primary }]} numberOfLines={1}>📍 {p.place_name}</Text>
                      </View>
                    ) : null}
                    {tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {tags.slice(0, 4).map((t) => (
                          <Pressable key={t} onPress={() => setTag(t)} style={[styles.hashChip, { backgroundColor: c.background }]}>
                            <Text style={[styles.hashTxt, { color: c.primary }]}>#{t}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={goWrite}>
        <Text style={styles.fabTxt}>✏️ 글쓰기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1 },
  notifBadge: { position: 'absolute', top: 0, right: 0, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#E5484D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  loc: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  dongBar: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 13.5 },
  chips: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  chipTxt: { fontSize: 13, fontWeight: '700' },
  tagBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  tagBannerTxt: { fontSize: 14, fontWeight: '800' },
  tagClear: { fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 13 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1 },
  quickItem: { alignItems: 'center', gap: 5 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11.5, fontWeight: '700' },
  dongHeader: { paddingHorizontal: 16, paddingVertical: 10, marginBottom: 2 },
  wallOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 40 },
  wallCard: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: 24, marginHorizontal: 28, borderRadius: 18, borderWidth: 1.5, boxShadow: '0 6px 20px rgba(0,0,0,0.18)' },
  wallBtn: { marginTop: 14, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999 },
  post: { paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  content: { flex: 1, minWidth: 0 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  anon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  anonTxt: { fontSize: 11, fontWeight: '800' },
  nick: { fontSize: 13, fontWeight: '700' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  tagTxt: { fontSize: 11, fontWeight: '800' },
  time: { fontSize: 11 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  body: { fontSize: 13, lineHeight: 18 },
  placeChip: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  placeChipTxt: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  hashChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  hashTxt: { fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', right: 18, bottom: 92, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 999, boxShadow: '0 3px 8px rgba(0,0,0,0.2)', elevation: 5 },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
