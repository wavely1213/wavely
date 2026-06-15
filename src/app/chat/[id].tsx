import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Msg = { id: string; sender_id: string | null; sender_nick: string | null; body: string; created_at: string };
type Conv = { id: string; type: string; title: string | null; store_id: string | null; notice: string | null };

function hhmm(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ap = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${hh}:${String(m).padStart(2, '0')}`;
}

export default function ChatRoom() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [conv, setConv] = useState<Conv | null>(null);
  const [title, setTitle] = useState('채팅');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState(false);
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [members, setMembers] = useState<{ user_id: string; nick: string; role: string }[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [friendMsg, setFriendMsg] = useState<Record<string, string>>({});
  const [noticeEdit, setNoticeEdit] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const listRef = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: cv } = await supabase.from('conversations').select('id,type,title,store_id,notice').eq('id', id).single();
    setConv((cv as Conv) ?? null);
    // 멤버 목록
    const { data: mem } = await supabase.from('conversation_members').select('user_id,nick,role').eq('conversation_id', id).order('joined_at', { ascending: true });
    const memList = (mem as any[]) ?? [];
    setMembers(memList);
    // 제목 결정
    if (cv) {
      if ((cv as Conv).type === 'store') setTitle(`${(cv as Conv).title ?? '매장'} · 실시간 소식방`);
      else if ((cv as Conv).type === 'group') setTitle((cv as Conv).title ?? '단체 채팅');
      else {
        const other = memList.find((m) => m.user_id !== session?.user.id);
        setTitle(other?.nick ?? '1:1 채팅');
      }
    }
    const { data: ms } = await supabase.from('messages').select('id,sender_id,sender_nick,body,created_at').eq('conversation_id', id).order('created_at', { ascending: true }).limit(200);
    const msgs = (ms as Msg[]) ?? [];
    setMessages(msgs);
    // 발신자·멤버 아바타
    const ids = Array.from(new Set([...msgs.map((m) => m.sender_id), ...memList.map((m) => m.user_id)].filter((x): x is string => !!x)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,avatar_url,nickname').in('id', ids);
      const av: Record<string, string | null> = {}; const nk: Record<string, string> = {};
      (profs as any[])?.forEach((p) => { av[p.id] = p.avatar_url ?? null; nk[p.id] = p.nickname; });
      setAvatars(av);
      setMembers(memList.map((m) => ({ ...m, nick: nk[m.user_id] ?? m.nick })));
    }
    setLoading(false);
    // 읽음 처리
    if (session) await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', id).eq('user_id', session.user.id);
  }, [id, session]);

  useEffect(() => { load(); }, [load]);

  // 실시간 구독
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`room:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        setMessages((prev) => (prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as Msg]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80); }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || !session) return;
    setSending(true); setText(''); setSendErr(false);
    const { error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: session.user.id, sender_nick: profile?.nickname ?? '회원', body: t });
    if (error) { setText(t); setSendErr(true); setSending(false); return; } // 실패 시 입력 복원 (메시지 유실 방지)
    await supabase.from('conversations').update({ last_message: t, last_at: new Date().toISOString() }).eq('id', id);
    setSending(false);
  };

  const addFriend = async (m: { user_id: string; nick: string }) => {
    const { data } = await supabase.rpc('request_friend', { target: m.user_id });
    const r = data as string;
    const txt = r === 'requested' ? '요청 보냄 ✓' : r === 'accepted' ? '친구 완료 🎉' : r === 'exists' ? '이미 친구' : r === 'self' ? '나' : r === 'blocked' ? '불가' : '오류';
    setFriendMsg((prev) => ({ ...prev, [m.user_id]: txt }));
  };

  const myRole = members.find((m) => m.user_id === session?.user.id)?.role ?? 'member';
  const kick = async (m: { user_id: string; nick: string }) => { await supabase.rpc('kick_member', { cid: id, target: m.user_id }); load(); };
  const setSubhost = async (m: { user_id: string }, makeSub: boolean) => { await supabase.rpc('set_subhost', { cid: id, target: m.user_id, make_sub: makeSub }); load(); };
  const transferOwner = async (m: { user_id: string; nick: string }) => { await supabase.rpc('transfer_owner', { cid: id, target: m.user_id }); load(); };
  const saveNotice = async () => { await supabase.rpc('set_notice', { cid: id, txt: noticeText }); setConv((p) => (p ? { ...p, notice: noticeText.trim() || null } : p)); setNoticeEdit(false); };

  const renderItem = ({ item }: { item: Msg }) => {
    const mine = item.sender_id === session?.user.id;
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        {!mine && conv?.type !== 'dm' ? <Text style={[styles.nick, { color: c.textSecondary }]}>{item.sender_nick ?? '회원'}</Text> : null}
        {!mine && conv?.type !== 'dm' ? <Avatar url={item.sender_id ? avatars[item.sender_id] : null} fallback="🙂" size={28} bg={c.primarySoft} /> : null}
        <View style={[styles.bubble, mine ? { backgroundColor: c.primary } : { backgroundColor: c.card, borderColor: c.border, borderWidth: 1 }]}>
          <Text style={{ color: mine ? c.onPrimary : c.text, fontSize: 14.5, lineHeight: 20 }}>{item.body}</Text>
        </View>
        <Text style={[styles.time, { color: c.textSecondary }]}>{hhmm(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/chats'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
        <Pressable onPress={() => setMembersOpen(true)} hitSlop={8} style={{ minWidth: 44, alignItems: 'flex-end' }}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }}>👥 {members.length}</Text>
        </Pressable>
      </View>

      {conv?.notice ? (
        <View style={[styles.noticeBar, { backgroundColor: c.primarySoft }]}>
          <Text style={[styles.noticeTxt, { color: c.primaryDeep }]} numberOfLines={2}>📢 {conv.notice}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={c.primary} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>{conv?.type === 'store' ? '이 매장 소식을 가장 먼저 남겨보세요!' : '첫 메시지를 보내보세요'}</Text>}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
          {sendErr ? <Text style={{ color: '#E5484D', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: 4 }}>전송에 실패했어요 — 다시 보내주세요</Text> : null}
          {session ? (
            <View style={[styles.inputBar, { backgroundColor: c.card, borderColor: c.border }]}>
              <TextInput style={[styles.input, { backgroundColor: c.background, color: c.text, borderColor: c.border }]} placeholder="메시지 입력..." placeholderTextColor={c.textSecondary} value={text} onChangeText={(v) => { setText(v); if (sendErr) setSendErr(false); }} onSubmitEditing={send} returnKeyType="send" />
              <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, { backgroundColor: text.trim() ? c.primary : c.backgroundElement }]}>
                <Text style={{ color: text.trim() ? c.onPrimary : c.textSecondary, fontWeight: '800' }}>전송</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.inputBar, { backgroundColor: c.card, borderColor: c.border, justifyContent: 'center' }]} onPress={() => router.push('/login')}>
              <Text style={{ color: c.primary, fontWeight: '700' }}>로그인하고 채팅하기</Text>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      )}

      {/* 참여 인원 모달 */}
      <Modal visible={membersOpen} transparent animationType="slide" onRequestClose={() => setMembersOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMembersOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>참여 인원 {members.length}명</Text>

            {/* 공지 (방장·부방장만 편집) */}
            {(myRole === 'owner' || myRole === 'subhost') ? (
              noticeEdit ? (
                <View style={{ marginBottom: 10, gap: 8 }}>
                  <TextInput style={[styles.noticeInput, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="공지 내용" placeholderTextColor={c.textSecondary} value={noticeText} onChangeText={setNoticeText} multiline />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[styles.miniBtn, { backgroundColor: c.primary }]} onPress={saveNotice}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12 }}>공지 저장</Text></Pressable>
                    <Pressable style={[styles.miniBtnO, { borderColor: c.border }]} onPress={() => setNoticeEdit(false)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>취소</Text></Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={[styles.noticeEditBtn, { borderColor: c.primary }]} onPress={() => { setNoticeText(conv?.notice ?? ''); setNoticeEdit(true); }}>
                  <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12.5 }}>📢 {conv?.notice ? '공지 수정' : '공지 작성'}</Text>
                </Pressable>
              )
            ) : null}

            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {members.map((m) => {
                const mine = m.user_id === session?.user.id;
                const canKick = !mine && m.role !== 'owner' && (myRole === 'owner' || (myRole === 'subhost' && m.role === 'member'));
                const canSub = !mine && myRole === 'owner' && conv?.type === 'group' && m.role !== 'owner';
                const canTransfer = !mine && myRole === 'owner' && conv?.type === 'group';
                return (
                  <View key={m.user_id} style={[styles.memberRow, { borderColor: c.border }]}>
                    <Avatar url={avatars[m.user_id]} fallback="🙂" size={38} bg={c.primarySoft} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.memberNick, { color: c.text }]}>{m.nick}{mine ? ' (나)' : ''}</Text>
                      {m.role === 'owner' ? <Text style={[styles.memberRole, { color: c.primaryDeep }]}>👑 방장</Text> : m.role === 'subhost' ? <Text style={[styles.memberRole, { color: '#D9730D' }]}>⭐ 부방장</Text> : null}
                      <View style={styles.actRow}>
                        {!mine && !friendMsg[m.user_id] ? <Pressable onPress={() => addFriend(m)}><Text style={[styles.act, { color: c.primary }]}>🤝 친구추가</Text></Pressable> : null}
                        {friendMsg[m.user_id] ? <Text style={[styles.act, { color: c.verify }]}>{friendMsg[m.user_id]}</Text> : null}
                        {canSub ? <Pressable onPress={() => setSubhost(m, m.role !== 'subhost')}><Text style={[styles.act, { color: '#D9730D' }]}>{m.role === 'subhost' ? '부방장 해제' : '부방장 임명'}</Text></Pressable> : null}
                        {canTransfer ? <Pressable onPress={() => transferOwner(m)}><Text style={[styles.act, { color: c.primaryDeep }]}>👑 방장 넘기기</Text></Pressable> : null}
                        {canKick ? <Pressable onPress={() => kick(m)}><Text style={[styles.act, { color: '#E5484D' }]}>내보내기</Text></Pressable> : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 4, flexWrap: 'wrap' },
  nick: { fontSize: 11, fontWeight: '700', width: '100%', marginBottom: 2, paddingHorizontal: 4 },
  bubble: { maxWidth: '72%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  time: { fontSize: 10, marginBottom: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#8888', marginVertical: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, paddingHorizontal: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11, paddingHorizontal: 4, borderBottomWidth: 1 },
  memberNick: { fontSize: 15, fontWeight: '700' },
  memberRole: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  actRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  act: { fontSize: 12, fontWeight: '800' },
  noticeBar: { paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, borderColor: 'transparent' },
  noticeTxt: { fontSize: 12.5, fontWeight: '700', lineHeight: 17 },
  noticeInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  noticeEditBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginBottom: 10 },
  miniBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  miniBtnO: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
});
