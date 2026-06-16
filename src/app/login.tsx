import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const resetPassword = async () => {
    setErrorMsg(''); setInfoMsg('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setErrorMsg('재설정할 이메일을 위에 먼저 입력해주세요.'); return; }
    const redirectTo = Platform.OS === 'web' ? `${(globalThis as any).location?.origin}/reset-password` : 'wavely://reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) { setErrorMsg('메일 전송 실패: ' + error.message); return; }
    setInfoMsg('📧 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 설정하세요. (메일이 안 오면 스팸함도 확인)');
  };

  const handleLogin = async () => {
    setErrorMsg('');
    if (!isSupabaseConfigured) { setErrorMsg('서버 연결 설정이 없어요(.env 확인).'); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setSubmitting(false);
    if (error) { setErrorMsg('로그인 실패: ' + error.message); return; }
    router.replace('/');
  };

  const kakaoLogin = async () => {
    setErrorMsg('');
    const redirectTo = Platform.OS === 'web' ? (globalThis as any).location?.origin : 'wavely://';
    // 닉네임·프로필 사진 동의항목 요청 (가입 시 프로필에 자동 동기화)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo, scopes: 'profile_nickname profile_image' } });
    if (error) {
      const m = (error.message ?? '').toLowerCase();
      if (m.includes('provider') || m.includes('not enabled') || m.includes('unsupported')) setErrorMsg('카카오 로그인은 곧 제공돼요 (연동 준비 중).');
      else setErrorMsg('카카오 로그인 실패: ' + error.message);
    }
  };

  const naverLogin = async () => {
    setErrorMsg('');
    const clientId = process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID;
    const sbUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!clientId || !sbUrl) { setErrorMsg('네이버 로그인 설정이 아직 없어요.'); return; }
    const returnUrl = Platform.OS === 'web' ? (globalThis as any).location?.origin : 'wavely://';
    // state: CSRF 논스 + 복귀 URL(base64url). Edge Function이 복귀 URL로 세션을 돌려보냄.
    const payload = JSON.stringify({ r: returnUrl, n: Math.random().toString(36).slice(2) });
    const state = (globalThis as any).btoa ? (globalThis as any).btoa(payload).replace(/\+/g, '-').replace(/\//g, '_') : encodeURIComponent(payload);
    const callback = `${sbUrl}/functions/v1/naver-auth/callback`;
    const authUrl =
      `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}`;
    if (Platform.OS === 'web') {
      (globalThis as any).location.href = authUrl;
    } else {
      try {
        const WebBrowser = await import('expo-web-browser');
        await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      } catch {
        setErrorMsg('네이버 로그인 창을 열 수 없어요.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text>
      </Pressable>

      <View style={styles.body}>
        <Image source={require('@/assets/images/wavely-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={[styles.name, { color: c.text }]}>{APP_NAME}</Text>
        <Text style={[styles.sub, { color: c.textSecondary }]}>로그인하고 시작하기</Text>

        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 24 }}>
          <TextInput
            style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            placeholder="이메일"
            placeholderTextColor={c.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            placeholder="비밀번호"
            placeholderTextColor={c.textSecondary}
            value={pw}
            onChangeText={setPw}
            secureTextEntry
          />
        </View>

        {errorMsg ? <Text style={[styles.msg, { color: '#E5484D' }]}>{errorMsg}</Text> : null}
        {infoMsg ? <Text style={[styles.msg, { color: c.verify }]}>{infoMsg}</Text> : null}

        <Pressable
          disabled={submitting}
          style={[styles.btn, { backgroundColor: submitting ? c.border : c.primary }]}
          onPress={handleLogin}>
          <Text style={[styles.btnTxt, { color: submitting ? c.textSecondary : c.onPrimary }]}>
            {submitting ? '로그인 중...' : '로그인'}
          </Text>
        </Pressable>

        <Pressable onPress={resetPassword} hitSlop={8} style={{ alignSelf: 'center', marginTop: 14 }}>
          <Text style={[styles.link, { color: c.textSecondary }]}>비밀번호를 잊으셨나요? <Text style={{ color: c.primary, fontWeight: '700' }}>재설정</Text></Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={[styles.dline, { backgroundColor: c.border }]} />
          <Text style={[styles.dtxt, { color: c.textSecondary }]}>또는</Text>
          <View style={[styles.dline, { backgroundColor: c.border }]} />
        </View>

        {/* 공식 심볼 + 동일 레이아웃 (브랜드 색·로고 준수, 정렬 통일) */}
        <Pressable style={[styles.socialBtn, { backgroundColor: '#FEE500' }]} onPress={kakaoLogin}>
          <Image source={require('@/assets/images/kakao-icon.png')} style={styles.socialIcon} contentFit="contain" />
          <Text style={[styles.socialTxt, { color: '#191600' }]}>카카오 로그인</Text>
        </Pressable>

        <Pressable style={[styles.socialBtn, { backgroundColor: '#03C75A' }]} onPress={naverLogin}>
          <Image source={require('@/assets/images/naver-icon.png')} style={styles.socialIcon} contentFit="contain" />
          <Text style={[styles.socialTxt, { color: '#fff' }]}>네이버 로그인</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/signup')} style={{ marginTop: 18 }}>
          <Text style={[styles.link, { color: c.textSecondary }]}>
            아직 회원이 아니신가요? <Text style={{ color: c.primary, fontWeight: '800' }}>회원가입</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { padding: 16 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 20 },
  logo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  name: { fontSize: 24, fontWeight: '900' },
  sub: { fontSize: 13, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  msg: { fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  btn: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { fontSize: 16, fontWeight: '800' },
  link: { fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, marginTop: 22 },
  dline: { flex: 1, height: 1 },
  dtxt: { fontSize: 12, fontWeight: '700' },
  socialBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  socialIcon: { width: 20, height: 20 },
  socialTxt: { fontSize: 16, fontWeight: '800' },
});
