import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { ROLES, type RoleKey } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AccountEditScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const params = useLocalSearchParams<{ biz?: string }>();
  const wantBiz = (Array.isArray(params?.biz) ? params.biz[0] : params?.biz) === '1';
  const { session, profile, refreshProfile } = useAuth();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/account'));

  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [unameMsg, setUnameMsg] = useState('');
  const [savingUname, setSavingUname] = useState(false);
  const [bizVerified, setBizVerified] = useState(false);
  const [verifyingBiz, setVerifyingBiz] = useState(false);
  const [bizMsg, setBizMsg] = useState('');
  const [bizCert, setBizCert] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // 회원 등급 변경
  const [roleSel, setRoleSel] = useState<RoleKey>('guest');
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [storeQuery, setStoreQuery] = useState('');
  const [storeResults, setStoreResults] = useState<{ id: string; name: string; category: string | null; address: string | null }[]>([]);
  const [changingRole, setChangingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname); setUsername(profile.username ?? ''); setSavedUsername(profile.username ?? null); setPhone(profile.phone ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
      setRoleSel(wantBiz && !(profile.role === 'owner' && profile.biz_verified) ? 'owner' : profile.role);
    }
  }, [profile?.id]);

  // 현재 소속 매장 이름 불러오기 (정직원/알바)
  useEffect(() => {
    if (profile?.company_id) {
      supabase.from('stores').select('id,name').eq('id', profile.company_id).single()
        .then(({ data }) => { if (data) setCompany(data as any); });
    }
  }, [profile?.company_id]);

  const searchStores = async () => {
    if (!storeQuery.trim()) return;
    const { data } = await supabase.from('stores').select('id,name,category,address').ilike('name', `%${storeQuery.trim()}%`).not('is_probe', 'is', true).limit(8);
    setStoreResults((data as any[]) ?? []);
  };

  const changeRole = async () => {
    setRoleMsg('');
    if (roleSel === 'owner' && !(profile!.role === 'owner' && profile!.biz_verified)) { setRoleMsg('사업주는 아래에서 사업자 인증을 먼저 해주세요'); return; }
    if ((roleSel === 'staff' || roleSel === 'parttime') && !company) { setRoleMsg('소속 매장을 선택해주세요'); return; }
    setChangingRole(true);
    const { data, error } = await supabase.rpc('set_role', { new_role: roleSel, new_company: company?.id ?? null });
    setChangingRole(false);
    if (error) { setRoleMsg('변경 실패: ' + error.message); return; }
    if (data === 'ok') { setRoleMsg('✅ 등급이 변경됐어요'); refreshProfile(); }
    else if (data === 'need_company') setRoleMsg('소속 매장을 선택해주세요');
    else if (data === 'need_biz') setRoleMsg('사업주는 사업자 인증이 필요해요');
    else setRoleMsg('변경할 수 없어요');
  };

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled && res.assets[0]) setAvatar(res.assets[0]);
  };
  const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    try {
      const resp = await fetch(asset.uri);
      const ab = await resp.arrayBuffer();
      const ct = asset.mimeType ?? 'image/jpeg';
      const ext = ct.includes('png') ? 'png' : 'jpg';
      const path = `avatars/${session!.user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(path, ab, { contentType: ct, upsert: true });
      if (error) return null;
      return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    } catch { return null; }
  };

  const saveUsername = async () => {
    setUnameMsg('');
    const v = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{4,20}$/.test(v)) { setUnameMsg('영문 소문자·숫자·_ 4~20자로 정해주세요'); return; }
    setSavingUname(true);
    const { data, error } = await supabase.rpc('set_username', { uname: v });
    setSavingUname(false);
    if (error) { setUnameMsg('오류: ' + error.message); return; }
    if (data === 'ok') { setSavedUsername(v); setUnameMsg('✅ 아이디가 설정됐어요'); refreshProfile(); }
    else if (data === 'taken') setUnameMsg('이미 사용 중인 아이디예요');
    else setUnameMsg('영문 소문자·숫자·_ 4~20자로 정해주세요');
  };

  if (!session || !profile) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
        <Pressable style={styles.close} onPress={goBack}><Icon name="x" size={20} color={c.textSecondary} /></Pressable>
        <View style={styles.center}><Text style={{ color: c.text }}>로그인 후 이용해주세요</Text></View>
      </SafeAreaView>
    );
  }

  const isOwnerVerified = profile.role === 'owner' && profile.biz_verified;

  const pickCert = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) { setBizCert(res.assets[0]); setBizMsg(''); }
  };
  const verifyCert = async () => {
    if (!bizCert) { setBizMsg('사업자등록증 사진을 첨부해주세요'); return; }
    setVerifyingBiz(true); setBizMsg('');
    try {
      const resp = await fetch(bizCert.uri);
      const ab = await resp.arrayBuffer();
      const ct = bizCert.mimeType ?? 'image/jpeg';
      const ext = ct.includes('png') ? 'png' : 'jpg';
      const path = `${session!.user.id}/cert-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('biz-docs').upload(path, ab, { contentType: ct, upsert: true });
      if (upErr) { setVerifyingBiz(false); setBizMsg('등록증 업로드 실패: ' + upErr.message); return; }
      const { data, error } = await supabase.functions.invoke('biz-cert-verify', { body: { cert_path: path } });
      setVerifyingBiz(false);
      if (error) { setBizMsg('인증 처리 실패: ' + error.message); return; }
      const d = data as any;
      if (d?.verified) { setBizVerified(true); setBizMsg(`✅ 사업자 인증 완료! (${d.p_nm} 대표님)`); refreshProfile(); }
      else if (d?.needsReview) { setBizMsg('🕒 ' + (d.reason ?? '관리자 검토 후 인증돼요')); }
      else { setBizMsg('❌ ' + (d?.reason ?? '인증에 실패했어요')); }
    } catch (e: any) { setVerifyingBiz(false); setBizMsg('오류: ' + (e?.message ?? e)); }
  };

  const save = async () => {
    setMsg('');
    if (!nickname.trim()) { setMsg('닉네임을 입력해주세요'); return; }
    setSaving(true);
    // 닉네임이 바뀌었으면 중복 체크
    if (nickname.trim().toLowerCase() !== (profile.nickname ?? '').toLowerCase()) {
      const { data: taken } = await supabase.rpc('nickname_taken', { p_nick: nickname.trim() });
      if (taken) { setMsg('이미 사용 중인 닉네임이에요.'); setSaving(false); return; }
    }
    const updates: any = { nickname: nickname.trim(), phone: phone.replace(/[^0-9]/g, '') || null };
    if (avatar) {
      const url = await uploadAvatar(avatar);
      if (!url) { setMsg('사진 업로드 실패'); setSaving(false); return; }
      updates.avatar_url = url;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
    setSaving(false);
    if (error) { setMsg('저장 실패: ' + error.message); return; }
    await refreshProfile();
    goBack();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={goBack} hitSlop={8}><Icon name="x" size={20} color={c.textSecondary} /></Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>내 정보 수정</Text>
        <Pressable onPress={save} disabled={saving} hitSlop={8}><Text style={[styles.post, { color: c.primary }]}>{saving ? '저장중' : '저장'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <Pressable onPress={pickAvatar}>
            {avatar || avatarUrl ? (
              <Image source={{ uri: avatar ? avatar.uri : avatarUrl! }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }]}><Icon name="user" size={36} color={c.onPrimary} /></View>
            )}
            <View style={[styles.avatarCam, { backgroundColor: c.card, borderColor: c.border }]}><Text style={{ fontSize: 14 }}>📷</Text></View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: c.textSecondary }]}>프로필 사진 변경</Text>
        </View>

        <Text style={[styles.label, { color: c.textSecondary }]}>닉네임</Text>
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} value={nickname} onChangeText={setNickname} placeholder="닉네임" placeholderTextColor={c.textSecondary} maxLength={24} />

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 6 }]}>전화번호 <Text style={{ fontWeight: '500' }}>(결제·알림에 쓰여요)</Text></Text>
        <TextInput style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} value={phone} onChangeText={setPhone} placeholder="010-1234-5678" placeholderTextColor={c.textSecondary} keyboardType="phone-pad" />

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 6 }]}>아이디 <Text style={{ fontWeight: '500' }}>(친구 추가에 쓰여요 · 영문소문자·숫자·_)</Text></Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.input, { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderColor: c.border, paddingVertical: 0 }]}>
            <Text style={{ color: c.textSecondary, fontSize: 15, fontWeight: '700' }}>@</Text>
            <TextInput style={{ flex: 1, color: c.text, fontSize: 15, paddingVertical: 13, marginLeft: 2 }} value={username} onChangeText={(t) => setUsername(t.toLowerCase())} placeholder="myid123" placeholderTextColor={c.textSecondary} autoCapitalize="none" maxLength={20} />
          </View>
          <Pressable style={[styles.bizBtn, { backgroundColor: c.primary, opacity: username.trim() === (savedUsername ?? '') ? 0.5 : 1 }]} onPress={saveUsername} disabled={savingUname || username.trim() === (savedUsername ?? '')}>
            <Text style={{ color: c.onPrimary, fontWeight: '800' }}>{savingUname ? '...' : savedUsername ? '변경' : '설정'}</Text>
          </Pressable>
        </View>
        {unameMsg ? <Text style={{ color: unameMsg.startsWith('✅') ? c.verify : '#E5484D', fontWeight: '700', fontSize: 12 }}>{unameMsg}</Text> : null}

        <Text style={[styles.label, { color: c.textSecondary, marginTop: 6 }]}>회원 등급 <Text style={{ fontWeight: '500' }}>(바꾸려면 선택하세요)</Text></Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => {
            const on = roleSel === r.key;
            const ownerLocked = r.key === 'owner' && !isOwnerVerified;
            const current = profile.role === r.key;
            return (
              <Pressable key={r.key} onPress={() => setRoleSel(r.key)} style={[styles.roleCard, { backgroundColor: on ? c.primarySoft : c.card, borderColor: on ? c.primary : c.border }]}>
                <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
                <Text style={[styles.roleCardLabel, { color: on ? c.primaryDeep : c.text }]}>{r.label}</Text>
                {current ? <Text style={[styles.roleTag, { color: c.textSecondary }]}>현재</Text> : ownerLocked ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Icon name="lock" size={11} color="#FF9F40" /><Text style={[styles.roleTag, { color: '#FF9F40' }]}>인증 필요</Text></View> : null}
              </Pressable>
            );
          })}
        </View>

        {/* 정직원·아르바이트 → 소속 매장 선택 */}
        {(roleSel === 'staff' || roleSel === 'parttime') && (
          <View style={[styles.bizBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.checkTxt, { color: c.text }]}>소속 매장</Text>
            {company ? (
              <View style={[styles.pickedStore, { borderColor: c.primary, backgroundColor: c.primarySoft }]}>
                <Text style={[styles.roleCardLabel, { color: c.primaryDeep, flex: 1 }]} numberOfLines={1}>✓ {company.name}</Text>
                <Pressable onPress={() => { setCompany(null); setStoreResults([]); }} hitSlop={8}><Text style={{ color: c.primary, fontWeight: '800' }}>변경</Text></Pressable>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput style={[styles.input, { flex: 1, backgroundColor: c.background, borderColor: c.border, color: c.text }]} placeholder="매장 이름 검색" placeholderTextColor={c.textSecondary} value={storeQuery} onChangeText={setStoreQuery} onSubmitEditing={searchStores} autoCapitalize="none" />
                  <Pressable style={[styles.bizBtn, { backgroundColor: c.primary }]} onPress={searchStores}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>검색</Text></Pressable>
                </View>
                {storeResults.map((s) => (
                  <Pressable key={s.id} onPress={() => { setCompany({ id: s.id, name: s.name }); setStoreResults([]); setStoreQuery(''); }} style={[styles.storeRow, { borderColor: c.border }]}>
                    <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{s.name}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>{s.category ?? ''} · {s.address ?? ''}</Text>
                  </Pressable>
                ))}
                <Text style={[styles.hint, { color: c.textSecondary, fontSize: 11 }]}>사업자등록된 매장만 검색돼요</Text>
              </>
            )}
          </View>
        )}

        {/* 등급 변경 버튼 (사업주 미인증은 아래 인증으로 처리) */}
        {!(roleSel === 'owner' && !isOwnerVerified) && (roleSel !== profile.role || ((roleSel === 'staff' || roleSel === 'parttime') && company?.id !== profile.company_id)) && (
          <Pressable style={[styles.verifyBtn, { backgroundColor: c.primary }]} onPress={changeRole} disabled={changingRole}>
            <Text style={{ color: c.onPrimary, fontWeight: '800' }}>{changingRole ? '변경 중...' : '이 등급으로 변경'}</Text>
          </Pressable>
        )}
        {roleMsg ? <Text style={{ color: roleMsg.startsWith('✅') ? c.verify : '#E5484D', fontWeight: '700', fontSize: 12.5 }}>{roleMsg}</Text> : null}

        {/* 사업주 인증 (사업주 선택 + 미인증) */}
        {!isOwnerVerified && roleSel === 'owner' && (
          <View style={[styles.bizBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icon name="briefcase" size={16} color={c.text} /><Text style={[styles.checkTxt, { color: c.text }]}>사업자 인증하면 사장님으로 전환돼요</Text></View>
            <Text style={[styles.hint, { color: c.textSecondary }]}>사업자등록증 사진을 올리면 자동으로 인증돼요. 등록증에서 번호·대표자명·개업일을 읽어 국세청 진위확인까지 한 번에 처리됩니다.</Text>
            {bizCert ? (
              <View style={{ marginTop: 10 }}>
                <Image source={{ uri: bizCert.uri }} style={styles.certImg} contentFit="contain" />
                <Pressable onPress={pickCert} style={{ marginTop: 6 }}><Text style={{ color: c.primary, fontWeight: '700', fontSize: 12.5 }}>다른 사진 선택</Text></Pressable>
              </View>
            ) : (
              <Pressable style={[styles.certBtn, { borderColor: c.border }]} onPress={pickCert}>
                <Text style={{ color: c.textSecondary, fontWeight: '700' }}>📄 사업자등록증 사진 첨부</Text>
              </Pressable>
            )}
            <Pressable style={[styles.verifyBtn, { backgroundColor: bizCert ? c.primary : c.backgroundElement }]} onPress={verifyCert} disabled={!bizCert || verifyingBiz}>
              <Text style={{ color: bizCert ? c.onPrimary : c.textSecondary, fontWeight: '800' }}>{verifyingBiz ? '인증 확인 중...' : '등록증으로 인증하기'}</Text>
            </Pressable>
            {bizMsg ? <Text style={{ color: bizVerified ? c.verify : bizMsg.startsWith('🕒') ? '#FF9F40' : '#E5484D', fontWeight: '700', fontSize: 12.5, marginTop: 8, lineHeight: 18 }}>{bizMsg}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 }}><Icon name="lock" size={13} color={c.textSecondary} /><Text style={[styles.hint, { color: c.textSecondary, fontSize: 11, marginTop: 0, flex: 1 }]}>등록증은 비공개로 안전하게 보관되며 인증 용도로만 사용돼요.</Text></View>
          </View>
        )}

        {msg ? <Text style={{ color: '#E5484D', fontWeight: '700' }}>{msg}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avatar: { width: 92, height: 92, borderRadius: 28 },
  certBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginTop: 10 },
  certImg: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#0003' },
  verifyBtn: { paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  avatarCam: { position: 'absolute', right: -2, bottom: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarHint: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  close: { padding: 16 },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  post: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  roleBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  roleTxt: { fontSize: 15, fontWeight: '700' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleCard: { width: '48%', flexGrow: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 3 },
  roleCardLabel: { fontSize: 14, fontWeight: '800' },
  roleTag: { fontSize: 10.5, fontWeight: '800' },
  pickedStore: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 },
  storeRow: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, marginTop: 6 },
  bizBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkTxt: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  bizBtn: { paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
