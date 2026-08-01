// 아이템 도감 — 앱(RN) 정본 = NEIGHBORHOOD_LEVEL.md 화면 G.
// 웹은 모달 + 세 섹션 세로 스택 + 즉시 착용이지만, 앱은
//   전체화면 푸시 · 세그먼트 3분할 · 그리드 3열 · **저장 시 커밋**(실수 방지)
// 이 정본이다. 데이터·해금 조건은 웹과 완전히 동일하고, 다른 것은 레이아웃뿐.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Txt';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { BG_KEYS, BG_NAME, LevelBg, type BgKey } from '@/components/LevelBg';
import {
  LevelRing, TIER_LABEL, TITLE_NAME, titleLabel, type LevelCardData,
} from '@/components/LevelCard';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useScheme } from '@/lib/theme';

// 등급 테두리는 레벨로 열리고(user_unlocks 대상 아님), 특수 테두리는 지급으로 열린다 — 웹과 동일.
const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const TIER_LV: Record<string, number> = { bronze: 1, silver: 10, gold: 20, platinum: 35, diamond: 50 };
const BORDERS: { key: string; name: string; cond: string; tag?: Tag }[] = [
  ...TIER_ORDER.map((k) => ({ key: k, name: TIER_LABEL[k], cond: `Lv ${TIER_LV[k]} 달성` })),
  { key: 'founder', name: '창단 멤버', cond: '출시 첫 달 가입', tag: 'rare' },
  { key: 'streak_30', name: '개근 이웃', cond: '연속 출석 30일' },
  { key: 'season_sakura', name: '벚꽃 시즌', cond: '봄 시즌 획득', tag: 'season' },
  { key: 'sponsor', name: '와벨리 단골', cond: '와벨리 공식 단골', tag: 'rare' },
];
const TITLES: { key: string; cond: string; tag?: Tag }[] = [
  { key: 'rookie', cond: 'Lv 1' }, { key: 'guardian', cond: 'Lv 10' }, { key: 'chatter', cond: '댓글 300개' },
  { key: 'localboss', cond: '동 활동 상위 3명', tag: 'rare' }, { key: 'hunter', cond: '인증 리뷰 30개', tag: 'rare' },
  { key: 'beloved', cond: '좋아요 500회 받음', tag: 'rare' }, { key: 'evangelist', cond: '친구 초대 10명' },
  { key: 'captain', cond: 'Lv 20 + 활동', tag: 'rare' }, { key: 'regular', cond: '매장별 30일 방문 1위', tag: 'store' },
];
const BG_COND: Record<BgKey, string> = {
  plain: '기본 제공', wave: 'Lv 1', dots: 'Lv 5', ripple: 'Lv 15', mountain: 'Lv 25',
  lake: 'Lv 40', sakura: '봄 시즌 한정', firework: '축제 참여 인증', founder: '출시 첫 달 가입',
};
const BG_TAG: Partial<Record<BgKey, Tag>> = { sakura: 'season', firework: 'season', founder: 'rare' };

// 상태 pill은 앱에서 코너 도트 8px로 축약(화면 G). 레어=금 · 시즌=분홍 · 매장=주황 · 일반=스카이.
type Tag = 'rare' | 'season' | 'store';
const DOT: Record<Tag | 'own', string> = { rare: '#D9A527', season: '#DB6E97', store: '#F26D1F', own: '#0EA5E9' };
type Seg = 'border' | 'background' | 'title';

