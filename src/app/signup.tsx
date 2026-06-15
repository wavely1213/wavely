import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME, REGISTERED_STORES, ROLES, type RegisteredStore, type RoleKey } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();

  const [role, setRole] = useState<RoleKey | null>(null);
  const [bizNo, setBizNo] = useState('');
  const [bizVerified, setBizVerified] = useState(false);
  const [verifyingBiz, setVerifyingBiz] = useState(false);
  const [bizMsg, setBizMsg] = useState('');

  // 소속 회사/매장 (등록된 매장에서만 선택)
  const [company, setCompany] = useState<RegisteredStore | null>(null);
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<RegisteredStore[]>(REGISTERED_STORES);

  // 공통 입력
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // 진짜 DB에서 등록 매장 목록 가져오기
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('stores')
      .select('id,name,category,address')
      .then(({ data }) => { if (data) setStores(data as RegisteredStore[]); });
  }, []);

  const verifyBiz = async () => {
    setBizMsg('');
    const num = bizNo.replace(/[^0-9]/g, '');
    if (num.length !== 10) { setBizMsg('숫자 10자리를 입력해주세요'); return; }
    setVerifyingBiz(true);
    const { data, error } = await supabase.functions.invoke('biz-check', { body: { b_no: num } });
    setVerifyingBiz(false);
    if (error) { setBizMsg('확인 실패: ' + error.message); return; }
    if ((data as any)?.valid) { setBizVerified(true); setBizMsg(`✓ ${(data as any).b_stt}`); }
    else { setBizVerified(false); setBizMsg('❌ ' + ((data as any)?.tax_type || '유효하지 않은 사업자번호')); }
  };

  const pickRole = (key: RoleKey) => {
    setRole(key);
    if (key !== 'owner') setBizVerified(false);
    if (key !== 'staff' && key !== 'parttime') { setCompany(null); setQuery(''); }
  };

  const needsCompany = role === 'staff' || role === 'parttime';
  const matches =
    query.trim().length === 0
      ? stores
      : stores.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  const canSubmit =
    role !== null &&
    nickname.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    (!needsCompany || company !== null) &&
    !submitting;

  const handleSubmit = async () => {
    setErrorMsg(''); setInfoMsg('');
    if (!isSupabaseConfigured) { setErrorMsg('서버 연결 설정이 없어요(.env 확인).'); return; }
    setSubmitting(true);

    // 닉네임 중복 체크 (별명은 고유해야 함)
    const { data: taken } = await supabase.rpc('nickname_taken', { p_nick: nickname.trim() });
    if (taken) { setErrorMsg('이미 사용 중인 닉네임이에요. 다른 닉네임을 써주세요.'); setSubmitting(false); return; }

    // 회원 계정 생성 + 가입정보를 함께 전달.
    // 프로필(등급·소속·사업자)은 서버 트리거가 자동 저장합니다. (02_profile_trigger.sql)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nickname: nickname.trim(),
          role,
          biz_no: '',
          biz_verified: false,
          company_id: company?.id ?? '',
        },
      },
    });
    if (error) { setErrorMsg('가입 실패: ' + error.message); setSubmitting(false); return; }

    // 이메일 인증이 켜져 있으면 아직 세션이 없음 → 메일 확인 안내
    if (!data.session || !data.user) {
      setInfoMsg('가입 완료! 메일함에서 인증 링크를 누른 뒤 로그인해주세요.');
      setSubmitting(false);
      return;
    }

    // 프로필 저장 (트리거가 없어도 동작 / 트리거가 있으면 중복은 무시)
    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        nickname: nickname.trim(),
        role,
        biz_no: null,
        biz_verified: false,
        company_id: company?.id ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    // 바로 로그인 상태로 진입
    router.replace('/');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={[styles.closeTxt, { color: c.textSecondary }]}>✕</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={[styles.h1, { color: c.text }]}>{APP_NAME} 회원가입</Text>
        <Text style={[styles.h2, { color: c.textSecondary }]}>먼저 어떤 회원인지 골라주세요</Text>

        {/* 등급 선택 */}
        <View style={{ gap: 10, marginTop: 18 }}>
          {ROLES.map((r) => {
            const on = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => pickRole(r.key)}
                style={[styles.roleCard, {
                  backgroundColor: on ? c.primarySoft : c.card,
                  borderColor: on ? c.primary : c.border,
                }]}>
                <Text style={styles.roleEmoji}>{r.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, { color: on ? c.primaryDeep : c.text }]}>{r.label}</Text>
                  <Text style={[styles.roleDesc, { color: c.textSecondary }]}>{r.desc}</Text>
                </View>
                <View style={[styles.radio, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent' }]}>
                  {on && <Text style={styles.radioDot}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 사업주 → 가입 후 사업자등록증으로 인증 안내 */}
        {role === 'owner' && (
          <View style={[styles.bizBox, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
            <Text style={[styles.bizTitle, { color: c.primaryDeep }]}>📄 사업자 인증 안내</Text>
            <Text style={[styles.bizGuide, { color: c.primaryDeep }]}>
              가입 후 <Text style={{ fontWeight: '800' }}>내정보 → 사업주 인증</Text>에서 사업자등록증 사진을 올리면 자동으로 인증돼요. 인증하면 매장 등록·광고를 쓸 수 있어요.
            </Text>
          </View>
        )}

        {/* 정직원·아르바이트 → 소속 회사/매장 (등록된 매장만 검색·선택) */}
        {needsCompany && (
          <View style={[styles.bizBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.bizTitle, { color: c.text }]}>소속 회사/매장</Text>
            <Text style={[styles.bizGuide, { color: c.textSecondary }]}>
              사업자등록이 된 매장만 검색돼요 · 가입 후 언제든 변경 가능
            </Text>

            {company ? (
              <View style={[styles.picked, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickedName, { color: c.primaryDeep }]}>✓ {company.name}</Text>
                  <Text style={[styles.pickedSub, { color: c.textSecondary }]}>{company.category} · {company.address}</Text>
                </View>
                <Pressable onPress={() => { setCompany(null); setQuery(''); }} hitSlop={8}>
                  <Text style={[styles.change, { color: c.primary }]}>변경</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={[styles.bizInput, { backgroundColor: c.background, borderColor: c.border, color: c.text, marginTop: 10 }]}
                  placeholder="회사·매장 이름 검색 (예: 춘천 닭갈비)"
                  placeholderTextColor={c.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
                <View style={{ marginTop: 8, gap: 6 }}>
                  {matches.length === 0 ? (
                    <Text style={[styles.noResult, { color: c.textSecondary }]}>
                      검색 결과가 없어요. 등록된 매장만 선택할 수 있어요.
                    </Text>
                  ) : (
                    matches.slice(0, 5).map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => { setCompany(s); setQuery(''); }}
                        style={[styles.resultRow, { borderColor: c.border }]}>
                        <Text style={[styles.resultName, { color: c.text }]}>{s.name}</Text>
                        <Text style={[styles.resultSub, { color: c.textSecondary }]}>{s.category} · {s.address}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* 공통 입력 */}
        <View style={{ gap: 10, marginTop: 22 }}>
          <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="닉네임 (커뮤니티에 표시돼요)" placeholderTextColor={c.textSecondary} value={nickname} onChangeText={setNickname} />
          <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="이메일" placeholderTextColor={c.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="비밀번호 (6자 이상)" placeholderTextColor={c.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        {errorMsg ? <Text style={[styles.msg, { color: '#E5484D' }]}>{errorMsg}</Text> : null}
        {infoMsg ? <Text style={[styles.msg, { color: c.verify }]}>{infoMsg}</Text> : null}

        <Pressable
          disabled={!canSubmit}
          style={[styles.btn, { backgroundColor: canSubmit ? c.primary : c.border }]}
          onPress={handleSubmit}>
          <Text style={[styles.btnTxt, { color: canSubmit ? c.onPrimary : c.textSecondary }]}>
            {submitting
              ? '가입 중...'
              : needsCompany && !company
                ? '소속 회사/매장을 선택해주세요'
                : '가입 완료'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/login')} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={[styles.link, { color: c.textSecondary }]}>
            이미 계정이 있으신가요? <Text style={{ color: c.primary, fontWeight: '800' }}>로그인</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { padding: 16 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  h1: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  h2: { fontSize: 13, marginTop: 6 },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  roleEmoji: { fontSize: 26 },
  roleLabel: { fontSize: 15, fontWeight: '800' },
  roleDesc: { fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { color: '#fff', fontSize: 12, fontWeight: '900' },
  bizBox: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  bizTitle: { fontSize: 14, fontWeight: '800' },
  bizGuide: { fontSize: 12, marginTop: 4 },
  bizInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  bizBtn: { paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bizOk: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  pickedName: { fontSize: 14, fontWeight: '800' },
  pickedSub: { fontSize: 12, marginTop: 2 },
  change: { fontSize: 13, fontWeight: '800' },
  noResult: { fontSize: 12, paddingVertical: 6 },
  resultRow: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1 },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultSub: { fontSize: 11.5, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15 },
  msg: { fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 18 },
  btnTxt: { fontSize: 16, fontWeight: '800' },
  link: { fontSize: 13 },
});
