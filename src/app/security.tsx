import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SecurityScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useAuth();

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const changePassword = async () => {
    setPwMsg('');
    if (!curPw) { setPwMsg('현재 비밀번호를 입력해주세요'); return; }
    if (newPw.length < 6) { setPwMsg('새 비밀번호는 6자 이상이에요'); return; }
    if (newPw !== confirmPw) { setPwMsg('새 비밀번호가 일치하지 않아요'); return; }
    if (newPw === curPw) { setPwMsg('현재 비밀번호와 다른 비밀번호를 입력해주세요'); return; }
    // 소셜 로그인 계정은 비밀번호가 없어 재인증이 항상 실패 → 오해 방지 안내
    const provider = (session.user as any)?.app_metadata?.provider;
    if (provider && provider !== 'email') { setPwMsg('소셜 로그인(카카오·네이버·Apple) 계정은 비밀번호가 없어요. 해당 서비스에서 관리해주세요.'); return; }
    setPwBusy(true);
    // 현재 비밀번호 검증 — 재인증 (남이 세션만으로 비번 못 바꾸게)
    const { error: vErr } = await supabase.auth.signInWithPassword({ email: session.user.email ?? '', password: curPw });
    if (vErr) { setPwBusy(false); setPwMsg('현재 비밀번호가 일치하지 않아요'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) { setPwMsg('변경 실패: ' + error.message); return; }
    setCurPw(''); setNewPw(''); setConfirmPw(''); setPwMsg('✅ 비밀번호가 변경됐어요');
  };

  const changeEmail = async () => {
    setEmailMsg('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim())) { setEmailMsg('올바른 이메일을 입력해주세요'); return; }
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailBusy(false);
    if (error) { setEmailMsg('변경 실패: ' + error.message); return; }
    setNewEmail(''); setEmailMsg('✅ 새 이메일로 확인 메일을 보냈어요. 메일의 링크를 눌러야 변경이 완료돼요.');
  };

  if (!session) {
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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <View style={[styles.box, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.curLabel, { color: c.textSecondary }]}>현재 로그인 이메일</Text>
          <Text style={[styles.curVal, { color: c.text }]}>{session.user.email}</Text>
        </View>

        <Text style={[styles.sect, { color: c.text }]}>🔑 비밀번호 변경</Text>
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="현재 비밀번호" placeholderTextColor={c.textSecondary} value={curPw} onChangeText={setCurPw} secureTextEntry />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="새 비밀번호 (6자 이상)" placeholderTextColor={c.textSecondary} value={newPw} onChangeText={setNewPw} secureTextEntry />
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="새 비밀번호 확인" placeholderTextColor={c.textSecondary} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
        {pwMsg ? <Text style={[styles.msg, { color: pwMsg.startsWith('✅') ? c.verify : '#E5484D' }]}>{pwMsg}</Text> : null}
        <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={changePassword} disabled={pwBusy}><Text style={[styles.btnTxt, { color: c.onPrimary }]}>{pwBusy ? '변경 중...' : '비밀번호 변경'}</Text></Pressable>

        <Text style={[styles.sect, { color: c.text, marginTop: 18 }]}>✉️ 이메일 변경</Text>
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="새 이메일 주소" placeholderTextColor={c.textSecondary} value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />
        {emailMsg ? <Text style={[styles.msg, { color: emailMsg.startsWith('✅') ? c.verify : '#E5484D' }]}>{emailMsg}</Text> : null}
        <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={changeEmail} disabled={emailBusy}><Text style={[styles.btnTxt, { color: c.onPrimary }]}>{emailBusy ? '처리 중...' : '이메일 변경'}</Text></Pressable>
        <Text style={[styles.note, { color: c.textSecondary }]}>※ 새 이메일로 확인 메일이 발송돼요. 링크를 눌러야 변경이 완료됩니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ c, onBack }: { c: any; onBack: () => void }) {
  return (
    <View style={[styles.header, { borderColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
      <Text style={[styles.hTitle, { color: c.text }]}>계정 보안</Text>
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
  box: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  curLabel: { fontSize: 12, fontWeight: '700' },
  curVal: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  sect: { fontSize: 15, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  msg: { fontWeight: '700', fontSize: 12.5 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnTxt: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 11.5, lineHeight: 17, marginTop: 6 },
});
