// 축제 행사탭 — 2026 춘천막국수닭갈비축제. 정보는 공식 사이트(mdfestival26.imweb.me) 확인분만.
// 색은 축제 오렌지(이 화면 전용 스코프) — 앱 스카이 토큰과 무관. cosmetic 테마.
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Txt';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/Icon';
import { useScheme } from '@/lib/theme';

// 모든 값은 주최측 공식 사이트·모집공고 원문 기준(2026-08 확인). 웹(wavely-web)과 동일 정본.
const FEST = {
  site: 'https://mdfestival26.imweb.me',
  subtitle: '춘천 대표 K-미식 축제',
  hours: '11:00 – 22:00',                 // 참여부스 운영시간(공고)
  placeName: '공지천 산책로 일대',
  placeDetail: '효자교–공지교 아래 하천 일대',
  // 주최/주관은 춘천시·조직위·문화재단. '사무국'은 운영대행사라 주최로 적으면 사실관계 오류.
  host: '춘천시 · 춘천막국수닭갈비조직위원회 · 춘천문화재단',
  operator: '(주)다옴피앤씨 운영사무국',
  tel: '0332421825', telLabel: '033-242-1825', telHours: '10:00–18:00',
  cityTel: '0332503068', cityTelLabel: '033-250-3068',   // 춘천시청 관광정책과(부스 문의)
  email: 'daom1825@naver.com',
  place: '2026 춘천막국수닭갈비축제',   // 길찾기 = 네이버 통일(FESTIVAL_TAB §6)
  insta: 'https://www.instagram.com/mdfestival/',
};
// 참여업체 모집 — 공고 원문(idx 172697014 / 172635376) 기준. 마감 지나면 카드가 자동으로 사라진다.
const ENTRY = [
  { key: 'booth', name: '막국수 · 닭갈비 참여부스', due: [2026, 7, 5] as const, dueLabel: '8.5(수) 18:00',
    scale: '막국수 3개소 · 닭갈비 5개소', by: '춘천시청 관광정책과',
    url: 'https://mdfestival26.imweb.me/Notice/?bmode=view&idx=172697014&t=board' },
  { key: 'fnb', name: '로컬 F&B 입점', due: [2026, 7, 7] as const, dueLabel: '8.7(금)',
    scale: '부스 운영관리비 50만원 (부가세 포함)', by: '운영사무국',
    url: 'https://mdfestival26.imweb.me/Notice/?bmode=view&idx=172635376&t=board' },
];
const STEPS = [['신청', '7.27 – 8.7'], ['선정 발표', '8.14'], ['계약', '8.31 – 9.4'], ['운영', '10.14 – 18']] as const;
const ddayOf = (d: readonly [number, number, number]) =>
  Math.round((new Date(d[0], d[1], d[2]).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
const FEST_GEO = { lat: 37.8646, lng: 127.7203 };   // 공지천 산책로 일대(온의동 586)
// 네이버 길찾기 — 앱 스킴 우선, 실패 시 웹. 카카오 경로는 쓰지 않는다(지도 SDK가 네이버).
function festRoute() {
  const { lat, lng } = FEST_GEO;
  const name = encodeURIComponent(FEST.place);
  const web = `https://map.naver.com/p/directions/-/${lng},${lat},${name}/-/transit`;
  const scheme = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${name}&appname=kr.mulgyeol.wavely`;
  Linking.openURL(scheme).catch(() => { Linking.openURL(web).catch(() => {}); });
}
const DAYS = [{ k: '10.14', d: '수' }, { k: '10.15', d: '목' }, { k: '10.16', d: '금' }, { k: '10.17', d: '토' }, { k: '10.18', d: '일' }];
type Ev = { day: string; t: string; title: string; loc?: string; type?: 'show' | 'food' | 'exp'; desc?: string };
// ▼ 2026 세부 프로그램 공개 시 채우면 타임라인·탭상세 자동 동작.
const EVENTS: Ev[] = [];
const O = { pri: '#F26D1F', deep: '#C7500F', dak: '#E8461E', mak: '#2A9D8F' };

export default function Festival() {
  const scheme = useScheme();
  const dark = scheme === 'dark';
  const router = useRouter();
  const [day, setDay] = useState('10.14');
  const [ev, setEv] = useState<Ev | null>(null);
  const dday = useMemo(() => {
    const d = Math.ceil((new Date(2026, 9, 14).getTime() - Date.now()) / 86400000);
    return d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : '축제 종료';
  }, []);
  const bg = dark ? '#171009' : '#FFF7F0';
  const card = dark ? '#221810' : '#FFFFFF';
  const ink = dark ? '#F5EBE2' : '#241C16';
  const ink2 = dark ? '#B39C8B' : '#7A6A5E';
  const line = dark ? '#332619' : '#F1E6DA';
  const soft = dark ? '#33210F' : '#FDECE0';
  const open = (u: string) => { Linking.openURL(u).catch(() => {}); };
  const rows = EVENTS.filter((e) => e.day === day);
  const evType = (t?: string) => (t === 'food' ? '먹거리' : t === 'exp' ? '체험' : '공연');
  const nodeColor = (t?: string) => (t === 'food' ? O.dak : t === 'exp' ? O.mak : O.pri);

  const quick: { ic: IconName; l: string; on: () => void }[] = [
    { ic: 'phone', l: '전화문의', on: () => open('tel:' + FEST.tel) },
    { ic: 'map', l: '길찾기', on: festRoute },
    { ic: 'sparkles', l: '인스타', on: () => open(FEST.insta) },
    { ic: 'note', l: '공식사이트', on: () => open(FEST.site) },
  ];
  const tiles: { ic: IconName; t: string; s2: string; u: string }[] = [
    { ic: 'map', t: '주차 · 교통', s2: '오시는 길·주차', u: FEST.site + '/traffic' },
    { ic: 'shield', t: '안전 · 편의', s2: '관람객 유의사항', u: FEST.site + '/visitors/?idx=167328667&bmode=view' },
    { ic: 'store', t: '음식 · 음료', s2: '이용 안내', u: FEST.site + '/visitors/?idx=167328655&bmode=view' },
    { ic: 'heart', t: '반려동물', s2: '동반 안내', u: FEST.site + '/visitors/?idx=167328653&bmode=view' },
    { ic: 'image', t: '촬영 · 초상권', s2: '촬영 안내', u: FEST.site + '/visitors/?idx=167328652&bmode=view' },
    { ic: 'note', t: 'FAQ', s2: '자주 묻는 질문', u: FEST.site + '/FAQ' },
  ];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 11 }}>
        <View style={{ width: 7, height: 16, borderRadius: 4, backgroundColor: O.pri, marginRight: 8 }} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: ink }}>{title}</Text>
      </View>
      {children}
    </View>
  );
  const LinkRow = ({ ic, label, onPress }: { ic: IconName; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[s.lrow, { backgroundColor: card, borderColor: line }]}>
      <View style={[s.li, { backgroundColor: soft }]}><Icon name={ic} size={15} color={O.deep} /></View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: ink }}>{label}</Text>
      <Icon name="chevronRight" size={16} color={ink2} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: O.pri }}>
          <View style={s.hero}>
            <View style={s.bar}>
              <Pressable onPress={() => router.back()} style={s.barBtn}><Icon name="chevronLeft" size={20} color="#fff" /></Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => open(FEST.site)} style={s.barBtn}><Icon name="share" size={18} color="#fff" /></Pressable>
            </View>
            <View style={s.badge}><Text style={s.badgeT}>2026 로컬 축제</Text></View>
            <Text style={s.hname}>2026 춘천{'\n'}막국수닭갈비축제</Text>
            <Text style={s.hsub}>{FEST.subtitle}</Text>
            <View style={s.meta}>
              <View style={s.pill}><Icon name="clock" size={14} color="#fff" /><Text style={s.pillT}>  10.14 수 – 10.18 일</Text></View>
              <View style={s.pill}><Text style={s.pillT}>{FEST.hours}</Text></View>
              <View style={[s.pill, { backgroundColor: '#fff' }]}><Text style={[s.pillT, { color: O.deep, fontWeight: '800' }]}>{dday}</Text></View>
            </View>
            <View style={s.loc}><Icon name="pin" size={15} color="#fff" /><Text style={s.locT}>  {FEST.placeName} · 춘천 온의동</Text></View>
          </View>
        </SafeAreaView>

        <View style={s.quick}>
          {quick.map((q) => (
            <Pressable key={q.l} onPress={q.on} style={[s.qbtn, { backgroundColor: card, borderColor: line }]}>
              <View style={[s.qi, { backgroundColor: soft }]}><Icon name={q.ic} size={18} color={O.deep} /></View>
              <Text style={[s.qt, { color: ink }]}>{q.l}</Text>
            </Pressable>
          ))}
        </View>

        <Section title="축제 한눈에">
          <View style={[s.card, { backgroundColor: card, borderColor: line }]}>
            {([
              ['기간', '2026.10.14(수) – 10.18(일)', `5일간 · 운영 ${FEST.hours}`],
              ['장소', FEST.placeName, `${FEST.placeDetail} · 춘천시 온의동 586`],
              ['주최', FEST.host, `운영 ${FEST.operator}`],
            ] as const).map((r, i) => (
              <View key={i} style={[s.irow, { borderBottomColor: line }]}>
                <Text style={[s.k, { color: ink2 }]}>{r[0]}</Text>
                <View style={{ flex: 1 }}><Text style={[s.v, { color: ink }]}>{r[1]}</Text>{!!r[2] && <Text style={[s.vs, { color: ink2 }]}>{r[2]}</Text>}</View>
              </View>
            ))}
            <Pressable onPress={() => open('tel:' + FEST.tel)} style={[s.irow, { borderBottomWidth: 0 }]}>
              <Text style={[s.k, { color: ink2 }]}>문의</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.v, { color: O.deep, fontWeight: '700' }]}>{FEST.telLabel}</Text>
                <Text style={[s.vs, { color: ink2 }]}>운영사무국 {FEST.telHours}</Text>
              </View>
            </Pressable>
          </View>
        </Section>

        <Section title="오시는 길">
          <Pressable onPress={festRoute} style={[s.mapfb, { backgroundColor: soft, borderColor: line }]}>
            <Icon name="pin" size={18} color={O.deep} />
            <Text style={{ flex: 1, marginLeft: 8, color: O.deep, fontWeight: '700', fontSize: 13.5 }}>공지천 산책로 일대 · 춘천 온의동 586</Text>
            <Text style={{ color: O.deep, fontWeight: '800', fontSize: 12.5 }}>네이버 길찾기 →</Text>
          </Pressable>
        </Section>

        <Section title="프로그램 · 타임테이블">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {DAYS.map((d) => {
              const on = day === d.k;
              return (
                <Pressable key={d.k} onPress={() => setDay(d.k)} style={[s.daychip, { backgroundColor: on ? O.pri : card, borderColor: on ? O.pri : line }]}>
                  <Text style={[s.dck, { color: on ? '#fff' : ink }]}>{d.k}</Text>
                  <Text style={[s.dcd, { color: on ? '#fff' : ink2 }]}>{d.d}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {rows.length ? (
            <View style={{ marginTop: 12 }}>
              {rows.map((e, i) => (
                <Pressable key={i} onPress={() => setEv(e)} style={[s.tlrow, { borderBottomColor: line }]}>
                  <Text style={[s.tltime, { color: O.deep }]}>{e.t}</Text>
                  <View style={[s.tlnode, { backgroundColor: nodeColor(e.type) }]} />
                  <View style={{ flex: 1 }}><Text style={[s.v, { color: ink }]}>{e.title}</Text>{!!e.loc && <Text style={[s.vs, { color: ink2 }]}>{e.loc}</Text>}</View>
                  <Icon name="chevronRight" size={16} color={ink2} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[s.note, { backgroundColor: soft, borderColor: line, marginTop: 10 }]}>
              <Icon name="note" size={16} color={O.deep} />
              <Text style={[s.noteT, { color: O.deep }]}>  이 날의 세부 일정은 공개 예정이에요. 확정되면 시간대별로 채워지고, 각 순서를 눌러 상세를 볼 수 있어요.</Text>
            </View>
          )}
          <View style={{ marginTop: 10, gap: 8 }}>
            <LinkRow ic="megaphone" label="공식 공연 프로그램" onPress={() => open(FEST.site + '/Stage')} />
            <LinkRow ic="store" label="마켓 & 이벤트" onPress={() => open(FEST.site + '/marketevent')} />
          </View>
        </Section>

        <Section title="관람 안내">
          <View style={s.tiles}>
            {tiles.map((tl) => (
              <Pressable key={tl.t} onPress={() => open(tl.u)} style={[s.tile, { backgroundColor: card, borderColor: line }]}>
                <View style={[s.ti, { backgroundColor: soft }]}><Icon name={tl.ic} size={16} color={O.deep} /></View>
                <Text style={[s.tt, { color: ink }]}>{tl.t}</Text>
                <Text style={[s.ts, { color: ink2 }]}>{tl.s2}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="참여 업체">
          {/* 공고 원문 일정 4단계 */}
          <View style={s.steps}>
            {STEPS.map(([label, when], i) => (
              <View key={label} style={s.step}>
                <View style={[s.stepDot, { backgroundColor: i === 0 ? O.pri : soft, borderColor: line }]}>
                  <Text style={[s.stepN, { color: i === 0 ? '#fff' : ink2 }]}>{i + 1}</Text>
                </View>
                <Text style={[s.stepL, { color: i === 0 ? ink : ink2 }]}>{label}</Text>
                <Text style={[s.stepW, { color: ink2 }]}>{when}</Text>
              </View>
            ))}
          </View>

          {/* 사장님 대상 모집 — 마감이 남은 건만 노출(지나면 스스로 사라짐) */}
          {ENTRY.some((e) => ddayOf(e.due) >= 0) && (
            <View style={[s.recruit, { backgroundColor: soft, borderColor: line }]}>
              <View style={s.recruitH}>
                <Icon name="store" size={16} color={O.deep} />
                <Text style={[s.recruitHT, { color: O.deep }]}>  우리 가게도 참여할 수 있어요</Text>
              </View>
              {ENTRY.filter((e) => ddayOf(e.due) >= 0).map((e) => {
                const d = ddayOf(e.due);
                return (
                  <Pressable key={e.key} onPress={() => open(e.url)} style={[s.rcard, { backgroundColor: card, borderColor: line }]}>
                    <View style={[s.rdd, { backgroundColor: d <= 3 ? O.pri : soft }]}>
                      <Text style={[s.rddT, { color: d <= 3 ? '#fff' : ink2 }]}>{d === 0 ? '오늘' : `D-${d}`}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.v, { color: ink }]}>{e.name}</Text>
                      <Text style={[s.vs, { color: ink2 }]}>{e.scale}</Text>
                      <Text style={[s.vs, { color: O.deep, fontWeight: '700' }]}>신청 마감 {e.dueLabel} · {e.by}</Text>
                    </View>
                    <Icon name="chevronRight" size={16} color={ink2} />
                  </Pressable>
                );
              })}
              <Text style={[s.vs, { color: ink2, marginTop: 2 }]}>
                신청서는 공고 첨부파일을 받아 작성 후 이메일·방문 접수해요. 부스 {FEST.cityTelLabel} · 로컬 F&B {FEST.telLabel}
              </Text>
            </View>
          )}

          <View style={[s.note, { backgroundColor: soft, borderColor: line, marginTop: 10 }]}>
            <Icon name="store" size={16} color={O.deep} />
            <Text style={[s.noteT, { color: O.deep }]}>  막국수·닭갈비 입점 업체는 선정 후 공개돼요. 확정되면 지도·업체 정보로 안내해 드려요.</Text>
          </View>
        </Section>

        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={[s.foot, { color: ink2 }]}>주최·주관  <Text style={{ color: ink, fontWeight: '700' }}>{FEST.host}</Text></Text>
          <Text style={[s.foot, { color: ink2 }]}>운영  {FEST.operator} · 대표 최금선</Text>
          <Text style={[s.foot, { color: ink2 }]}>문의  {FEST.telLabel} ({FEST.telHours}) · {FEST.email}</Text>
          <Text style={[s.foot, { color: ink2 }]}>부스 문의  춘천시청 관광정책과 {FEST.cityTelLabel}</Text>
          <Text style={[s.foot, { color: ink2, marginTop: 10 }]}>정보 출처: 2026 춘천막국수닭갈비축제 공식 사이트 및 모집공고. 세부 프로그램·업체는 공식 공개 후 업데이트됩니다.</Text>
        </View>
      </ScrollView>

      <Modal visible={!!ev} transparent animationType="slide" onRequestClose={() => setEv(null)}>
        <Pressable style={s.sheetBg} onPress={() => setEv(null)}>
          <Pressable style={[s.sheet, { backgroundColor: card }]} onPress={() => {}}>
            <View style={[s.grab, { backgroundColor: line }]} />
            {ev && (
              <View>
                <View style={[s.stype, { backgroundColor: nodeColor(ev.type) }]}><Text style={s.stypeT}>{evType(ev.type)}</Text></View>
                <Text style={[s.stime, { color: ink2 }]}>{ev.day} · {ev.t}</Text>
                <Text style={[s.stitle, { color: ink }]}>{ev.title}</Text>
                {!!ev.loc && <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}><Icon name="pin" size={14} color={ink2} /><Text style={{ color: ink2, fontSize: 13, marginLeft: 5 }}>{ev.loc}</Text></View>}
                {!!ev.desc && <Text style={[s.sdesc, { color: ink }]}>{ev.desc}</Text>}
                <Pressable onPress={() => setEv(null)} style={[s.sclose, { backgroundColor: O.pri }]}><Text style={s.scloseT}>닫기</Text></Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, marginBottom: 11 },
  badgeT: { color: '#fff', fontSize: 12, fontWeight: '700' },
  hname: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 33 },
  hsub: { color: '#fff', opacity: 0.92, fontSize: 13, fontWeight: '700', marginTop: 6 },
  // 참여업체 — 공고 일정 4단계 + 사장님 모집 카드
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepN: { fontSize: 12, fontWeight: '800' },
  stepL: { fontSize: 11.5, fontWeight: '700' },
  stepW: { fontSize: 10.5, fontWeight: '600' },
  recruit: { marginTop: 14, borderWidth: 1, borderRadius: 14, padding: 13, gap: 9 },
  recruitH: { flexDirection: 'row', alignItems: 'center' },
  recruitHT: { fontSize: 13.5, fontWeight: '800' },
  rcard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 12, padding: 11 },
  rdd: { minWidth: 50, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  rddT: { fontSize: 13, fontWeight: '800' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  pillT: { color: '#fff', fontSize: 14, fontWeight: '600' },
  loc: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  locT: { color: '#fff', fontSize: 13.5, opacity: 0.95 },
  quick: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
  qbtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 6 },
  qi: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  qt: { fontSize: 11.5, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 16 },
  irow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12, alignItems: 'flex-start' },
  k: { width: 44, fontSize: 13, fontWeight: '600' },
  v: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  vs: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  mapfb: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 15 },
  daychip: { minWidth: 52, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  dck: { fontSize: 14, fontWeight: '800' },
  dcd: { fontSize: 11 },
  tlrow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, gap: 10 },
  tltime: { width: 46, fontSize: 12.5, fontWeight: '800' },
  tlnode: { width: 9, height: 9, borderRadius: 5 },
  note: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 13, alignItems: 'flex-start' },
  noteT: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  lrow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, gap: 11 },
  li: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tile: { width: '47.5%', flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 14 },
  ti: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  tt: { fontSize: 13.5, fontWeight: '700' },
  ts: { fontSize: 11.5, marginTop: 2 },
  foot: { fontSize: 11.5, lineHeight: 19 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  grab: { width: 40, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: 16 },
  stype: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  stypeT: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stime: { fontSize: 12.5, fontWeight: '600', marginTop: 10 },
  stitle: { fontSize: 19, fontWeight: '800', marginTop: 3 },
  sdesc: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  sclose: { marginTop: 18, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  scloseT: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
