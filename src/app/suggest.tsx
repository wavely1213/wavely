import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CATS = ['기능 제안', '버그 신고', '디자인', '기타'];
const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: '접수', color: '#8A94A6' },
  reviewing: { label: '검토중', color: '#FF9F40' },
  planned: { label: '적용예정', color: '#4D96FF' },
  done: { label: '적용완료', color: '#11B981' },
  rejected: { label: '반려', color: '#E5484D' },
};

type Sg = { id: string; category: string | null; title: string; body: string | null; status: string; admin_note: string | null; author_nick: string | null; created_at: string };

export default function SuggestScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [cat, setCat] = useState(CATS[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [list, setList] = useState<Sg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from('suggestions').select('id,category,title,body,status,admin_note,author_nick,created_at').order('created_at', { ascending: false }).limit(100);
    setList((data as Sg[]) ?? []);
    setLoading(false);
  }, [session]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const submit = async () => {
    setMsg('');
    if (!session) { router.push('/login'); return; }
    if (!title.trim()) { setMsg('제목을 입력해주세요'); return; }
    setSending(true);
    const { error } = await supabase.from('suggestions').insert({ author_id: session.user.id, author_nick: profile?.nickname ?? null, category: cat, title: title.trim(), body: body.trim() || null });
    setSending(false);
    if (error) { setMsg('등록 실패: ' + error.message); return; }
    setTitle(''); setBody(''); setMsg('✅ 제안이 접수됐어요. 검토 후 반영 여부를 알려드릴게요!');
    load();
  };

  const setStatus = async (id: string, status: string) => { await supabase.from('suggestions').update({ status }).eq('id', id); load(); };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.title, { color: c.text }]}>💡 사용 개선 제안</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* 작성 폼 */}
        <View style={[styles.formBox, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.formHead, { color: c.text }]}>아이디어가 있으세요?</Text>
          <Text style={[styles.formSub, { color: c.textSecondary }]}>불편한 점·있으면 좋겠는 기능 뭐든 남겨주세요. 운영자가 직접 확인합니다.</Text>
          <View style={styles.chips}>
            {CATS.map((k) => (
              <Pressable key={k} onPress={() => setCat(k)} style={[styles.chip, { backgroundColor: cat === k ? c.primary : c.background, borderColor: cat === k ? c.primary : c.border }]}>
                <Text style={[styles.chipTxt, { color: cat === k ? c.onPrimary : c.textSecondary }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]} placeholder="제목 (한 줄 요약)" placeholderTextColor={c.textSecondary} value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, minHeight: 90, textAlignVertical: 'top' }]} placeholder="자세한 내용 (선택)" placeholderTextColor={c.textSecondary} value={body} onChangeText={setBody} multiline />
          {msg ? <Text style={{ color: msg.startsWith('✅') ? c.verify : '#E5484D', fontWeight: '700', marginTop: 4 }}>{msg}</Text> : null}
          <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={submit} disabled={sending}>
            <Text style={[styles.btnTxt, { color: c.onPrimary }]}>{sending ? '등록중...' : '제안 보내기'}</Text>
          </Pressable>
        </View>

        <Text style={[styles.listHead, { color: c.text }]}>{isAdmin ? `📋 전체 제안 ${list.length}건 (관리자 보고서)` : '내가 남긴 제안'}</Text>
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 20 }} />
        ) : list.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>아직 제안이 없어요</Text>
        ) : (
          list.map((s) => {
            const st = STATUS[s.status] ?? STATUS.new;
            return (
              <View key={s.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.catTag, { backgroundColor: c.primarySoft }]}><Text style={[styles.catTagTxt, { color: c.primaryDeep }]}>{s.category}</Text></View>
                  <View style={[styles.statusTag, { backgroundColor: st.color }]}><Text style={styles.statusTxt}>{st.label}</Text></View>
                </View>
                <Text style={[styles.cardTitle, { color: c.text }]}>{s.title}</Text>
                {s.body ? <Text style={[styles.cardBody, { color: c.textSecondary }]}>{s.body}</Text> : null}
                {isAdmin && <Text style={[styles.byTxt, { color: c.textSecondary }]}>by {s.author_nick ?? '회원'}</Text>}

                {/* 관리자: 상태 변경 */}
                {isAdmin && (
                  <View style={styles.statusRow}>
                    {Object.keys(STATUS).map((k) => (
                      <Pressable key={k} onPress={() => setStatus(s.id, k)} style={[styles.stBtn, { borderColor: s.status === k ? STATUS[k].color : c.border, backgroundColor: s.status === k ? STATUS[k].color : 'transparent' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: s.status === k ? '#fff' : c.textSecondary }}>{STATUS[k].label}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800' },
  formBox: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  formHead: { fontSize: 16, fontWeight: '800' },
  formSub: { fontSize: 12.5, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontSize: 12.5, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnTxt: { fontSize: 15, fontWeight: '800' },
  listHead: { fontSize: 15, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  empty: { fontSize: 13, paddingVertical: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catTagTxt: { fontSize: 11, fontWeight: '800' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardBody: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  byTxt: { fontSize: 11, marginTop: 6 },
  statusRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 10 },
  stBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, borderWidth: 1 },
});
