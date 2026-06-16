import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Row = {
  convId: string; type: string; title: string; status: string;
  lastMessage: string | null; lastAt: string | null; unread: boolean; otherId: string | null; otherNick: string; avatar: string | null;
};

function ago(iso: string | null) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`;
  return `${Math.floor(diff / 86400)}일`;
}

export default function ChatsTab() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'created'>('menu');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupVis, setGroupVis] = useState<'public' | 'private'>('private');
  const [joinCode, setJoinCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'all' | 'dm' | 'group' | 'store'>('all');
  const [publicRooms, setPublicRooms] = useState<{ id: string; title: string; members: number; lastMessage: string | null }[]>([]);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const me = session.user.id;
    const { data: mem } = await supabase
      .from('conversation_members')
      .select('status, last_read_at, conversations!inner(id, type, title, store_id, last_message, last_at)')
      .eq('user_id', me);
    const list = (mem as any[]) ?? [];
    const convIds = list.map((m) => m.conversations.id);
    const membersByConv: Record<string, { user_id: string; nick: string }[]> = {};
    if (convIds.length) {
      const { data: all } = await supabase.from('conversation_members').select('conversation_id,user_id,nick').in('conversation_id', convIds);
      for (const m of (all as any[]) ?? []) (membersByConv[m.conversation_id] ??= []).push(m);
    }
    const mapped: Row[] = list.map((m) => {
      const cv = m.conversations;
      const other = (membersByConv[cv.id] ?? []).filter((x) => x.user_id !== me)[0];
      let title = cv.title ?? '채팅';
      if (cv.type === 'dm') title = other?.nick ?? '1:1 채팅';
      else if (cv.type === 'store') title = `${cv.title ?? '매장'} · 소식방`;
      const unread = !!cv.last_at && (!m.last_read_at || new Date(cv.last_at) > new Date(m.last_read_at));
      return { convId: cv.id, type: cv.type, title, status: m.status, lastMessage: cv.last_message, lastAt: cv.last_at, unread, otherId: other?.user_id ?? null, otherNick: other?.nick ?? '회원', avatar: null as string | null };
    });
    // DM 상대 아바타
    const dmIds = Array.from(new Set(mapped.filter((r) => r.type === 'dm' && r.otherId).map((r) => r.otherId!)));
    if (dmIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id,avatar_url').in('id', dmIds);
      const avs: Record<string, string | null> = {};
      (profs as any[])?.forEach((p) => (avs[p.id] = p.avatar_url ?? null));
      mapped.forEach((r) => { if (r.type === 'dm' && r.otherId) r.avatar = avs[r.otherId] ?? null; });
    }
    mapped.sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
    setRows(mapped);

    // 공개 채팅방 추천 (내가 안 든 방)
    const mine = new Set(mapped.map((r) => r.convId));
    const { data: pub } = await supabase.from('conversations').select('id,title,last_message,last_at,conversation_members(count)').eq('type', 'group').eq('visibility', 'public').order('last_at', { ascending: false }).limit(20);
    setPublicRooms(((pub as any[]) ?? []).filter((p) => !mine.has(p.id)).map((p) => ({ id: p.id, title: p.title ?? '공개 채팅방', members: p.conversation_members?.[0]?.count ?? 0, lastMessage: p.last_message })));
    setLoading(false);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = async (r: Row) => { await supabase.from('conversation_members').update({ status: 'accepted' }).eq('conversation_id', r.convId).eq('user_id', session!.user.id); load(); };
  const reject = async (r: Row) => { await supabase.from('conversation_members').delete().eq('conversation_id', r.convId).eq('user_id', session!.user.id); load(); };
  const block = async (r: Row) => {
    if (r.otherId) await supabase.from('blocks').insert({ blocker_id: session!.user.id, blocked_id: r.otherId });
    await supabase.from('conversation_members').delete().eq('conversation_id', r.convId).eq('user_id', session!.user.id);
    load();
  };

  const createGroup = async () => {
    if (!groupTitle.trim()) { setErr('채팅방 이름을 입력해주세요'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('create_group', { gtitle: groupTitle.trim(), me_nick: profile?.nickname ?? '회원', vis: groupVis });
    setBusy(false);
    if (error || !data?.[0]) { setErr('생성 실패'); return; }
    setNewCode(data[0].code); setMode('created'); load();
  };
  const joinPublic = async (roomId: string) => {
    await supabase.from('conversation_members').insert({ conversation_id: roomId, user_id: session!.user.id, nick: profile?.nickname ?? '회원', status: 'accepted' });
    router.push(`/chat/${roomId}`);
  };
  const joinGroup = async () => {
    if (!joinCode.trim()) { setErr('초대 코드를 입력해주세요'); return; }
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('join_by_code', { gcode: joinCode.trim(), me_nick: profile?.nickname ?? '회원' });
    setBusy(false);
    if (error || !data) { setErr('코드가 올바르지 않아요'); return; }
    closeMenu(); router.push(`/chat/${data}`);
  };
  const openMenu = () => { setMode('menu'); setGroupTitle(''); setGroupVis('private'); setJoinCode(''); setNewCode(''); setErr(''); setMenuOpen(true); };
  const closeMenu = () => setMenuOpen(false);

  if (!session) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}><Text style={[styles.hTitle, { color: c.text }]}>💬 채팅</Text></View>
        <View style={styles.center}>
          <Text style={{ color: c.textSecondary, marginBottom: 14 }}>로그인하면 채팅을 이용할 수 있어요</Text>
          <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={() => router.push('/login')}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>로그인</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const requests = rows.filter((r) => r.status === 'pending');
  const active = rows.filter((r) => r.status === 'accepted');
  const counts = { all: active.length, dm: active.filter((r) => r.type === 'dm').length, group: active.filter((r) => r.type === 'group').length, store: active.filter((r) => r.type === 'store').length };
  const shown = filter === 'all' ? active : active.filter((r) => r.type === filter);
  const CHAT_TABS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: '전체' }, { key: 'dm', label: '1:1' }, { key: 'group', label: '그룹' }, { key: 'store', label: '소식' },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Text style={[styles.hTitle, { color: c.text }]}>💬 채팅</Text>
        <Pressable onPress={openMenu} hitSlop={8} style={[styles.newBtn, { backgroundColor: c.primarySoft }]}><Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 13 }}>＋ 새 채팅</Text></Pressable>
      </View>

      {/* 채팅 카테고리 */}
      <View style={[styles.tabBar, { backgroundColor: c.card, borderColor: c.border }]}>
        {CHAT_TABS.map((t) => {
          const on = filter === t.key;
          const n = counts[t.key];
          return (
            <Pressable key={t.key} onPress={() => setFilter(t.key)} style={[styles.tabChip, { backgroundColor: on ? c.primary : c.background }]}>
              <Text style={[styles.tabTxt, { color: on ? c.onPrimary : c.textSecondary }]}>{t.label}{n > 0 ? ` ${n}` : ''}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
          {requests.length > 0 && (
            <>
              <Text style={[styles.sect, { color: c.text }]}>💌 받은 톡 요청 {requests.length}</Text>
              {requests.map((r) => (
                <View key={r.convId} style={[styles.reqCard, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.reqNick, { color: c.text }]}>{r.otherNick}님이 1:1 채팅을 요청했어요</Text>
                  {r.lastMessage ? <Text style={[styles.reqMsg, { color: c.textSecondary }]} numberOfLines={1}>“{r.lastMessage}”</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Pressable style={[styles.aBtn, { backgroundColor: c.primary }]} onPress={() => accept(r)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 13 }}>수락</Text></Pressable>
                    <Pressable style={[styles.aBtnO, { borderColor: c.border }]} onPress={() => reject(r)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13 }}>거절</Text></Pressable>
                    <Pressable style={[styles.aBtnO, { borderColor: '#E5484D' }]} onPress={() => block(r)}><Text style={{ color: '#E5484D', fontWeight: '700', fontSize: 13 }}>차단</Text></Pressable>
                  </View>
                </View>
              ))}
            </>
          )}

          <Text style={[styles.sect, { color: c.text }]}>{filter === 'all' ? '채팅' : CHAT_TABS.find((t) => t.key === filter)?.label + ' 채팅'}</Text>
          {shown.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>{filter === 'all' ? '아직 채팅이 없어요.\n매장 소식방·1:1 톡·단체 채팅을 시작해보세요!' : '이 카테고리에 채팅이 없어요'}</Text>
          ) : (
            shown.map((r) => (
              <Pressable key={r.convId} onPress={() => router.push(`/chat/${r.convId}`)} style={[styles.chatRow, { borderColor: c.border }]}>
                {r.type === 'dm'
                  ? <Avatar url={r.avatar} fallback="🙂" size={46} bg={c.primarySoft} />
                  : <View style={[styles.avatar, { backgroundColor: r.type === 'store' ? c.verify : '#FF9F40' }]}><Text style={{ fontSize: 18 }}>{r.type === 'store' ? '🏪' : '👥'}</Text></View>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.chatTitle, { color: c.text }]} numberOfLines={1}>{r.title}</Text>
                  <Text style={[styles.chatLast, { color: c.textSecondary }]} numberOfLines={1}>{r.lastMessage ?? '대화를 시작해보세요'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.chatTime, { color: c.textSecondary }]}>{ago(r.lastAt)}</Text>
                  {r.unread ? <View style={[styles.dot, { backgroundColor: c.primary }]} /> : null}
                </View>
              </Pressable>
            ))
          )}

          {/* 추천 공개 채팅방 */}
          {publicRooms.length > 0 && (
            <>
              <Text style={[styles.sect, { color: c.text }]}>🔥 추천 공개 채팅방</Text>
              {publicRooms.map((p) => (
                <View key={p.id} style={[styles.chatRow, { borderColor: c.border }]}>
                  <View style={[styles.avatar, { backgroundColor: '#FF9F40' }]}><Text style={{ fontSize: 18 }}>🌐</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.chatTitle, { color: c.text }]} numberOfLines={1}>{p.title}</Text>
                    <Text style={[styles.chatLast, { color: c.textSecondary }]} numberOfLines={1}>👥 {p.members}명 · {p.lastMessage ?? '새 채팅방'}</Text>
                  </View>
                  <Pressable style={[styles.joinBtn, { backgroundColor: c.primary }]} onPress={() => joinPublic(p.id)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12.5 }}>참여</Text></Pressable>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* 새 채팅 모달 */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={closeMenu}>
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            {mode === 'menu' && (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>새 채팅</Text>
                <Pressable style={[styles.optRow, { borderColor: c.border }]} onPress={() => { setMode('create'); setErr(''); }}>
                  <Text style={{ fontSize: 20 }}>👥</Text><Text style={[styles.optTxt, { color: c.text }]}>단체 채팅 만들기</Text>
                </Pressable>
                <Pressable style={[styles.optRow, { borderColor: c.border }]} onPress={() => { setMode('join'); setErr(''); }}>
                  <Text style={{ fontSize: 20 }}>🔑</Text><Text style={[styles.optTxt, { color: c.text }]}>초대 코드로 참여</Text>
                </Pressable>
                <Text style={[styles.hint, { color: c.textSecondary }]}>1:1 톡은 매장 상세의 “사장님께 문의”에서 시작할 수 있어요.</Text>
              </>
            )}
            {mode === 'create' && (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>단체 채팅 만들기</Text>
                <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="채팅방 이름 (예: 퇴계동 맛집 모임)" placeholderTextColor={c.textSecondary} value={groupTitle} onChangeText={setGroupTitle} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable onPress={() => setGroupVis('private')} style={[styles.visBtn, { borderColor: groupVis === 'private' ? c.primary : c.border, backgroundColor: groupVis === 'private' ? c.primarySoft : c.card }]}>
                    <Text style={[styles.visTtl, { color: groupVis === 'private' ? c.primaryDeep : c.text }]}>🔒 비밀방</Text>
                    <Text style={[styles.visSub, { color: c.textSecondary }]}>초대 코드로만 입장</Text>
                  </Pressable>
                  <Pressable onPress={() => setGroupVis('public')} style={[styles.visBtn, { borderColor: groupVis === 'public' ? c.primary : c.border, backgroundColor: groupVis === 'public' ? c.primarySoft : c.card }]}>
                    <Text style={[styles.visTtl, { color: groupVis === 'public' ? c.primaryDeep : c.text }]}>🌐 공개방</Text>
                    <Text style={[styles.visSub, { color: c.textSecondary }]}>추천 목록에 노출</Text>
                  </Pressable>
                </View>
                {err ? <Text style={styles.errTxt}>{err}</Text> : null}
                <Pressable style={[styles.cta, { backgroundColor: c.primary }]} onPress={createGroup} disabled={busy}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>{busy ? '만드는 중...' : '만들기'}</Text></Pressable>
              </>
            )}
            {mode === 'join' && (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>초대 코드로 참여</Text>
                <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, letterSpacing: 4, textAlign: 'center', fontSize: 20, fontWeight: '800' }]} placeholder="ABC123" placeholderTextColor={c.textSecondary} value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" maxLength={6} />
                {err ? <Text style={styles.errTxt}>{err}</Text> : null}
                <Pressable style={[styles.cta, { backgroundColor: c.primary }]} onPress={joinGroup} disabled={busy}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>{busy ? '참여 중...' : '참여하기'}</Text></Pressable>
              </>
            )}
            {mode === 'created' && (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>{groupVis === 'public' ? '🌐 공개방이 만들어졌어요!' : '🔒 비밀방이 만들어졌어요!'}</Text>
                <Text style={[styles.hint, { color: c.textSecondary, marginBottom: 4 }]}>{groupVis === 'public' ? '추천 목록에 노출돼요. 아래 코드로 바로 초대할 수도 있어요.' : '이 코드를 아는 사람만 입장할 수 있어요. 친구에게 공유하세요.'}</Text>
                <View style={[styles.codeBox, { backgroundColor: c.primarySoft }]}><Text style={[styles.codeTxt, { color: c.primaryDeep }]}>{newCode}</Text></View>
                <Pressable style={[styles.cta, { backgroundColor: c.primary }]} onPress={closeMenu}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>확인</Text></Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  hTitle: { fontSize: 18, fontWeight: '800' },
  newBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  tabBar: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  tabTxt: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  sect: { fontSize: 14, fontWeight: '800', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  empty: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 14, lineHeight: 20 },
  reqCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  reqNick: { fontSize: 14.5, fontWeight: '800' },
  reqMsg: { fontSize: 13, marginTop: 4 },
  aBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 9 },
  aBtnO: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9, borderWidth: 1 },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chatTitle: { fontSize: 15, fontWeight: '800' },
  chatLast: { fontSize: 13, marginTop: 2 },
  chatTime: { fontSize: 11 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8888', marginVertical: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, paddingHorizontal: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 8, borderBottomWidth: 1 },
  optTxt: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, paddingHorizontal: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginTop: 6 },
  errTxt: { color: '#E5484D', fontWeight: '700', fontSize: 12.5, marginTop: 8, paddingHorizontal: 4 },
  cta: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  codeBox: { borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  codeTxt: { fontSize: 30, fontWeight: '900', letterSpacing: 6 },
  visBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2 },
  visTtl: { fontSize: 14, fontWeight: '800' },
  visSub: { fontSize: 11, fontWeight: '600' },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
});

