import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// 비밀번호 재설정: 이메일의 재설정 링크를 누르면 복구 세션이 생기고, 여기서 새 비밀번호를 설정.
export default function ResetPasswordScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 링크 처리로 복구/일반 세션이 생기면 입력 허용
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY' || sess) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { setReady(!!data.session); setChecked(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setMsg('');
    if (pw.length < 6) { setMsg('비밀번호는 6자 이상이에요'); return; }
    if (pw !== pw2) { setMsg('비밀번호가 일치하지 않아요'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg('변경 실패: ' + error.message); return; }
    setDone(true);
    setMsg('✅ 비밀번호가 변경됐어요! 잠시 후 메인으로 이동해요.');
    setTimeout(() => router.replace('/'), 1600);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>비밀번호 재설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: c.text }]}>{APP_NAME}</Text>

        {!ready && checked ? (
          <View style={{ alignItems: 'center', gap: 8, marginTop: 20 }}>
            <Text style={{ fontSize: 36 }}>⚠️</Text>
            <Text style={[styles.guide, { color: c.text }]}>유효하지 않거나 만료된 링크예요.</Text>
            <Text style={[styles.sub, { color: c.textSecondary }]}>로그인 화면에서 “비밀번호 재설정”을 다시 눌러 메일을 받아주세요.</Text>
            <Pressable style={[styles.btn, { backgroundColor: c.primary, marginTop: 12 }]} onPress={() => router.replace('/login')}>
              <Text style={[styles.btnTxt, { color: c.onPrimary }]}>로그인으로</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.sub, { color: c.textSecondary, marginBottom: 18 }]}>새로 사용할 비밀번호를 입력하세요.</Text>
            <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="새 비밀번호 (6자 이상)" placeholderTextColor={c.textSecondary} value={pw} onChangeText={setPw} secureTextEntry editable={!done} />
            <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, marginTop: 10 }]} placeholder="새 비밀번호 확인" placeholderTextColor={c.textSecondary} value={pw2} onChangeText={setPw2} secureTextEntry editable={!done} />
            {msg ? <Text style={[styles.msg, { color: msg.startsWith('✅') ? c.verify : '#E5484D' }]}>{msg}</Text> : null}
            <Pressable style={[styles.btn, { backgroundColor: done ? c.border : c.primary, marginTop: 16 }]} onPress={submit} disabled={busy || done}>
              <Text style={[styles.btnTxt, { color: c.onPrimary }]}>{busy ? '변경 중...' : '비밀번호 변경'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  body: { flex: 1, paddingHorizontal: 28, paddingTop: 30 },
  name: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  guide: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  msg: { fontWeight: '700', fontSize: 12.5, marginTop: 12, textAlign: 'center' },
  btn: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  btnTxt: { fontSize: 16, fontWeight: '800' },
});
