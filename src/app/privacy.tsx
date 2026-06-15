import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants/app';
import { COMPANY, companyInfoReady } from '@/constants/company';
import { Colors } from '@/constants/theme';

const SECTIONS: { h: string; b: string }[] = [
  { h: '1. 수집하는 개인정보 항목', b: `${APP_NAME}는 회원가입·서비스 이용 과정에서 아래 정보를 수집합니다.\n· 필수: 이메일, 비밀번호, 닉네임\n· 선택: 프로필 사진, 아이디, 위치 정보(방문 인증·반경 검색 시), 사업자등록번호(사업주 인증 시)\n· 자동 수집: 서비스 이용 기록, 기기 정보, 접속 로그` },
  { h: '2. 개인정보의 수집·이용 목적', b: `· 회원 식별 및 가입·로그인\n· 커뮤니티·채팅·매장 정보 등 서비스 제공\n· 사업주 인증 및 광고·결제 처리\n· 부정 이용 방지, 신고 처리, 고객 문의 대응\n· 서비스 개선 및 통계 분석` },
  { h: '3. 위치정보의 이용', b: `방문 인증(GPS)·내 주변 반경 검색 등 위치 기반 기능을 위해 단말기의 위치정보를 이용할 수 있습니다. 위치정보는 해당 기능 수행 시점에만 이용되며, 별도로 저장·공유되지 않습니다. 이용자는 기기 설정에서 위치 권한을 거부할 수 있습니다.` },
  { h: '4. 개인정보의 보유 및 이용 기간', b: `· 회원 탈퇴 시 지체 없이 파기합니다. 단, 작성한 게시물은 익명(‘탈퇴회원’) 처리 후 보존될 수 있습니다.\n· 관련 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관합니다(전자상거래법 등).` },
  { h: '5. 개인정보의 제3자 제공', b: `${APP_NAME}는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 법령에 근거가 있거나 이용자가 동의한 경우에 한해 제공할 수 있습니다.` },
  { h: '6. 개인정보 처리 위탁', b: `서비스 운영을 위해 아래 업무를 위탁할 수 있습니다.\n· 데이터 저장·인증: Supabase(클라우드 인프라)\n· 결제 처리: PortOne 등 전자결제대행사(연동 시)\n· 사업자 진위확인: 국세청 등 공공 API` },
  { h: '7. 이용자의 권리', b: `이용자는 언제든지 자신의 개인정보를 조회·수정하거나 회원 탈퇴를 통해 삭제를 요청할 수 있습니다. 개인정보 관련 문의는 고객센터를 통해 접수할 수 있습니다.` },
  { h: '8. 개인정보 보호책임자', b: `· 성명: ${COMPANY.privacyOfficer}\n· 연락처: ${COMPANY.privacyOfficerContact}\n· 사업자: ${COMPANY.legalName} (대표 ${COMPANY.ceo})\n\n시행일: ${COMPANY.effectiveDate}` + (companyInfoReady ? '' : '\n\n※ 정식 출시 전 회사 정보·위탁업체를 정확히 반영하고 법률 검토를 받아야 합니다.') },
];

export default function PrivacyScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>개인정보처리방침</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {SECTIONS.map((s) => (
          <View key={s.h} style={{ marginBottom: 18 }}>
            <Text style={[styles.h, { color: c.text }]}>{s.h}</Text>
            <Text style={[styles.b, { color: c.textSecondary }]}>{s.b}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  h: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  b: { fontSize: 13.5, lineHeight: 21 },
});
