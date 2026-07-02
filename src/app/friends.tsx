import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Friend = { uid: string; nick: string; reqId: string; avatar: string | null };

export default function FriendsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [uid, setUid] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const me = session.user.id;
    const { data } = await supabase.from('friendships').select('id,requester_id,addressee_id,status').or(`requester_id.eq.${me},addressee_id.eq.${me}`);
    const rows = (data as any[]) ?? [];
    const otherIds = Array.from(new Set(rows.map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id))));
    const nicks: Record<string, string> = {};
    const avs: Record<string, string | null> = {};
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id,nickname,avatar_url').in('id', otherIds);
      (profs as any[])?.forEach((p) => { nicks[p.id] = p.nickname; avs[p.id] = p.avatar_url ?? null; });
    }
    const fr: Friend[] = []; const req: Friend[] = [];
    for (const r of rows) {
      const other = r.requester_id === me ? r.addressee_id : r.requester_id;
      const item = { uid: other, nick: nicks[other] ?? '회원', reqId: r.requester_id, avatar: avs[other] ?? null };
      if (r.status === 'accepted') fr.push(item);
      else if (r.addressee_id === me) req.push(item); // 내가 받은 요청
    }
    setFriends(fr); setRequests(req); setLoading(false);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resultMsg = (r: string, kind: '아이디' | '코드') => {
    if (r === 'requested') setMsg('✅ 친구 요청을 보냈어요!');
    else if (r === 'accepted') setMsg('🎉 친구가 됐어요!');
    else if (r === 'exists') setMsg('이미 친구이거나 요청 중이에요');
    else if (r === 'self') setMsg(`본인 ${kind}는 추가할 수 없어요`);
    else if (r === 'blocked') setMsg('추가할 수 없는 상대예요');
    else setMsg(`없는 ${kind}예요`);
  };
  const addById = async () => {
    setMsg('');
    if (!uid.trim()) { setMsg('친구 아이디를 입력해주세요'); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('request_friend_by_username', { uname: uid.trim() });
    setBusy(false);
    if (error) { setMsg('오류: ' + error.message); return; }
    setUid(''); resultMsg(data as string, '아이디'); load();
  };
  const addByCode = async () => {
    setMsg('');
    if (!code.trim()) { setMsg('친구 코드를 입력해주세요'); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc('request_friend_by_code', { code: code.trim() });
    setBusy(false);
    if (error) { setMsg('오류: ' + error.message); return; }
    setCode(''); resultMsg(data as string, '코드'); load();
  };
  const respond = async (req: Friend, accept: boolean) => { await supabase.rpc('respond_friend', { req: req.reqId, accept }); load(); };
  const unfriend = async (f: Friend) => { await supabase.from('friendships').delete().or(`and(requester_id.eq.${session!.user.id},addressee_id.eq.${f.uid}),and(requester_id.eq.${f.uid},addressee_id.eq.${session!.user.id})`); load(); };
  const talk = async (f: Friend) => {
    const { data, error } = await supabase.rpc('open_friend_dm', { friend: f.uid, me_nick: profile?.nickname ?? '회원', friend_nick: f.nick });
    if (!error && data) router.push(`/chat/${data}`);
  };
  const copyCode = () => {
    const fc = profile?.friend_code ?? '';
    if (Platform.OS === 'web') { (globalThis as any).navigator?.clipboard?.writeText(fc); setMsg('📋 내 코드를 복사했어요!'); }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!session || !profile) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <Header c={c} onBack={goBack} />
        <View style={styles.center}><Text style={{ color: c.textSecondary }}>로그인 후 이용해주세요</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <Header c={c} onBack={goBack} />
      {loading ? <ActivityIndicator color={c.primary} style={{ marginTop: 30 }} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* 내 아이디 / 코드 */}
          <View style={[styles.codeCard, { backgroundColor: c.primarySoft }]}>
            <Text style={[styles.codeLabel, { color: c.primaryDeep }]}>내 아이디</Text>
            {profile.username ? (
              <Text style={[styles.codeVal, { color: c.primaryDeep }]}>@{profile.username}</Text>
            ) : (
              <Pressable onPress={() => router.push('/account-edit')} style={{ marginTop: 6 }}><Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 15 }}>아이디를 설정해주세요 ›</Text></Pressable>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <Text style={[styles.codeHint, { color: c.primaryDeep, marginTop: 0 }]}>친구코드: {profile.friend_code ?? '------'}</Text>
              {Platform.OS === 'web' ? <Pressable onPress={copyCode} style={[styles.copyBtn, { borderColor: c.primary }]}><Text style={{ color: c.primaryDeep, fontWeight: '800', fontSize: 11 }}>복사</Text></Pressable> : null}
            </View>
          </View>

          {/* 아이디로 추가 (주) + 코드로 추가 (보조) */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[styles.sect, { color: c.text, paddingHorizontal: 0 }]}>아이디로 친구 추가</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderColor: c.border, paddingVertical: 0 }]}>
                <Text style={{ color: c.textSecondary, fontSize: 15, fontWeight: '700' }}>@</Text>
                <TextInput style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 11, marginLeft: 2 }} placeholder="친구 아이디" placeholderTextColor={c.textSecondary} value={uid} onChangeText={(t) => setUid(t.toLowerCase())} autoCapitalize="none" maxLength={20} />
              </View>
              <Pressable style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={addById} disabled={busy}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>{busy ? '...' : '추가'}</Text></Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput style={[styles.input, { flex: 1, backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="또는 친구 코드" placeholderTextColor={c.textSecondary} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={8} />
              <Pressable style={[styles.addBtnO, { borderColor: c.border }]} onPress={addByCode} disabled={busy}><Text style={{ color: c.textSecondary, fontWeight: '800' }}>코드</Text></Pressable>
            </View>
            {msg ? <Text style={{ color: msg.startsWith('✅') || msg.startsWith('🎉') || msg.startsWith('📋') ? c.verify : '#E5484D', fontWeight: '700', fontSize: 12.5, marginTop: 8 }}>{msg}</Text> : null}
          </View>

          {/* 받은 친구 요청 */}
          {requests.length > 0 && (
            <>
              <Text style={[styles.sect, { color: c.text }]}>🤝 받은 친구 요청 {requests.length}</Text>
              {requests.map((f) => (
                <View key={f.uid} style={[styles.row, { borderColor: c.border }]}>
                  <Avatar url={f.avatar} fallback="🙋" size={40} bg={c.primarySoft} />
                  <Text style={[styles.nick, { color: c.text, flex: 1 }]}>{f.nick}</Text>
                  <Pressable style={[styles.sBtn, { backgroundColor: c.primary }]} onPress={() => respond(f, true)}><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12.5 }}>수락</Text></Pressable>
                  <Pressable style={[styles.sBtnO, { borderColor: c.border }]} onPress={() => respond(f, false)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12.5 }}>거절</Text></Pressable>
                </View>
              ))}
            </>
          )}

          {/* 친구 목록 */}
          <Text style={[styles.sect, { color: c.text }]}>친구 {friends.length}</Text>
          {friends.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>아직 친구가 없어요. 코드를 공유해보세요!</Text>
          ) : friends.map((f) => (
            <View key={f.uid} style={[styles.row, { borderColor: c.border }]}>
              <Avatar url={f.avatar} fallback="🙆" size={40} bg={c.verify} />
              <Text style={[styles.nick, { color: c.text, flex: 1 }]}>{f.nick}</Text>
              <Pressable style={[styles.sBtn, { backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }]} onPress={() => talk(f)}><Icon name="chat" size={13} color={c.onPrimary} /><Text style={{ color: c.onPrimary, fontWeight: '800', fontSize: 12.5 }}>톡</Text></Pressable>
              <Pressable style={[styles.sBtnO, { borderColor: c.border }]} onPress={() => unfriend(f)}><Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12.5 }}>삭제</Text></Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header({ c, onBack }: { c: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      <Text style={[styles.hTitle, { color: c.text }]}>🤝 친구</Text>
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
  codeCard: { margin: 16, borderRadius: 14, padding: 16 },
  codeLabel: { fontSize: 12.5, fontWeight: '800' },
  codeVal: { fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  copyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  codeHint: { fontSize: 11.5, marginTop: 8, opacity: 0.85 },
  sect: { fontSize: 14, fontWeight: '800', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, letterSpacing: 2 },
  addBtn: { paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnO: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  empty: { fontSize: 13, paddingHorizontal: 16, paddingVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nick: { fontSize: 15, fontWeight: '700' },
  sBtn: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9 },
  sBtnO: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
});
