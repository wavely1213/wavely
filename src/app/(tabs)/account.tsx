import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME, APP_TAGLINE, ROLES } from '@/constants/app';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile, loading, signOut } = useAuth();

  const [companyName, setCompanyName] = useState<string | null>(null);

  // 소속 매장 이름 가져오기 (정직원/알바)
  useEffect(() => {
    if (profile?.company_id) {
      supabase.from('stores').select('name').eq('id', profile.company_id).single()
        .then(({ data }) => setCompanyName((data as any)?.name ?? null));
    } else {
      setCompanyName(null);
    }
  }, [profile?.company_id]);

  // ── 로그인된 상태 ──
  if (session && profile) {
    const roleInfo = ROLES.find((r) => r.key === profile.role);
    const Row = ({ icon, label, onPress, danger }: { icon: string; label: string; onPress: () => void; danger?: boolean }) => (
      <Pressable onPress={onPress} style={[styles.row, { borderColor: c.border }]}>
        <Text style={{ fontSize: 17 }}>{icon}</Text>
        <Text style={[styles.rowTxt, { color: danger ? '#E5484D' : c.text }]}>{label}</Text>
        <Text style={{ color: c.textSecondary, fontSize: 18 }}>›</Text>
      </Pressable>
    );
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
          <View style={styles.profileTop}>
            <Pressable onPress={() => router.push('/account-edit')}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={[styles.logo, { backgroundColor: c.primary }]}><Text style={{ fontSize: 32 }}>{roleInfo?.emoji ?? '🙋'}</Text></View>
              )}
              <View style={[styles.avatarEdit, { backgroundColor: c.card, borderColor: c.border }]}><Text style={{ fontSize: 12 }}>📷</Text></View>
            </Pressable>
            <Text style={[styles.name, { color: c.text }]}>{profile.nickname}</Text>
            <View style={styles.badges}>
              <View style={[styles.roleChip, { backgroundColor: c.primarySoft }]}><Text style={[styles.roleChipTxt, { color: c.primaryDeep }]}>{roleInfo?.label ?? profile.role}</Text></View>
              {profile.role === 'owner' && profile.biz_verified && <View style={[styles.verifyChip, { backgroundColor: c.verify }]}><Text style={styles.verifyTxt}>✓ 사업자 인증</Text></View>}
              {profile.is_admin && <View style={[styles.verifyChip, { backgroundColor: c.primaryDeep }]}><Text style={styles.verifyTxt}>관리자</Text></View>}
            </View>
            {companyName && <Text style={[styles.company, { color: c.textSecondary }]}>🏢 소속: {companyName}</Text>}
            <Text style={[styles.email, { color: c.textSecondary }]}>{session.user.email}</Text>
          </View>

          <Text style={[styles.menuHead, { color: c.textSecondary }]}>동네 생활</Text>
          <Row icon="🛒" label="중고거래" onPress={() => router.push('/market')} />
          <Row icon="💼" label="구인구직" onPress={() => router.push('/jobs')} />
          <Row icon="🔥" label="인기글" onPress={() => router.push('/hot')} />
          <Row icon="🔔" label="키워드 알림" onPress={() => router.push('/keywords')} />
          <Row icon="📈" label="플레이스 분석 (사장님)" onPress={() => router.push('/place-rank')} />

          <Text style={[styles.menuHead, { color: c.textSecondary }]}>계정</Text>
          <Row icon="🤝" label="친구" onPress={() => router.push('/friends')} />
          <Row icon="🔒" label="계정 보안 (비밀번호·이메일)" onPress={() => router.push('/security')} />
          <Row icon="🔔" label="알림" onPress={() => router.push('/notifications')} />
          <Row icon="📋" label="내 활동 (글·리뷰·스크랩)" onPress={() => router.push('/my')} />
          <Row icon="✏️" label="내 정보 수정" onPress={() => router.push('/account-edit')} />
          {!(profile.role === 'owner' && profile.biz_verified) && <Row icon="💼" label="사업주 인증하기" onPress={() => router.push('/account-edit?biz=1')} />}
          {profile.role === 'owner' && profile.biz_verified && <Row icon="📢" label="광고 센터" onPress={() => router.push('/ad')} />}

          <Text style={[styles.menuHead, { color: c.textSecondary }]}>참여</Text>
          <Row icon="💡" label={profile.is_admin ? '사용 개선 제안 (관리자 보고서)' : '사용 개선 제안'} onPress={() => router.push('/suggest')} />
          {profile.is_admin && <Row icon="📊" label="관리자 대시보드" onPress={() => router.push('/admin-dashboard')} />}
          {profile.is_admin && <Row icon="🚩" label="신고 관리 (관리자)" onPress={() => router.push('/reports')} />}
          {profile.is_admin && <Row icon="📄" label="사업자 검토 (관리자)" onPress={() => router.push('/admin-biz')} />}

          <Text style={[styles.menuHead, { color: c.textSecondary }]}>설정</Text>
          <Row icon="⚙️" label="설정 (알림·약관·문의·탈퇴)" onPress={() => router.push('/settings')} />
          <Row icon="🚪" label="로그아웃" onPress={signOut} danger />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 로그아웃 상태 ──
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.center}>
        <Image source={require('@/assets/images/wavely-logo.png')} style={styles.logo} contentFit="contain" />
        <Text style={[styles.name, { color: c.text }]}>{APP_NAME}</Text>
        <Text style={[styles.tag, { color: c.textSecondary }]}>{APP_TAGLINE}</Text>

        <Text style={[styles.guide, { color: c.textSecondary }]}>
          {loading ? '불러오는 중...' : '로그인하면 글쓰기·매장등록 등\n모든 기능을 이용할 수 있어요'}
        </Text>

        <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={() => router.push('/login')}>
          <Text style={[styles.btnTxt, { color: c.onPrimary }]}>로그인</Text>
        </Pressable>
        <Pressable style={[styles.btnOutline, { borderColor: c.primary }]} onPress={() => router.push('/signup')}>
          <Text style={[styles.btnTxt, { color: c.primary }]}>회원가입</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  profileTop: { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 6 },
  email: { fontSize: 12, marginTop: 6 },
  menuHead: { fontSize: 12, fontWeight: '800', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1 },
  rowTxt: { flex: 1, fontSize: 15, fontWeight: '600' },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  avatarImg: { width: 72, height: 72, borderRadius: 20, marginBottom: 6 },
  avatarEdit: { position: 'absolute', right: -2, bottom: 4, width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 36 },
  name: { fontSize: 24, fontWeight: '900' },
  tag: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  badges: { flexDirection: 'row', gap: 6, marginTop: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  roleChipTxt: { fontSize: 13, fontWeight: '800' },
  verifyChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  verifyTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },
  company: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  infoBox: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 18 },
  infoLine: { fontSize: 13 },
  guide: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 18, marginBottom: 10 },
  btn: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  btnOutline: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5, marginTop: 12 },
  btnTxt: { fontSize: 16, fontWeight: '800' },
});
