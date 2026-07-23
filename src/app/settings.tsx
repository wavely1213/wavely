import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, useColorScheme, View } from 'react-native';
import { useScheme, useThemeMode } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const { mode, setMode } = useThemeMode();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');

  const doDelete = async () => {
    setErr('');
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-account');
    if (error || !(data as any)?.ok) {
      setDeleting(false);
      setErr('탈퇴 처리에 실패했어요: ' + (error?.message ?? (data as any)?.reason ?? ''));
      return;
    }
    await signOut();
    router.replace('/');
  };

  const Row = ({ label, value, onToggle, right, onPress }: { label: string; value?: boolean; onToggle?: (v: boolean) => void; right?: string; onPress?: () => void }) => (
    <Pressable style={[styles.row, { borderColor: c.border }]} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.rowTxt, { color: c.text }]}>{label}</Text>
      {onToggle ? (
        <Switch value={value} onValueChange={onToggle} trackColor={{ true: c.primary }} />
      ) : (
        <Text style={{ color: c.textSecondary, fontSize: 13 }}>{right}</Text>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.title, { color: c.text }]}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        <Text style={[styles.head, { color: c.textSecondary }]}>화면</Text>
        <View style={[styles.row, { borderColor: c.border }]}>
          <Text style={[styles.rowTxt, { color: c.text }]}>화면 테마</Text>
          <View style={styles.seg}>
            {([['system', '시스템'], ['light', '라이트'], ['dark', '다크']] as const).map(([m, label]) => {
              const on = mode === m;
              return (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, { backgroundColor: on ? c.primary : 'transparent' }]}>
                  <Text style={{ color: on ? c.onPrimary : c.textSecondary, fontSize: 12.5, fontWeight: '800' }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.head, { color: c.textSecondary }]}>정보</Text>
        <Row label="이용약관" right="보기 ›" onPress={() => router.push('/terms')} />
        <Row label="개인정보처리방침" right="보기 ›" onPress={() => router.push('/privacy')} />
        <Row label="문의 · 개선 제안" right="보내기 ›" onPress={() => router.push('/suggest')} />
        <Row label="버전" right={`${APP_NAME} 1.0.0`} />

        <Text style={[styles.head, { color: c.textSecondary }]}>계정</Text>
        {session ? <Row label="차단 사용자 관리" right="보기 ›" onPress={() => router.push('/blocked')} /> : null}
        {session ? (
          !confirming ? (
            <Pressable style={[styles.row, { borderColor: c.border }]} onPress={() => setConfirming(true)}>
              <Text style={[styles.rowTxt, { color: '#E5484D' }]}>회원 탈퇴</Text>
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>›</Text>
            </Pressable>
          ) : (
            <View style={[styles.confirmBox, { backgroundColor: c.card, borderColor: '#E5484D' }]}>
              <Text style={[styles.confirmTitle, { color: c.text }]}>정말 탈퇴하시겠어요?</Text>
              <Text style={[styles.confirmDesc, { color: c.textSecondary }]}>
                · 계정이 비활성화되고 다시 로그인할 수 없어요{'\n'}
                · 닉네임은 ‘탈퇴회원’으로 바뀌고, 작성한 글·리뷰는 익명으로 남아요{'\n'}
                · 사업자 인증·소속 정보는 삭제돼요{'\n'}
                · 보유 중인 광고 잔액·이용권은 환불·이전되지 않고 소멸돼요 (환불은 탈퇴 전 wavely1213@mulgyeol.kr로 신청)
              </Text>
              {err ? <Text style={{ color: '#E5484D', fontWeight: '700', fontSize: 12, marginTop: 6 }}>{err}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Pressable style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => { setConfirming(false); setErr(''); }} disabled={deleting}>
                  <Text style={{ color: c.text, fontWeight: '800' }}>취소</Text>
                </Pressable>
                <Pressable style={[styles.delBtn, { backgroundColor: '#E5484D', opacity: deleting ? 0.6 : 1 }]} onPress={doDelete} disabled={deleting}>
                  {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>탈퇴하기</Text>}
                </Pressable>
              </View>
            </View>
          )
        ) : (
          <Pressable style={[styles.row, { borderColor: c.border }]} onPress={() => router.push('/login')}>
            <Text style={[styles.rowTxt, { color: c.text }]}>로그인</Text>
            <Text style={{ color: c.textSecondary, fontSize: 13 }}>›</Text>
          </Pressable>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800' },
  head: { fontSize: 12, fontWeight: '800', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1 },
  rowTxt: { fontSize: 15, fontWeight: '600' },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 3, gap: 2, backgroundColor: 'rgba(122,43,196,0.12)' },
  segBtn: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999 },
  note: { fontSize: 11.5, padding: 16, lineHeight: 17 },
  confirmBox: { margin: 16, borderWidth: 1.5, borderRadius: 14, padding: 16 },
  confirmTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  confirmDesc: { fontSize: 12.5, lineHeight: 20 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  delBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
