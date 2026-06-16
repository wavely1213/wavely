import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const REASONS = ['스팸·광고', '욕설·비방', '음란·불법', '허위정보', '도배', '기타'];
const TYPE_LABEL: Record<string, string> = { post: '게시글', comment: '댓글', review: '리뷰', store: '매장', place: '장소', user: '사용자', market: '중고거래 글', job: '구인구직 글' };

export default function ReportScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile } = useAuth();
  const { type = '', id = '', label = '' } = useLocalSearchParams<{ type: string; id: string; label: string }>();

  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setMsg('');
    if (!session) { router.replace('/login'); return; }
    if (!reason) { setMsg('신고 사유를 선택해주세요'); return; }
    setSending(true);
    const { error } = await supabase.from('reports').insert({
      reporter_id: session.user.id, reporter_nick: profile?.nickname ?? null,
      target_type: String(type), target_id: String(id), target_label: String(label) || null,
      reason, detail: detail.trim() || null,
    });
    setSending(false);
    if (error) { setMsg('신고 실패: ' + error.message); return; }
    setDone(true);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text></Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>🚩 신고하기</Text>
        <View style={{ width: 24 }} />
      </View>

      {done ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={[styles.doneTxt, { color: c.text }]}>신고가 접수됐어요</Text>
          <Text style={[styles.doneSub, { color: c.textSecondary }]}>운영자가 확인 후 조치할게요. 감사합니다!</Text>
          <Pressable style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Text style={[styles.btnTxt, { color: c.onPrimary }]}>확인</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={[styles.targetBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.targetType, { color: c.primaryDeep }]}>{TYPE_LABEL[String(type)] ?? '대상'}</Text>
            {label ? <Text style={[styles.targetLabel, { color: c.text }]} numberOfLines={2}>{label}</Text> : null}
          </View>

          <Text style={[styles.label, { color: c.textSecondary }]}>신고 사유</Text>
          <View style={styles.chips}>
            {REASONS.map((r) => (
              <Pressable key={r} onPress={() => setReason(r)} style={[styles.chip, { backgroundColor: reason === r ? c.primary : c.card, borderColor: reason === r ? c.primary : c.border }]}>
                <Text style={[styles.chipTxt, { color: reason === r ? c.onPrimary : c.textSecondary }]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: c.textSecondary, marginTop: 4 }]}>상세 내용 (선택)</Text>
          <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="어떤 점이 문제인지 적어주세요" placeholderTextColor={c.textSecondary} value={detail} onChangeText={setDetail} multiline />

          {msg ? <Text style={{ color: '#E5484D', fontWeight: '700' }}>{msg}</Text> : null}
          <Pressable style={[styles.btn, { backgroundColor: '#E5484D' }]} onPress={submit} disabled={sending}>
            <Text style={[styles.btnTxt, { color: '#fff' }]}>{sending ? '접수 중...' : '신고 접수'}</Text>
          </Pressable>
          <Text style={[styles.notice, { color: c.textSecondary }]}>허위·악의적 신고는 제재될 수 있어요.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  doneTxt: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  doneSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  targetBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  targetType: { fontSize: 12, fontWeight: '800' },
  targetLabel: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 90, textAlignVertical: 'top' },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  btnTxt: { fontSize: 16, fontWeight: '800' },
  notice: { fontSize: 11.5, textAlign: 'center', marginTop: 4 },
});
