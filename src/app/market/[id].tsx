import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useScheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Item = {
  id: string; seller_id: string; title: string; body: string | null; price: number; category: string | null;
  status: string; images: string[]; dong: string | null; view_count: number; created_at: string;
  profiles: { nickname: string; avatar_url: string | null } | null;
};

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}분 전`;
  if (d < 86400) return `${Math.floor(d / 3600)}시간 전`; return `${Math.floor(d / 86400)}일 전`;
}
const STATUSES = [{ k: 'selling', l: '판매중' }, { k: 'reserved', l: '예약중' }, { k: 'sold', l: '거래완료' }];

export default function MarketDetail() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const { width } = useWindowDimensions();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatErr, setChatErr] = useState('');
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setFailed(false);
    // 비로그인은 본문(body)·판매자 정보 열람 불가 → 기본 정보만
    const cols = session
      ? '*,profiles:seller_id(nickname,avatar_url)'
      : 'id,seller_id,title,price,category,status,images,dong,view_count,created_at';
    const { data, error } = await supabase.from('market_items').select(cols).eq('id', id).single();
    // PGRST116 = 행 없음(삭제됨). 그 외 에러는 네트워크/일시 오류 → 재시도 안내
    if (error && error.code !== 'PGRST116') { setFailed(true); setLoading(false); return; }
    setItem((data as unknown as Item) ?? null);
    setLoading(false);
    supabase.rpc('bump_market_view', { p_id: id }).then(() => {});
  }, [id, session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mine = !!session && item?.seller_id === session.user.id;

  const setStatus = async (st: string) => { await supabase.from('market_items').update({ status: st }).eq('id', id); load(); };
  const del = async () => { await supabase.from('market_items').delete().eq('id', id); router.back(); };
  const chat = async () => {
    if (!session) { router.replace('/login'); return; }
    if (!item || chatBusy) return;
    setChatBusy(true); setChatErr('');
    const { data: convId, error } = await supabase.rpc('get_or_create_dm', { target: item.seller_id, target_nick: item.profiles?.nickname ?? '판매자', me_nick: profile?.nickname ?? '회원' });
    if (error || !convId) { setChatBusy(false); setChatErr('채팅을 열 수 없어요. 상대가 차단했거나 일시적 오류일 수 있어요.'); return; }
    // 첫 대화면 물건 정보를 첫 메시지로 (이미 대화중이면 그대로 열기 — 중복 방지)
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convId);
    if (!count) {
      const intro = `[중고거래] "${item.title}" (${item.price === 0 ? '나눔' : item.price.toLocaleString() + '원'}) 문의드려요!`;
      await supabase.from('messages').insert({ conversation_id: convId, sender_id: session.user.id, sender_nick: profile?.nickname ?? '회원', body: intro });
      await supabase.from('conversations').update({ last_message: intro, last_at: new Date().toISOString() }).eq('id', convId);
    }
    setChatBusy(false);
    router.push(`/chat/${convId}`);
  };

  if (loading) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (failed) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}><Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/market'))} /><View style={styles.center}><Text style={{ color: c.textSecondary, marginBottom: 12 }}>불러오지 못했어요. 연결을 확인해주세요.</Text><Pressable onPress={() => { setLoading(true); load(); }} style={{ backgroundColor: c.primary, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10 }}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>다시 시도</Text></Pressable></View></SafeAreaView>;
  if (!item) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}><Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/market'))} /><View style={styles.center}><Text style={{ color: c.textSecondary }}>삭제됐거나 없는 글이에요</Text></View></SafeAreaView>;

  const W = Math.min(width, 800);
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <Header c={c} onBack={() => (router.canGoBack() ? router.back() : router.replace('/market'))} mine={mine} onEdit={() => router.push(`/market-new?edit=${id}`)} onDel={() => setConfirmDel(true)} onReport={() => router.push(`/report?type=market&id=${id}&label=${encodeURIComponent(item.title)}`)} />
      {confirmDel && (
        <View style={[styles.confirm, { backgroundColor: c.card, borderColor: '#E5484D' }]}>
          <Text style={{ color: c.text, fontWeight: '700', flex: 1 }}>이 글을 삭제할까요?</Text>
          <Pressable onPress={() => setConfirmDel(false)} style={[styles.cb, { borderColor: c.border, borderWidth: 1 }]}><Text style={{ color: c.textSecondary, fontWeight: '800' }}>취소</Text></Pressable>
          <Pressable onPress={del} style={[styles.cb, { backgroundColor: '#E5484D' }]}><Text style={{ color: '#fff', fontWeight: '800' }}>삭제</Text></Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {item.images?.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {item.images.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: W, height: W * 0.82, backgroundColor: c.primarySoft }} contentFit="cover" transition={120} />)}
          </ScrollView>
        ) : <View style={{ width: W, height: 120, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 40 }}>📦</Text></View>}

        <View style={{ padding: 16 }}>
          {session ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Avatar url={item.profiles?.avatar_url} fallback="🙂" size={38} bg={c.primarySoft} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }}>{item.profiles?.nickname ?? '회원'}</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 12 }}>{item.dong ? `📍${item.dong}` : '춘천'}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </>
          ) : null}

          {item.status !== 'selling' ? <View style={[styles.bigSt, { backgroundColor: item.status === 'sold' ? '#8A94A6' : '#FF9F40' }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{item.status === 'sold' ? '거래완료' : '예약중'}</Text></View> : null}
          <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
          <Text style={[styles.meta, { color: c.textSecondary }]}>{item.category ?? ''} · {ago(item.created_at)}{session ? ` · 조회 ${item.view_count ?? 0}` : ''}{item.dong ? ` · 📍${item.dong}` : ''}</Text>
          <Text style={[styles.price, { color: c.text }]}>{item.price === 0 ? '나눔 🧡' : `${item.price.toLocaleString()}원`}</Text>
          {session && item.body ? <Text style={[styles.body, { color: c.text }]}>{item.body}</Text> : null}

          {!session ? (
            <Pressable onPress={() => router.push('/login')} style={[styles.gate, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
              <Icon name="lock" size={28} color={c.primaryDeep} />
              <Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 14.5, marginTop: 6 }}>상세 내용·판매자와 채팅</Text>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>로그인하면 설명을 보고 판매자와 바로 거래할 수 있어요</Text>
              <View style={[styles.gateBtn, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13.5 }}>로그인 / 가입하기</Text></View>
            </Pressable>
          ) : null}

          {mine ? (
            <View style={{ marginTop: 18 }}>
              <Text style={{ color: c.textSecondary, fontWeight: '800', fontSize: 12.5, marginBottom: 8 }}>거래 상태</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STATUSES.map((s) => (
                  <Pressable key={s.k} onPress={() => setStatus(s.k)} style={[styles.stBtn, { backgroundColor: item.status === s.k ? c.primary : c.card, borderColor: item.status === s.k ? c.primary : c.border }]}>
                    <Text style={{ color: item.status === s.k ? c.onPrimary : c.text, fontWeight: '700', fontSize: 13 }}>{s.l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {session && !mine ? (
        <View>
          {chatErr ? <Pressable onPress={() => setChatErr('')} style={{ backgroundColor: '#E5484D', paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12.5 }}>{chatErr} (탭하여 닫기)</Text></Pressable> : null}
          <View style={[styles.bottomBar, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ flex: 1, color: c.text, fontWeight: '800', fontSize: 17 }}>{item.price === 0 ? '나눔 🧡' : `${item.price.toLocaleString()}원`}</Text>
            <Pressable onPress={chat} disabled={chatBusy} style={[styles.chatBtn, { backgroundColor: c.primary, opacity: chatBusy ? 0.6 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 15 }}>{chatBusy ? '여는 중…' : '💬 채팅하기'}</Text></Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Header({ c, onBack, mine, onEdit, onDel, onReport }: any) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      {mine ? (
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Pressable onPress={onEdit} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="edit" size={13} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '800', fontSize: 13 }}>수정</Text></Pressable>
          <Pressable onPress={onDel} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon name="trash" size={13} color="#E5484D" /><Text style={{ color: '#E5484D', fontWeight: '800', fontSize: 13 }}>삭제</Text></Pressable>
        </View>
      ) : (
        <Pressable onPress={onReport} hitSlop={8}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>🚩 신고</Text></Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1.5 },
  cb: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  divider: { height: 1, marginVertical: 14 },
  bigSt: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 6 },
  price: { fontSize: 22, fontWeight: '900', marginTop: 10 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 14 },
  stBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  chatBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  gate: { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1.5, marginTop: 18 },
  gateBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
});