export default function Dogam() {
  const router = useRouter();
  const scheme = useScheme();
  const c = Colors[scheme];
  const dark = scheme === 'dark';
  const { session, profile } = useAuth();
  const uid = session?.user?.id;

  const [card, setCard] = useState<LevelCardData | null>(null);
  const [seg, setSeg] = useState<Seg>('border');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 앱은 저장 시 커밋 — 착용 변경을 로컬 draft에 모았다가 하단 바에서 한 번에 반영한다.
  const [draft, setDraft] = useState<{ border?: string | null; background?: string | null; title?: string | null }>({});

  const load = useCallback(async () => {
    if (!uid) return;
    try {
      const { data, error } = await supabase.rpc('get_level_card', { p_user: uid });
      if (!error && data) setCard(data as LevelCardData);
    } catch { /* dormant */ }
  }, [uid]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const owned = useMemo(() => new Set((card?.unlocks || []).map((u) => `${u.kind}:${u.key}`)), [card]);
  const lvl = card?.level ?? 1;
  const hasBorder = (k: string) => (TIER_LV[k] ? lvl >= TIER_LV[k] : owned.has(`border:${k}`));
  const hasBg = (k: string) => k === 'plain' || owned.has(`background:${k}`);
  const hasTitle = (k: string) => owned.has(`title:${k}`);

  const curBorder = draft.border !== undefined ? draft.border : (card?.equipped_border ?? card?.tier ?? 'bronze');
  const curBg = draft.background !== undefined ? draft.background : (card?.equipped_background ?? 'plain');
  const curTitle = draft.title !== undefined ? draft.title : (card?.equipped_title ?? null);
  const dirty = Object.keys(draft).length > 0;

  const counts = {
    border: [BORDERS.filter((b) => hasBorder(b.key)).length, BORDERS.length],
    background: [BG_KEYS.filter(hasBg).length, BG_KEYS.length],
    title: [TITLES.filter((t) => hasTitle(t.key)).length, TITLES.length],
  } as const;
  const got = counts.border[0] + counts.background[0] + counts.title[0];
  const all = counts.border[1] + counts.background[1] + counts.title[1];

  const save = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    try {
      // 서버가 보유 검증을 하므로 실패하면 사유를 그대로 보여준다(낙관적 반영 후 롤백).
      const calls: PromiseLike<any>[] = [];
      if (draft.border !== undefined) calls.push(supabase.rpc('equip_border', { p_key: draft.border }));
      if (draft.background !== undefined) calls.push(supabase.rpc('equip_background', { p_key: draft.background }));
      if (draft.title !== undefined) calls.push(supabase.rpc('equip_title', { p_key: draft.title }));
      const res = await Promise.all(calls);
      const bad = res.find((r) => r?.error || r?.data?.ok === false);
      if (bad) { setToast(bad?.data?.reason || '변경하지 못했어요.'); }
      else { setDraft({}); setToast('저장했어요.'); await load(); }
    } catch { setToast('변경하지 못했어요.'); }
    setBusy(false);
  };

  if (!card) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.primary} />
      </SafeAreaView>
    );
  }

  // 잠긴 셀 = 40% 디밍 + 좌상단 자물쇠. 탭하면 해금 조건 토스트만(화면 G).
  const Cell = ({ locked, tag, onPress, children, name, state }: {
    locked: boolean; tag?: Tag; onPress: () => void; children: React.ReactNode; name: string; state: string;
  }) => (
    <Pressable
      onPress={onPress}
      style={[s.cell, { backgroundColor: c.card, borderColor: state === '착용중' ? c.primary : c.border, opacity: locked ? 0.4 : 1 }]}
    >
      {!locked && !!tag && <View style={[s.dot, { backgroundColor: DOT[tag] }]} />}
      {locked && <View style={s.lock}><Icon name="lock" size={11} color={c.textSecondary} /></View>}
      <View style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <Text style={[s.cellN, { color: c.text }]} numberOfLines={1}>{name}</Text>
      <Text style={[s.cellS, { color: state === '착용중' ? c.primaryDeep : c.textSecondary }]} numberOfLines={1}>{state}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {/* 좌상단 back · 우상단 수집 N/M */}
      <View style={[s.bar, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Icon name="chevronLeft" size={22} color={c.text} /></Pressable>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: c.text, marginLeft: 8 }}>아이템 도감</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.textSecondary }}>수집 {got} / {all}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 108 }}>
        {/* 장착 미리보기 바 — 배경은 착용 배경 패턴이 깔린다 */}
        <View style={[s.eq, { borderColor: c.border }]}>
          <LevelBg bg={curBg} dark={dark} radius={16} />
          <LevelRing tier={card.tier} border={curBorder} size={44} label={card.nickname} img={profile?.avatar_url} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '800', color: c.text }} numberOfLines={1}>{card.nickname}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {!!curTitle && (
                <View style={[s.chip, { backgroundColor: c.primarySoft }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: c.primaryDeep }}>{titleLabel(curTitle, card.dong)}</Text>
                </View>
              )}
              <View style={[s.chip, { backgroundColor: c.backgroundElement }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: c.textSecondary }}>Lv {card.level} · {TIER_LABEL[card.tier] || '브론즈'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 세그먼트 3분할 — 각 라벨에 보유/전체 병기 */}
        <View style={[s.seg, { backgroundColor: c.backgroundElement }]}>
          {([['border', '테두리'], ['background', '배경'], ['title', '칭호']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setSeg(k)} style={[s.segBtn, seg === k && { backgroundColor: c.card }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: seg === k ? c.text : c.textSecondary }}>{l}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: c.textSecondary }}>{counts[k][0]}/{counts[k][1]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.grid}>
          {seg === 'border' && BORDERS.map((b) => {
            const own = hasBorder(b.key); const on = curBorder === b.key;
            return (
              <Cell key={b.key} locked={!own} tag={b.tag} name={b.name} state={on ? '착용중' : own ? '보유' : b.cond}
                onPress={() => (own ? setDraft((d) => ({ ...d, border: b.key })) : setToast(`${b.name} — ${b.cond}`))}>
                {/* 링 34px → §3-2 밀도 게이트로 파티클·메달 미렌더 */}
                <LevelRing tier={card.tier} border={b.key} size={34} label={card.nickname} />
              </Cell>
            );
          })}
          {seg === 'background' && BG_KEYS.map((k) => {
            const own = hasBg(k); const on = curBg === k;
            return (
              <Cell key={k} locked={!own} tag={BG_TAG[k]} name={BG_NAME[k]} state={on ? '착용중' : own ? '보유' : BG_COND[k]}
                onPress={() => (own ? setDraft((d) => ({ ...d, background: k })) : setToast(`${BG_NAME[k]} — ${BG_COND[k]}`))}>
                <View style={[s.bgsw, { borderColor: c.border }]}>
                  <LevelBg bg={k} dark={dark} radius={9} />
                  {k === 'plain' && <Text style={{ fontSize: 10.5, fontWeight: '800', color: c.textSecondary }}>기본</Text>}
                </View>
              </Cell>
            );
          })}
          {seg === 'title' && TITLES.map((t) => {
            const own = hasTitle(t.key); const on = curTitle === t.key;
            return (
              <Cell key={t.key} locked={!own} tag={t.tag} name={TITLE_NAME[t.key] || t.key} state={on ? '착용중' : own ? '보유' : t.cond}
                onPress={() => (own ? setDraft((d) => ({ ...d, title: on ? null : t.key })) : setToast(`${TITLE_NAME[t.key]} — ${t.cond}`))}>
                <View style={[s.chip, { backgroundColor: t.tag === 'rare' ? '#FFF6CE' : c.primarySoft, paddingVertical: 5 }]}>
                  <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '800', color: t.tag === 'rare' ? '#9A7518' : c.primaryDeep }}>
                    {titleLabel(t.key, card.dong)}
                  </Text>
                </View>
              </Cell>
            );
          })}
        </View>

        <Text style={{ paddingHorizontal: 16, marginTop: 14, fontSize: 12, lineHeight: 18, color: c.textSecondary }}>
          꾸미기 전용이에요. 레벨·테두리·칭호는 검색 순위, 광고 노출, 매장 추천에 어떤 영향도 주지 않아요.
        </Text>
      </ScrollView>

      {!!toast && (
        <View style={[s.toast, { backgroundColor: c.text }]}>
          <Text style={{ color: c.background, fontSize: 12.5, fontWeight: '700' }}>{toast}</Text>
        </View>
      )}

      {/* 하단 고정 확정 바 — 앱은 저장 시 커밋 */}
      <SafeAreaView edges={['bottom']} style={[s.save, { backgroundColor: c.card, borderTopColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>
            {dirty
              ? `변경한 착용 · ${[draft.border !== undefined && '테두리', draft.background !== undefined && '배경', draft.title !== undefined && '칭호'].filter(Boolean).join(' · ')}`
              : '카드를 눌러 착용을 바꿔보세요'}
          </Text>
        </View>
        <Pressable onPress={save} disabled={!dirty || busy}
          style={[s.saveBtn, { backgroundColor: dirty && !busy ? c.primary : c.backgroundElement }]}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: dirty && !busy ? c.onPrimary : c.textSecondary }}>
            {busy ? '저장 중…' : '저장'}
          </Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  eq: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 14, padding: 14, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, maxWidth: '100%' },
  seg: { flexDirection: 'row', marginHorizontal: 14, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9, gap: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, marginTop: 12 },
  // 3열 · 셀 최소 높이 112px(화면 G)
  cell: { width: '31.5%', minHeight: 112, borderWidth: 1, borderRadius: 14, paddingTop: 14, paddingBottom: 9, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  cellN: { fontSize: 11.5, fontWeight: '800' },
  cellS: { fontSize: 10, fontWeight: '700' },
  dot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
  lock: { position: 'absolute', top: 6, left: 6 },
  bgsw: { width: 44, height: 44, borderRadius: 9, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 96, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  save: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  saveBtn: { height: 42, paddingHorizontal: 22, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
