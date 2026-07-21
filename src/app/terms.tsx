import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, useColorScheme, View, Pressable } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/constants/app';
import { COMPANY, companyInfoReady } from '@/constants/company';
import { Colors } from '@/constants/theme';

const SECTIONS: { h: string; b: string }[] = [
  { h: '제1조 (목적)', b: `이 약관은 ${APP_NAME}(이하 "서비스")가 제공하는 직장인·사업주 커뮤니티 및 동네 매장 정보 서비스의 이용 조건과 절차, 회원과 서비스의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.` },
  { h: '제2조 (정의)', b: `① "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.\n② "게시물"이란 회원이 서비스에 게시한 글·사진·영상·댓글 등 일체의 정보를 말합니다.\n③ "사업주 회원"이란 사업자등록번호 인증을 완료한 회원을 말합니다.` },
  { h: '제3조 (약관의 효력 및 변경)', b: `① 본 약관은 서비스 화면에 게시하여 효력이 발생합니다.\n② 서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자와 사유를 명시하여 공지합니다.` },
  { h: '제4조 (회원가입 및 계정)', b: `① 이용자는 이메일 등 정보를 제공하고 본 약관에 동의함으로써 회원가입을 신청합니다.\n② 회원은 자신의 계정 정보를 안전하게 관리할 책임이 있으며, 타인에게 양도·대여할 수 없습니다.` },
  { h: '제5조 (게시물의 관리)', b: `① 게시물의 저작권 등 권리와 책임은 작성한 회원에게 있습니다.\n② 다음 게시물은 사전 통지 없이 삭제·이동되거나 노출이 제한될 수 있습니다.\n - 타인을 비방·모욕하거나 명예를 훼손하는 내용\n - 음란·불법·허위 정보\n - 광고·도배 등 서비스 운영을 방해하는 내용\n③ 회원은 게시물을 신고할 수 있으며, 서비스는 검토 후 적절한 조치를 취합니다.` },
  { h: '제6조 (사업주 인증 및 매장 정보)', b: `① 사업주 회원은 사업자등록번호 진위확인을 거쳐 매장을 등록할 수 있습니다.\n② 등록된 매장 정보의 정확성에 대한 책임은 등록한 회원에게 있습니다.\n③ 허위·과장된 매장 정보나 리뷰 조작이 확인될 경우 이용이 제한될 수 있습니다.` },
  { h: '제7조 (광고 서비스)', b: `① 사업주 회원은 유료 광고(노출 가산점·배너 등)를 신청할 수 있습니다.\n② 광고는 정해진 기간·조건에 따라 노출되며, 별점·리뷰 등 품질 지표가 함께 반영됩니다.\n③ 결제·환불에 관한 사항은 별도의 정책을 따릅니다.` },
  { h: '제8조 (서비스의 책임 제한)', b: `① 서비스는 회원 간 또는 회원과 제3자 간에 발생한 분쟁에 개입하지 않으며 책임을 지지 않습니다.\n② 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.` },
  { h: '제9조 (회원 탈퇴 및 이용 제한)', b: `① 회원은 언제든지 서비스 내 메뉴를 통해 탈퇴할 수 있습니다.\n② 본 약관을 위반한 회원은 경고·이용 정지·계정 정지 등의 조치를 받을 수 있습니다.` },
  { h: '부칙', b: `본 약관은 ${COMPANY.effectiveDate}부터 시행합니다.` },
  {
    h: '사업자 정보',
    b:
      `· 상호: ${COMPANY.legalName}\n· 대표자: ${COMPANY.ceo}\n· 사업자등록번호: ${COMPANY.bizNo}` +
      (COMPANY.mailOrderNo ? `\n· 통신판매업신고: ${COMPANY.mailOrderNo}` : '') +
      (COMPANY.address ? `\n· 주소: ${COMPANY.address}` : '') +
      `\n· 문의: ${COMPANY.email}${COMPANY.phone ? ` / ${COMPANY.phone}` : ''}` +
      (companyInfoReady ? '' : '\n\n※ 정식 출시 전 회사 정보를 입력하고 법률 검토를 받아야 합니다.'),
  },
];

export default function TermsScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <Text style={[styles.hTitle, { color: c.text }]}>이용약관</Text>
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
