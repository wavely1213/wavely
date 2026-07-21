import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line as SvgLine, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { useScheme } from '@/lib/theme';
import { useAuth, hasPlacePass, isPlacePremium } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { requestAdPayment, PAY_AVAILABLE } from '@/lib/pay';

type Store = { id: string; name: string; category: string | null; address: string | null; naver_place_id: string | null; biz_verified: boolean; is_probe?: boolean };
type Kw = { id: string; keyword: string };
type Snap = { keyword: string; rank: number | null; save_count: number | null; visitor_review: number | null; blog_review: number | null; search_volume: number | null; total_biz: number | null; snap_date: string };
type Analysis = { n1: number | null; n2: number | null; n3: number | null; save_count: number | null; visitor_review: number | null; blog_review: number | null; best_rank: number | null; avg_rank: number | null; exposed_count: number | null; analyzed_at: string };

const MAX_KW = 30; // 사용자 제한 사실상 없음. 수집 서버 부하 보호용 상한(트리거도 30으로 맞춤)
const UP = '#E5484D';   // 상승(▲) — 빨강
const DOWN = '#3B82F6'; // 하락(▼) — 파랑

// 키워드별 N1(유사도) 추정 — 2026-06-18 adpin 9행 회귀(nestimate.py와 동일). 추정치(±0.04).
// 업체수<30(브랜드/단독노출)은 신뢰 어려워 null.
// nestimate.py v3 와 동일: 경쟁강도(업체수)·검색량 + 키워드↔업종 일치(2-gram). R²0.89
function catMatch(kw: string | null, cat: string | null): number {
  if (!kw || !cat) return 0;
  const bg = (s: string) => { const t = s.replace(/[,\s]/g, ''); const set = new Set<string>(); for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2)); return set; };
  const a = bg(kw), b = bg(cat);
  for (const x of a) if (b.has(x)) return 1;
  return 0;
}
function estN1(total: number | null, vol: number | null, kw?: string | null, cat?: string | null): number | null {
  if (!total || total < 30) return null;
  const n1 = 0.7062 - 0.12808 * Math.log10(total) + 0.047553 * Math.log10((vol ?? 0) + 1)
    - 0.062238 * catMatch(kw ?? null, cat ?? null);
  return Math.max(0, n1);
}

// W지수(와벨리 커뮤니티 지수): 커뮤니티 신호를 N지수와 같은 0~2 스케일로 정규화(v1 기준치 추후 튜닝).
// 기준치: 언급 10건 / 좋아요 50개 / 댓글 34개 = 각 만점. 데이터 없으면 null(수집 대기).
type WData = { mentions: number; likes: number; comments: number; recent30: number };
function calcWScore(w: WData | null): number | null {
  if (!w || (w.mentions === 0 && w.likes === 0 && w.comments === 0)) return null;
  const m = Math.min(1, w.mentions / 10);
  const l = Math.min(1, w.likes / 50);
  const c = Math.min(1, w.comments / 34);
  return +((m * 0.45 + l * 0.30 + c * 0.25) * 2).toFixed(2);
}

export default function PlaceRankScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { session, profile, refreshProfile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [stores, setStores] = useState<Store[]>([]);
  const [selStore, setSelStore] = useState<string>('');
  const [kws, setKws] = useState<Kw[]>([]);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [trendW, setTrendW] = useState(0);   // 추이 영역 폭(카드 그리드 컬럼 수 계산용)
  const [trendCollapsed, setTrendCollapsed] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const [detailKw, setDetailKw] = useState<string | null>(null);   // 키워드 탭 → 일자별 상세 스트립
  const [trendSel, setTrendSel] = useState<Record<string, boolean> | null>(null);   // 순위추이 선택 키워드(null=기본 상위)
  const [loading, setLoading] = useState(true);
  const [placeIdInput, setPlaceIdInput] = useState('');
  const [newKw, setNewKw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [kwSort, setKwSort] = useState<'rank' | 'volume'>('rank');
  const [probeId, setProbeId] = useState('');   // 관리자: 다른 매장 분석용 플레이스 ID
  const [usedWeek, setUsedWeek] = useState(0);     // 최근 7일 사용자 분석 요청 수(무료 7일 1회 판정)
  const [payReason, setPayReason] = useState<string | null>(null);   // 페이월 사유: 'weekly'|'competitor'
  const [wData, setWData] = useState<WData | null>(null);   // W지수(와벨리 커뮤니티 지수) 원천
  const paid = hasPlacePass(profile);              // 유료(basic/premium) 여부
  const premium = isPlacePremium(profile);         // 프리미엄(경쟁사 분석 가능)
  const freeLeft = paid ? Infinity : Math.max(0, 1 - usedWeek);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const loadStore = useCallback(async (sid: string) => {
    // 테이블 미생성 시에도 안전하게 빈 배열 처리
    const { data: k } = await supabase.from('place_rank_keywords').select('id,keyword').eq('store_id', sid).order('created_at');
    setKws((k as Kw[]) ?? []);
    const { data: r } = await supabase.from('place_rankings').select('keyword,rank,save_count,visitor_review,blog_review,search_volume,total_biz,snap_date').eq('store_id', sid).order('snap_date', { ascending: false });
    setSnaps((r as Snap[]) ?? []);
    // 하루 여러 번 분석돼도(6h 갱신) 날짜별로 묶어 최근 10일 윈도우를 채우려면 넉넉히 가져옴
    const { data: a } = await supabase.from('place_analysis').select('n1,n2,n3,save_count,visitor_review,blog_review,best_rank,avg_rank,exposed_count,analyzed_at').eq('store_id', sid).order('analyzed_at', { ascending: false }).limit(120);
    const hist = (a as Analysis[]) ?? [];
    setAnalysis(hist[0] ?? null);
    setHistory(hist);
  }, []);

  const load = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    // 최근 7일 내 내가 보낸 분석요청 수 — 무료 7일 1회 판정용(시스템 자동요청 제외 위해 requested_by 일치만)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { count: usedCnt } = await supabase.from('place_analysis_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requested_by', session.user.id)
      .gte('requested_at', weekAgo.toISOString());
    setUsedWeek(usedCnt ?? 0);
    const { data: st } = await supabase.from('stores').select('id,name,category,address,naver_place_id,biz_verified,is_probe').eq('owner_id', session.user.id);
    // 인증 매장 + (관리자) 프로브 매장. 프로브는 항상 뒤로 정렬.
    const owned = ((st as Store[]) ?? []).filter((s) => s.biz_verified || s.is_probe)
      .sort((a, b) => (a.is_probe ? 1 : 0) - (b.is_probe ? 1 : 0));
    setStores(owned);
    if (owned.length) {
      const sid = owned.some((s) => s.id === selStore) ? selStore : owned[0].id;
      setSelStore(sid);
      setPlaceIdInput(owned.find((s) => s.id === sid)?.naver_place_id ?? '');
      await loadStore(sid);
    }
    setLoading(false);
  }, [session, selStore, loadStore]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // W지수: 선택 매장명이 장소로 첨부된 커뮤니티 글의 언급·반응·댓글 집계 (네이버 N지수와 대비되는 와벨리 지수)
  useEffect(() => {
    const st = stores.find((s) => s.id === selStore);
    if (!st?.name) { setWData(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from('posts')
        .select('id,like_count,created_at,comments(count)')
        .ilike('place_name', `%${st.name}%`)
        .order('created_at', { ascending: false }).limit(200);
      if (!alive) return;
      const posts = (data as any[]) ?? [];
      setWData({
        mentions: posts.length,
        likes: posts.reduce((s, p) => s + (p.like_count || 0), 0),
        comments: posts.reduce((s, p) => s + (p.comments?.[0]?.count || 0), 0),
        recent30: posts.filter((p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400 * 1000).length,
      });
    })();
    return () => { alive = false; };
  }, [selStore, stores]);

  const pickStore = (sid: string) => {
    setSelStore(sid);
    setPlaceIdInput(stores.find((s) => s.id === sid)?.naver_place_id ?? '');
    setMsg('');
    loadStore(sid);
  };

  const savePlaceId = async () => {
    const v = placeIdInput.trim();
    if (!/^\d{5,}$/.test(v)) { setMsg('네이버 플레이스 ID(숫자)를 정확히 입력해주세요. 예: 2006014171'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.from('stores').update({ naver_place_id: v }).eq('id', selStore);
    setBusy(false);
    if (error) { setMsg('저장 실패: ' + error.message); return; }
    setMsg('✅ 네이버 매장이 연결됐어요. 분석할 키워드를 추가하고 [분석 시작]을 눌러주세요.');
    setStores((arr) => arr.map((s) => (s.id === selStore ? { ...s, naver_place_id: v } : s)));
  };

  // 다른 매장(경쟁사/프로브) 등록 → 선택 → [분석 시작]으로 동일 분석. 공개 노출 안 됨(is_probe).
  // 관리자 또는 유료(이용권) 사용자만. 무료는 페이월.
  const addProbe = async () => {
    if (!isAdmin && !premium) { setPayReason('competitor'); return; }
    const v = probeId.trim();
    if (!/^\d{5,}$/.test(v)) { setMsg('네이버 플레이스 ID(숫자)를 입력해주세요. 예: 1221419610'); return; }
    setBusy(true); setMsg('');
    const { data, error } = await supabase.from('stores')
      .insert({ owner_id: session!.user.id, name: '분석 매장', naver_place_id: v, is_probe: true })
      .select('id').single();
    setBusy(false);
    if (error || !data) { setMsg('등록 실패: ' + (error?.message ?? '다시 시도')); return; }
    setProbeId('');
    const nid = (data as any).id as string;
    await load();
    setSelStore(nid); setPlaceIdInput(v); loadStore(nid);
    setMsg('✅ 매장을 추가했어요. [분석 시작]을 누르면 매장명·키워드·순위를 자동으로 찾아 분석해요.');
  };

  const delProbe = async (sid: string) => {
    const { error } = await supabase.from('stores').delete().eq('id', sid);
    if (error) { setMsg('삭제 실패: ' + error.message); return; }
    if (selStore === sid) setSelStore('');
    load();
  };

  const addKw = async () => {
    const v = newKw.trim();
    if (!v) return;
    if (v.length < 2) { setMsg('키워드는 2글자 이상으로 입력해주세요.'); return; }
    if (kws.length >= MAX_KW) { setMsg(`키워드는 매장당 최대 ${MAX_KW}개까지예요.`); return; }
    if (kws.some((k) => k.keyword.toLowerCase() === v.toLowerCase())) { setMsg('이미 등록한 키워드예요.'); return; }
    setBusy(true); setMsg('');
    const { error } = await supabase.from('place_rank_keywords').insert({ store_id: selStore, keyword: v });
    setBusy(false);
    if (error) { setMsg('등록 실패: ' + error.message); return; }
    setNewKw('');
    loadStore(selStore);
  };

  const delKw = async (id: string) => {
    const { error } = await supabase.from('place_rank_keywords').delete().eq('id', id);
    if (error) { setMsg('키워드 삭제 실패: ' + error.message); return; }
    loadStore(selStore);
  };

  // 온디맨드 분석: 요청 큐 적재 → 수집 서버 처리 완료까지 폴링
  const pollAnalysis = useCallback(async (reqId: string, tries: number) => {
    if (!aliveRef.current) return;
    if (tries > 120) { setAnalyzing(false); setMsg('아직 수집 중이에요. 키워드를 깊게(300위) 훑는 중이라 시간이 걸려요. 화면을 나갔다 다시 들어오면 완료된 결과가 표시돼요.'); return; }
    const { data } = await supabase.from('place_analysis_requests').select('status,error').eq('id', reqId).single();
    const st = (data as any)?.status;
    if (st === 'done') {
      if (!aliveRef.current) return;
      setAnalyzing(false); setMsg('✅ 분석이 완료됐어요!');
      // 분석 중 워커가 매장명/카테고리/주소를 실제 플레이스 정보로 채웠을 수 있으니 매장정보도 갱신
      const { data: s } = await supabase.from('stores').select('id,name,category,address,naver_place_id,biz_verified,is_probe').eq('id', selStore).single();
      if (s && aliveRef.current) setStores((arr) => arr.map((x) => (x.id === selStore ? (s as Store) : x)));
      loadStore(selStore);
      return;
    }
    if (st === 'failed') { if (!aliveRef.current) return; setAnalyzing(false); setMsg('분석 실패: ' + ((data as any)?.error ?? '잠시 후 다시 시도해주세요')); return; }
    // 분석 초기에 워커가 매장명을 즉시 채우므로, 초반 몇 번은 매장정보도 새로고침해 실제명 반영
    if (st === 'running' && tries < 8) {
      const { data: s } = await supabase.from('stores').select('id,name,category,address,naver_place_id,biz_verified,is_probe').eq('id', selStore).single();
      if (s && aliveRef.current) setStores((arr) => arr.map((x) => (x.id === selStore ? (s as Store) : x)));
    }
    setTimeout(() => pollAnalysis(reqId, tries + 1), 3000);
  }, [selStore, loadStore]);

  const requestAnalysis = async () => {
    if (analyzing) return;
    const target = stores.find((s) => s.id === selStore);
    const isProbe = !!target?.is_probe;
    // ── 과금 게이팅(클라 선제 차단; 서버 트리거가 최종 강제) ──
    if (!isAdmin) {
      if (isProbe && !premium) { setPayReason('competitor'); return; }   // 경쟁사 = 프리미엄 전용
      if (!isProbe && !paid && usedWeek >= 1) { setPayReason('weekly'); return; }  // 무료 7일 1회 소진
    }
    // 키워드 등록 안 해도 OK — 등록 키워드 없으면 수집서버가 색인에서 노출 키워드 자동매칭
    setAnalyzing(true); setMsg('');
    const { data, error } = await supabase.from('place_analysis_requests').insert({ store_id: selStore, requested_by: session!.user.id }).select('id').single();
    if (error || !data) {
      setAnalyzing(false);
      // 서버 트리거 과금 차단(P0001) → 페이월
      if (error && /PAYWALL_COMPETITOR/.test(error.message)) { setPayReason('competitor'); return; }
      if (error && /PAYWALL_WEEKLY_LIMIT/.test(error.message)) { setUsedWeek(1); setPayReason('weekly'); return; }
      // 이미 진행중인 요청이 있으면(서버 유니크) 친절히 안내
      const dup = error && /duplicate|conflict|23505|unique/i.test(error.message);
      setMsg(dup ? '이미 분석이 진행 중이에요. 잠시만 기다려주세요. (끝나면 자동 반영)' : '분석 요청 실패: ' + (error?.message ?? '잠시 후 다시 시도'));
      return;
    }
    setUsedWeek((u) => u + 1);
    // 수집 서버(집 PC 워커) 가동 여부 확인 → 꺼져있으면 친절히 안내(요청은 저장됨)
    const { data: hb } = await supabase.from('worker_heartbeat').select('last_seen').eq('id', 1).single();
    const online = hb?.last_seen ? (Date.now() - new Date(hb.last_seen).getTime() < 3 * 60 * 1000) : false;
    setMsg(online
      ? '🔄 노출 키워드를 찾아 순위를 수집·분석 중이에요… (키워드를 깊게 훑어 수 분 걸릴 수 있어요. 끝나면 자동 반영)'
      : '📥 요청을 저장했어요. 지금 수집 서버가 꺼져 있어, 서버가 켜지면 자동으로 분석돼요. (화면을 나가도 결과는 저장돼요)');
    pollAnalysis((data as any).id, 0);
  };

  // 결제 → PortOne 결제 → 서버 검증(verify-place-pass) → grant_place_pass 자동 적용.
  const onPay = async (plan: 'basic' | 'premium', label: string) => {
    setPayReason(null);
    const amount = plan === 'premium' ? 50000 : 20000;
    const paymentId = `place-${plan}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setMsg(`💳 ${label} 결제를 진행해요…`);
    const pay = await requestAdPayment({
      paymentId, orderName: `와벨리 플레이스 분석 ${label}`, amount,
      email: session?.user.email ?? undefined, fullName: profile?.nickname, phoneNumber: profile?.phone ?? undefined,
    });
    if (!pay.ok) { setMsg('결제가 취소/실패했어요: ' + pay.reason); return; }
    const { data: v } = await supabase.functions.invoke('verify-place-pass', { body: { plan, payment_id: pay.paymentId } });
    if (v?.ok) {
      setMsg(`✅ ${label} 적용 완료! 무제한 분석${plan === 'premium' ? ' + 경쟁사 비교·분석' : ''}이 켜졌어요.`);
      await refreshProfile();   // 등급 즉시 반영(paid/premium 플래그 갱신)
      await load();
    } else {
      setMsg('결제는 됐는데 적용 확인이 안 됐어요: ' + (v?.reason ?? '잠시 후 다시 시도') + ' (중복결제 아님 — 고객센터 문의 시 결제번호 ' + paymentId + ')');
    }
  };

  const curStore = stores.find((s) => s.id === selStore);
  // 키워드별 최신 + 직전(추이) — 결과는 place_rankings(snaps) 기준
  const latestByKw = (kw: string) => { const rows = snaps.filter((s) => s.keyword === kw); return { latest: rows[0] ?? null, prev: rows[1] ?? null }; };
  const keywords = Array.from(new Set(snaps.map((s) => s.keyword)));
  const kwRows = keywords.map((kw) => {
    const { latest, prev } = latestByKw(kw);
    const delta = latest?.rank != null && prev?.rank != null ? prev.rank - latest.rank : null; // +면 상승
    const isNew = latest?.rank != null && prev == null; // 직전 데이터 없음 = 신규 진입
    const n1 = estN1(latest?.total_biz ?? null, latest?.search_volume ?? null, kw, curStore?.category ?? null);
    const prevN1 = prev ? estN1(prev.total_biz ?? null, prev.search_volume ?? null, kw, curStore?.category ?? null) : null;
    const n1Delta = n1 != null && prevN1 != null ? n1 - prevN1 : null; // +면 상승
    return { kw, rank: latest?.rank ?? null, prevRank: prev?.rank ?? null, delta, isNew, volume: latest?.search_volume ?? null, n1, n1Delta };
  }).sort((a, b) => kwSort === 'volume'
    ? (b.volume ?? -1) - (a.volume ?? -1)
    : (a.rank ?? 9999) - (b.rank ?? 9999));

  const total = kwRows.length;
  const top3 = kwRows.filter((r) => r.rank != null && r.rank <= 3).length;
  const top10 = kwRows.filter((r) => r.rank != null && r.rank <= 10).length;
  const beyond = total - top10;
  const rising = kwRows.filter((r) => r.delta != null && r.delta > 0);
  const falling = kwRows.filter((r) => r.delta != null && r.delta < 0);
  // 순위 추이: 기본 선택=상위 4개(노출된 것), 날짜축=순위 스냅 일자 최근 8일
  const defaultTrendKws = kwRows.filter((r) => r.rank != null).slice(0, 4).map((r) => r.kw);
  const trendSelMap = trendSel ?? Object.fromEntries(defaultTrendKws.map((k) => [k, true]));
  const selectedTrendKws = kwRows.map((r) => r.kw).filter((k) => trendSelMap[k]);
  const rankDates = Array.from(new Set(snaps.map((s) => s.snap_date))).sort().slice(-8);
  const rankSeries = selectedTrendKws.map((kw, idx) => ({
    kw, color: TREND_COLORS[idx % TREND_COLORS.length],
    ranks: rankDates.map((d) => snaps.find((s) => s.keyword === kw && s.snap_date === d)?.rank ?? null),
  }));
  const toggleTrendKw = (kw: string) => setTrendSel({ ...trendSelMap, [kw]: !trendSelMap[kw] });
  // 노출 점수(0~100): 키워드별 DCG gain 평균. rank1→100, 3→50, 10→29, 권외→0
  const exposure = total ? Math.round((kwRows.reduce((s, r) => s + (r.rank ? 100 / Math.log2(r.rank + 1) : 0), 0) / total)) : 0;
  const exposedRanks = kwRows.filter((r) => r.rank != null).map((r) => r.rank as number);
  const bestRank = exposedRanks.length ? Math.min(...exposedRanks) : null;
  const avgRank = exposedRanks.length ? Math.round(exposedRanks.reduce((a, b) => a + b, 0) / exposedRanks.length) : null;
  const metric = analysis ?? (snaps[0] as any) ?? null;
  const lastDate = snaps[0]?.snap_date ?? null;
  // 최근 갱신 일시(현지시간) — '네이버 연결됨' 옆 표시용
  const lastUpdated = analysis?.analyzed_at
    ? new Date(analysis.analyzed_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  const hasData = snaps.length > 0;
  // 일자별 추이(차트용): 하루 1포인트로 묶음(같은 날 여러 번 분석해도 최신 1개), 오래된→최신.
  // history는 analyzed_at desc → 날짜별 첫 항목이 그날 최신.
  // 손상값 방어: n1>1.2 는 실제로 불가능한 수치(옛 코드/부분수집 잔재) → 그 행 제외.
  const cleanHist = history.filter((h) => !(h.n1 != null && h.n1 > 1.2));
  const byDate: Record<string, Analysis> = {};
  for (const h of cleanHist) { const d = String(h.analyzed_at).slice(0, 10); if (!byDate[d]) byDate[d] = h; }
  const TREND_DAYS = 10;   // 일자별 추이 표시 윈도우(최근 N일). 하루 1포인트(그날 최신)로 묶음.
  const dataDays = Object.keys(byDate).sort();           // 기록 있는 날(UTC 날짜키)
  const daysWithData = dataDays.map((d) => byDate[d]);    // 전일대비 계산용(빈날 제외)
  const prevDay = daysWithData.length >= 2 ? daysWithData[daysWithData.length - 2] : null;
  // 최근 TREND_DAYS 캘린더 윈도우(기록 마지막 날을 끝으로, 오래된→최신). 빈 날은 null(칸은 유지).
  const windowDates: string[] = [];
  {
    const anchor = dataDays[dataDays.length - 1] ?? new Date().toISOString().slice(0, 10);
    const [ay, am, ad] = anchor.split('-').map(Number);
    const anchorMs = Date.UTC(ay, am - 1, ad);
    for (let i = TREND_DAYS - 1; i >= 0; i--) windowDates.push(new Date(anchorMs - i * 86400000).toISOString().slice(0, 10));
  }
  const chrono = windowDates.map((d) => byDate[d] ?? null);   // 길이=TREND_DAYS, 빈날=null
  const intFmt = (v: number) => Math.round(v).toLocaleString();
  const nFmt = (v: number) => v.toFixed(6);
  // 추이 시리즈(mock: 방문리뷰·블로그·저장수·N1·N2·N3). short=토글칩 라벨.
  const TREND_SERIES = [
    { key: 'visit', short: '방', title: '방문자리뷰', icon: 'user', color: '#7C3AED', fmt: intFmt, pick: (h: Analysis) => h.visitor_review },
    { key: 'blog', short: '블', title: '블로그리뷰', icon: 'note', color: '#3B82F6', fmt: intFmt, pick: (h: Analysis) => h.blog_review },
    { key: 'save', short: '저', title: '저장수', icon: 'bookmark', color: '#10B981', fmt: intFmt, pick: (h: Analysis) => h.save_count },
    { key: 'n1', short: 'N1', title: 'N1 지수', icon: 'chart', color: '#3B82F6', fmt: nFmt, pick: (h: Analysis) => h.n1 },
    { key: 'n2', short: 'N2', title: 'N2 지수', icon: 'chart', color: '#F59E0B', fmt: nFmt, pick: (h: Analysis) => h.n2 },
    { key: 'n3', short: 'N3', title: 'N3 지수', icon: 'chart', color: '#6B7280', fmt: nFmt, pick: (h: Analysis) => h.n3 },
  ];
  const trendCols = trendW >= 900 ? 3 : trendW >= 560 ? 2 : 1;   // 반응형 컬럼 수
  const trendGap = 10;
  const cardW = trendW > 0 ? (trendW - trendGap * (trendCols - 1)) / trendCols : 0;
  const nDelta = (cur: number | null, prv: number | null | undefined) =>
    cur != null && prv != null ? cur - prv : null;
  const nDeltaEl = (cur: number | null, prv: number | null | undefined) => {
    const d = nDelta(cur, prv);
    if (d == null || Math.abs(d) < 0.001) return null;
    return <Text style={{ color: d > 0 ? UP : DOWN, fontSize: 10, fontWeight: '700', marginTop: 1 }}>{d > 0 ? `▲${d.toFixed(3)}` : `▼${Math.abs(d).toFixed(3)}`}</Text>;
  };
  const showTrend = daysWithData.length >= 2;   // 기록 2일 이상이면 추이 표시(축은 10일 고정)

  const placeIdSet = !!curStore?.naver_place_id;

  if (loading) return <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}><ActivityIndicator color={c.primary} style={{ marginTop: 40 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { borderColor: c.border, backgroundColor: c.card }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}><Text style={[styles.back, { color: c.text }]}>‹ 뒤로</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="chart" size={16} color={c.text} />
          <Text style={[styles.hTitle, { color: c.text }]}>플레이스 분석</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {stores.length === 0 && !isAdmin ? (
        <View style={styles.center}>
          <Icon name="lock" size={42} color={c.textSecondary} />
          <Text style={{ color: c.text, fontWeight: '800', fontSize: 15, textAlign: 'center', marginTop: 8 }}>플레이스 분석은 인증 매장 사장님 전용이에요</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>내 매장의 네이버 플레이스 순위를 키워드별로{'\n'}분석해드려요. 사업주 인증 후 이용할 수 있어요.</Text>
          <Pressable onPress={() => router.push('/account-edit?biz=1')} style={[styles.cta, { backgroundColor: c.primary }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>🔓 사업주 인증하고 이용하기</Text></Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* 페이월 — 무료 1회 소진 또는 경쟁사 분석 시도 시 */}
          {payReason ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.primary, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon name="lock" size={15} color={c.text} />
                <Text style={{ color: c.text, fontWeight: '800', fontSize: 15, flex: 1 }}>
                  {payReason === 'competitor' ? '경쟁사 분석은 프리미엄 전용이에요' : '이번 주 무료 분석(7일 1회)을 모두 썼어요'}
                </Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, lineHeight: 18, marginBottom: 12 }}>
                {PAY_AVAILABLE
                  ? '본인 매장은 7일에 1회 무료예요. 무제한 분석은 월 구독, 경쟁사 비교·분석과 1:1 상담은 프리미엄에서 이용할 수 있어요.'
                  : payReason === 'competitor'
                    ? '경쟁사 비교·분석은 프리미엄 전용 기능이에요.'
                    : '본인 매장은 7일에 1회 무료로 분석할 수 있어요. 다음 주에 무료 분석이 다시 열려요.'}
              </Text>
              {/* 유료 구독 — 스토어 정책상 네이티브에선 앱 내 판매 없이 무료 안내만(웹 전문가센터에서 구독) */}
              {PAY_AVAILABLE && (
                <>
                  {/* 월 구독 */}
                  <Pressable onPress={() => onPay('basic', '월 구독')} style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: 12, padding: 14, marginBottom: 10, backgroundColor: c.background }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: c.text, fontWeight: '800', fontSize: 14.5 }}>월 구독</Text>
                      <Text style={{ color: c.text, fontWeight: '900', fontSize: 17 }}>₩20,000<Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600' }}>/월</Text></Text>
                    </View>
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 4 }}>본인 매장(사업자 인증) 30일 무제한 분석</Text>
                  </Pressable>
                  {/* 프리미엄 — 추천 */}
                  <Pressable onPress={() => onPay('premium', '프리미엄')} style={{ borderWidth: 2, borderColor: c.primary, borderRadius: 12, padding: 14, backgroundColor: c.primarySoft ?? c.background }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: c.primaryDeep ?? c.primary, fontWeight: '800', fontSize: 14.5 }}>프리미엄</Text>
                        <Icon name="star" size={14.5} color={c.primaryDeep ?? c.primary} />
                      </View>
                      <Text style={{ color: c.text, fontWeight: '900', fontSize: 17 }}>₩50,000<Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600' }}>/월</Text></Text>
                    </View>
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 4 }}>본인 무제한 + 경쟁사 비교·분석 + 1:1 상담 매니지먼트</Text>
                  </Pressable>
                </>
              )}
              <Pressable onPress={() => setPayReason(null)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={{ color: c.textSecondary, fontSize: 12.5 }}>닫기</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 매장 선택 */}
          {stores.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 12 }}>
              {stores.map((s) => {
                const on = s.id === selStore;
                return <Pressable key={s.id} onPress={() => pickStore(s.id)} style={[styles.storeChip, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: on ? c.primary : c.card, borderColor: on ? c.primary : c.border }]}>{s.is_probe ? <Icon name="search" size={13} color={on ? c.onPrimary : c.text} /> : null}<Text style={{ color: on ? c.onPrimary : c.text, fontWeight: '700', fontSize: 13 }}>{s.name}</Text></Pressable>;
              })}
            </ScrollView>
          )}

          {/* 내 매장 + 분석 시작 */}
          {curStore ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name={curStore?.is_probe ? 'search' : 'store'} size={16} color={c.text} />
              <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0, flex: 1, marginLeft: 6 }]}>{curStore?.name ?? '내 매장'}</Text>
              {placeIdSet ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>네이버 연결됨</Text>
                    <Icon name="check" size={12} color={c.primary} />
                  </View>
                  {lastUpdated ? <Text style={{ color: c.textSecondary, fontSize: 10.5, marginTop: 2 }}>갱신 {lastUpdated}</Text> : null}
                </View>
              ) : null}
            </View>

            {placeIdSet ? (
              <>
                <Pressable onPress={requestAnalysis} disabled={analyzing} style={[styles.analyzeBtn, { backgroundColor: hasData ? c.card : c.primary, borderWidth: hasData ? 1.5 : 0, borderColor: c.primary, opacity: analyzing ? 0.7 : 1 }]}>
                  {analyzing ? <ActivityIndicator color={hasData ? c.primary : c.onPrimary} size="small" /> : <Icon name={hasData ? 'refresh' : 'search'} size={16} color={hasData ? c.primary : c.onPrimary} />}
                  <Text style={{ color: hasData ? c.primary : c.onPrimary, fontWeight: '800', fontSize: 14.5, marginLeft: 6 }}>{analyzing ? '수집·분석 중…' : hasData ? '최신순위로 갱신' : '분석 시작'}</Text>
                </Pressable>
                <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 8, textAlign: 'center', lineHeight: 16 }}>{hasData ? '자동 수집된 최신 데이터예요. 더 최신으로 갱신하려면 위 버튼 (1~2분)' : '키워드 입력 없이 [분석 시작]만 누르면 노출 키워드를 자동으로 찾아 분석해요. (1~2분)'}</Text>
                {/* 잔여/유료 상태 (관리자는 지갑 무제한 → 프리미엄과 동일 표시. 런칭빌드에 dev 표식·결제우회 버튼 없음) */}
                <Text style={{ color: isAdmin || paid ? c.primary : (freeLeft > 0 ? c.textSecondary : '#E5484D'), fontSize: 11.5, marginTop: 6, textAlign: 'center', fontWeight: '700' }}>
                  {(isAdmin || premium) ? '프리미엄 — 무제한 + 경쟁사 분석' : paid ? '월 구독 — 본인 매장 무제한' : freeLeft > 0 ? '이번 주 무료 분석 1회 남음 (7일 1회)' : PAY_AVAILABLE ? '이번 주 무료 분석 소진 — 구독으로 계속하기' : '이번 주 무료 분석 소진 (다음 주 재개)'}
                  {!isAdmin && !paid && freeLeft <= 0 ? <Text onPress={() => setPayReason('weekly')} style={{ color: c.primary }}>  구독 →</Text> : null}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 8, lineHeight: 17 }}>내 매장의 네이버 플레이스를 한 번만 연결하면 자동으로 저장돼요. 네이버 지도에서 내 매장 URL의 숫자가 ID예요. (예: …/place/<Text style={{ fontWeight: '800', color: c.text }}>2006014171</Text>)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="플레이스 ID (숫자)" placeholderTextColor={c.textSecondary} value={placeIdInput} onChangeText={setPlaceIdInput} keyboardType="number-pad" />
                  <Pressable onPress={savePlaceId} disabled={busy} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy ? 0.6 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>연결</Text></Pressable>
                </View>
              </>
            )}
          </View>
          ) : null}

          {/* 분석 키워드 관리 */}
          {placeIdSet ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>고정 키워드 (선택 · {kws.length}/{MAX_KW})</Text>
              <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 10 }}>비워둬도 노출 키워드를 자동으로 찾아 분석해요. 꼭 챙겨보고 싶은 키워드만 추가하세요.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: kws.length ? 12 : 0 }}>
                {kws.map((k) => (
                  <View key={k.id} style={[styles.kwChip, { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
                    <Text style={{ color: c.primaryDeep, fontWeight: '700', fontSize: 13 }}>{k.keyword}</Text>
                    <Pressable onPress={() => delKw(k.id)} hitSlop={6} accessibilityLabel={`${k.keyword} 키워드 삭제`} style={{ marginLeft: 4 }}><Icon name="x" size={14} color={c.primaryDeep} /></Pressable>
                  </View>
                ))}
              </View>
              {kws.length < MAX_KW && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="예: 춘천 닭갈비" placeholderTextColor={c.textSecondary} value={newKw} onChangeText={setNewKw} onSubmitEditing={addKw} returnKeyType="done" maxLength={40} />
                  <Pressable onPress={addKw} disabled={busy || !newKw.trim()} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy || !newKw.trim() ? 0.5 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>추가</Text></Pressable>
                </View>
              )}
            </View>
          ) : null}

          {msg ? <Pressable onPress={() => setMsg('')} style={{ marginBottom: 12 }}><Text style={{ color: msg.startsWith('✅') || msg.startsWith('🔄') ? c.primary : '#E5484D', fontWeight: '700', fontSize: 13, lineHeight: 18 }}>{msg}</Text></Pressable> : null}

          {placeIdSet && !hasData ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>아직 분석 결과가 없어요. 위 [🔍 분석 시작]을 누르면 노출 키워드를 자동으로 찾아 순위·N지수·저장·리뷰까지 분석해드려요. (키워드 입력 불필요)</Text>
            </View>
          ) : null}

          {hasData ? (
            <>
              {/* 요약 카운트 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, flexDirection: 'row' }]}>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{total}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>총 키워드</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep }]}>{top3}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>TOP 3</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primary }]}>{top10}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>TOP 10</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: UP }]}>{rising.length}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>상승</Text></View>
                <View style={styles.statBox}><Text style={[styles.statVal, { color: DOWN }]}>{falling.length}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>하락</Text></View>
              </View>

              {/* 노출 점수 + 지수 + 지표 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 34 }}>{exposure}<Text style={{ fontSize: 15, fontWeight: '800' }}> 점</Text></Text>
                  <Text style={{ color: c.textSecondary, fontSize: 11.5 }}>노출 점수 (상위노출일수록 ↑, 100점 만점)</Text>
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 18 }]}>{bestRank != null ? `${bestRank}위` : '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>최고 순위</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 18 }]}>{avgRank != null ? `${avgRank}위` : '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>평균 순위</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.primaryDeep, fontSize: 18 }]}>{exposedRanks.length}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>노출 키워드</Text></View>
                </View>
                {analysis && (analysis.n1 != null || analysis.n2 != null || analysis.n3 != null) ? (
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: c.border }}>
                    <Text style={{ color: c.textSecondary, fontSize: 11, marginBottom: 8, textAlign: 'center' }}>N지수 (추정치 · 참고용){prevDay ? ' · 전일대비' : ''}</Text>
                    <View style={styles.statRow}>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text, fontSize: 15 }]}>{analysis.n1 != null ? analysis.n1.toFixed(3) : '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N1 유사도</Text>{nDeltaEl(analysis.n1, prevDay?.n1)}</View>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text, fontSize: 15 }]}>{analysis.n2 != null ? analysis.n2.toFixed(3) : '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N2 관련성</Text>{nDeltaEl(analysis.n2, prevDay?.n2)}</View>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text, fontSize: 15 }]}>{analysis.n3 != null ? analysis.n3.toFixed(3) : '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>N3 랭킹</Text>{nDeltaEl(analysis.n3, prevDay?.n3)}</View>
                    </View>
                  </View>
                ) : null}
                <View style={[styles.statRow, { marginTop: 12 }]}>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.save_count ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>저장수</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.visitor_review ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>방문리뷰</Text></View>
                  <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{metric?.blog_review ?? '-'}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>블로그</Text></View>
                </View>
                <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 12, lineHeight: 16 }}>순위·저장·리뷰는 네이버에서 직접 수집한 실측값이에요. N지수는 경쟁강도·검색량·리뷰 기반 추정치라 타 서비스와 ±0.05 정도 차이날 수 있어요.</Text>
                {lastDate ? <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 6, textAlign: 'right' }}>최근 분석 {analysis ? String(analysis.analyzed_at).slice(0, 16).replace('T', ' ') : lastDate}</Text> : null}
              </View>

              {/* W지수 (와벨리 커뮤니티 지수) — N지수=네이버 기반 / W지수=와벨리 커뮤니티 기반 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Icon name="chat" size={14.5} color={c.text} />
                  <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0 }]}>와벨리 W지수 <Text style={{ fontSize: 12, fontWeight: '400', color: c.textSecondary }}>(커뮤니티 기반)</Text></Text>
                </View>
                {wData && (wData.mentions > 0 || wData.likes > 0 || wData.comments > 0) ? (
                  <>
                    <View style={{ alignItems: 'center', marginVertical: 10 }}>
                      <Text style={{ color: c.primaryDeep, fontWeight: '900', fontSize: 30 }}>{calcWScore(wData) ?? '-'}</Text>
                      <Text style={{ color: c.textSecondary, fontSize: 11.5 }}>W지수 (와벨리 커뮤니티)</Text>
                    </View>
                    <View style={styles.statRow}>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{wData.mentions}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>언급</Text></View>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{wData.likes}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>좋아요</Text></View>
                      <View style={styles.statBox}><Text style={[styles.statVal, { color: c.text }]}>{wData.comments}</Text><Text style={[styles.statLabel, { color: c.textSecondary }]}>댓글</Text></View>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>아직 와벨리 커뮤니티에 우리 매장 언급이 없어요. 이웃들이 글에 매장을 첨부하면 자동 집계돼요.</Text>
                )}
                <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 10, lineHeight: 16 }}>N지수=네이버 기반 · W지수=와벨리 커뮤니티에서 우리 매장이 언급·반응된 정도예요.</Text>
              </View>

              {/* 일자별 추이 — 시리즈별 카드 그리드(방문리뷰·블로그·저장수·N1·N2·N3) + 토글칩 */}
              {showTrend ? (
                <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="chart" size={14.5} color={c.text} />
                      <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0 }]}>일자별 추이 (최근 {TREND_DAYS}일)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      {TREND_SERIES.map((s) => {
                        const on = !hiddenSeries[s.key];
                        return (
                          <Pressable key={s.key} onPress={() => setHiddenSeries((m) => ({ ...m, [s.key]: on }))}
                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: on ? s.color : (c.background), borderWidth: 1, borderColor: on ? s.color : c.border }}>
                            <Text style={{ color: on ? '#fff' : c.textSecondary, fontSize: 11, fontWeight: '800' }}>{s.short}</Text>
                          </Pressable>
                        );
                      })}
                      <Pressable onPress={() => setTrendCollapsed((v) => !v)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: c.border }}>
                        <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '800' }}>{trendCollapsed ? '펼치기' : '접기'}</Text>
                      </Pressable>
                    </View>
                  </View>
                  {!trendCollapsed ? (
                    <View onLayout={(e) => setTrendW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: trendGap }}>
                      {cardW > 0 ? TREND_SERIES.filter((s) => !hiddenSeries[s.key]).map((s) => (
                        <View key={s.key} style={{ width: cardW, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 8, backgroundColor: c.background }}>
                          <MetricChart c={c} title={s.title} icon={s.icon} color={s.color} dates={windowDates} byDate={byDate}
                            data={chrono.map((h) => h ? s.pick(h) : null)} fmt={s.fmt} />
                        </View>
                      )) : null}
                    </View>
                  ) : null}
                  {!trendCollapsed ? <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 8 }}>점 없는 날은 기록 없음(선은 끊겨도 날짜는 표기). 칩으로 지표 켜고 끄기.</Text> : null}
                </View>
              ) : (
                <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>일자별 추이</Text>
                  <Text style={{ color: c.textSecondary, fontSize: 12.5, lineHeight: 18 }}>분석이 2일 이상 쌓이면 방문리뷰·블로그·저장수·N1·N2·N3 추이를 그래프로 보여드려요. (현재 {daysWithData.length}일치 · 매일 자동 수집되며 쌓여요)</Text>
                </View>
              )}

              {/* 급등 / 급락 */}
              {(rising.length > 0 || falling.length > 0) ? (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, flex: 1, marginBottom: 0 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                      <Icon name="chart" size={13} color={UP} />
                      <Text style={{ color: UP, fontWeight: '800', fontSize: 13 }}>급등</Text>
                    </View>
                    {rising.length ? rising.slice(0, 5).map((r) => (
                      <View key={r.kw} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                        <Text style={{ color: c.text, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{r.kw}</Text>
                        <Text style={{ color: UP, fontWeight: '800', fontSize: 12.5 }}>▲{r.delta}</Text>
                      </View>
                    )) : <Text style={{ color: c.textSecondary, fontSize: 12 }}>없음</Text>}
                  </View>
                  <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, flex: 1, marginBottom: 0 }]}>
                    <Text style={{ color: DOWN, fontWeight: '800', fontSize: 13, marginBottom: 8 }}>📉 급락</Text>
                    {falling.length ? falling.slice(0, 5).map((r) => (
                      <View key={r.kw} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                        <Text style={{ color: c.text, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{r.kw}</Text>
                        <Text style={{ color: DOWN, fontWeight: '800', fontSize: 12.5 }}>▼{-r.delta!}</Text>
                      </View>
                    )) : <Text style={{ color: c.textSecondary, fontSize: 12 }}>없음</Text>}
                  </View>
                </View>
              ) : null}

              {/* 순위 분포 — 도넛 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>순위 분포</Text>
                <DonutChart c={c} total={total} segments={[
                  { label: 'TOP 3', n: top3, color: '#F59E0B' },
                  { label: 'TOP 4~10', n: top10 - top3, color: '#3B82F6' },
                  { label: '그 외', n: beyond, color: c.textSecondary },
                ]} />
              </View>

              {/* 기본정보 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.text }]}>기본정보</Text>
                <InfoRow c={c} label="플레이스명" value={curStore?.name ?? '-'} />
                <InfoRow c={c} label="카테고리" value={curStore?.category ?? '-'} />
                <InfoRow c={c} label="주소지" value={curStore?.address ?? '-'} />
                <InfoRow c={c} label="플레이스 ID" value={curStore?.naver_place_id ?? '-'} last />
              </View>

              {/* 키워드 순위 목록 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
                <Text style={[styles.sectionTitle, { color: c.text, marginTop: 0, marginBottom: 0 }]}>키워드 순위 ({total})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['rank', 'volume'] as const).map((s) => (
                    <Pressable key={s} onPress={() => setKwSort(s)} style={[styles.sortChip, { backgroundColor: kwSort === s ? c.primary : c.card, borderColor: kwSort === s ? c.primary : c.border }]}>
                      <Text style={{ color: kwSort === s ? c.onPrimary : c.textSecondary, fontSize: 11.5, fontWeight: '700' }}>{s === 'volume' ? '검색량순' : '순위순'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {kwRows.map((r) => (
                <View key={r.kw}>
                  <Pressable onPress={() => setDetailKw((p) => p === r.kw ? null : r.kw)} style={[styles.kwRow, { borderColor: c.border }]}>
                    <Pressable onPress={() => toggleTrendKw(r.kw)} hitSlop={6} style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: trendSelMap[r.kw] ? c.primary : c.border, backgroundColor: trendSelMap[r.kw] ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {trendSelMap[r.kw] ? <Text style={{ color: c.onPrimary ?? '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text> : null}
                    </Pressable>
                    <View style={[styles.rankPill, { backgroundColor: r.rank != null && r.rank <= 3 ? c.primary : r.rank != null && r.rank <= 10 ? c.primarySoft : c.backgroundElement ?? c.background }]}>
                      <Text style={{ color: r.rank != null && r.rank <= 3 ? c.onPrimary : r.rank != null && r.rank <= 10 ? c.primaryDeep : c.textSecondary, fontWeight: '800', fontSize: 12.5 }}>{r.rank != null ? `${r.rank}위` : '권외'}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{r.kw}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1, flexWrap: 'wrap' }}>
                        <Text style={{ color: c.textSecondary, fontSize: 11.5 }}>월 검색 {r.volume != null ? r.volume.toLocaleString() : '-'}{r.n1 != null ? ` · N1 ${r.n1.toFixed(2)}` : ''}</Text>
                        {r.n1Delta != null && Math.abs(r.n1Delta) >= 0.005 ? (
                          <Text style={{ color: r.n1Delta > 0 ? UP : DOWN, fontSize: 11.5, fontWeight: '700', marginLeft: 4 }}>
                            {r.n1Delta > 0 ? `▲${r.n1Delta.toFixed(2)}` : `▼${Math.abs(r.n1Delta).toFixed(2)}`}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
                      {r.isNew ? (
                        <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>NEW</Text>
                      ) : r.delta != null && r.delta !== 0 ? (
                        <Text style={{ color: r.delta > 0 ? UP : DOWN, fontWeight: '800', fontSize: 13 }}>{r.delta > 0 ? `▲${r.delta}` : `▼${-r.delta}`}</Text>
                      ) : r.delta === 0 ? (
                        <Text style={{ color: c.textSecondary, fontSize: 13 }}>—</Text>
                      ) : <Text style={{ color: c.textSecondary, fontSize: 11 }}>·</Text>}
                      {!r.isNew && r.prevRank != null && r.delta != null && r.delta !== 0 ? (
                        <Text style={{ color: c.textSecondary, fontSize: 10, marginTop: 1 }}>전일 {r.prevRank}위</Text>
                      ) : null}
                    </View>
                    <Text style={{ color: c.textSecondary, fontSize: 12, marginLeft: 6 }}>{detailKw === r.kw ? '▲' : '▼'}</Text>
                  </Pressable>
                  {detailKw === r.kw ? (
                    <KwDetailStrip c={c} kw={r.kw} snaps={snaps} byDate={byDate} category={curStore?.category ?? null} />
                  ) : null}
                </View>
              ))}

              {/* 순위 추이 — 체크한 키워드들의 일자별 순위 변화 */}
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="chart" size={14.5} color={c.text} />
                    <Text style={[styles.cardTitle, { color: c.text, marginBottom: 0 }]}>순위 추이</Text>
                  </View>
                  <Pressable onPress={() => setTrendSel(null)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: c.border }}>
                    <Text style={{ color: c.textSecondary, fontSize: 11.5, fontWeight: '700' }}>초기화</Text>
                  </Pressable>
                </View>
                {selectedTrendKws.length ? (
                  <>
                    <RankTrendChart c={c} dates={rankDates} series={rankSeries} />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {rankSeries.map((s) => (
                        <Pressable key={s.kw} onPress={() => toggleTrendKw(s.kw)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.background }}>
                          <View style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: s.color }} />
                          <Text style={{ color: c.text, fontSize: 11.5 }}>{s.kw}</Text>
                          <Icon name="x" size={12} color={c.textSecondary} />
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={{ color: c.textSecondary, fontSize: 12.5, paddingVertical: 14, textAlign: 'center' }}>위 목록에서 키워드를 체크하면 순위 변화를 그래프로 비교해요.</Text>
                )}
              </View>
            </>
          ) : null}

          {/* 다른 매장 분석(경쟁사) — 관리자/유료: 자유 분석 / 무료: 결제 안내 */}
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 22 }]}>경쟁사 매장 분석{(isAdmin || premium) ? ' (프리미엄)' : ''}</Text>
          {(isAdmin || premium) ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 8 }]}>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, marginBottom: 10, lineHeight: 18 }}>아무 네이버 플레이스 ID나 추가해 분석할 수 있어요. 매장명·노출 키워드·순위를 자동으로 찾아줘요. (공개 지도/검색에는 노출되지 않아요)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text, flex: 1 }]} placeholder="플레이스 ID (숫자)" placeholderTextColor={c.textSecondary} value={probeId} onChangeText={setProbeId} keyboardType="number-pad" onSubmitEditing={addProbe} returnKeyType="done" />
                <Pressable onPress={addProbe} disabled={busy || !probeId.trim()} style={[styles.smallBtn, { backgroundColor: c.primary, opacity: busy || !probeId.trim() ? 0.5 : 1 }]}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>＋ 추가</Text></Pressable>
              </View>
              {stores.filter((s) => s.is_probe).length ? (
                <View style={{ marginTop: 12 }}>
                  {stores.filter((s) => s.is_probe).map((s) => (
                    <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: c.border }}>
                      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => pickStore(s.id)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Icon name="search" size={13.5} color={s.id === selStore ? c.primary : c.text} />
                          <Text style={{ color: s.id === selStore ? c.primary : c.text, fontWeight: '700', fontSize: 13.5, flex: 1 }} numberOfLines={1}>{s.name}</Text>
                        </View>
                        <Text style={{ color: c.textSecondary, fontSize: 11.5, marginTop: 1 }}>ID {s.naver_place_id}</Text>
                      </Pressable>
                      <Pressable onPress={() => delProbe(s.id)} hitSlop={8} style={{ padding: 4 }}><Text style={{ color: '#E5484D', fontWeight: '800', fontSize: 13 }}>삭제</Text></Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : PAY_AVAILABLE ? (
            <Pressable onPress={() => setPayReason('competitor')} style={[styles.card, { backgroundColor: c.backgroundElement ?? c.card, borderColor: c.primary, borderWidth: 1.5, marginTop: 8, alignItems: 'center', paddingVertical: 22 }]}>
              <Icon name="lock" size={26} color={c.textSecondary} />
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, marginTop: 8 }}>경쟁사 분석은 프리미엄 기능이에요</Text>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>경쟁·관심 매장의 노출 키워드·순위·N지수 비교와{'\n'}1:1 상담은 프리미엄 구독에서 이용할 수 있어요.</Text>
              <Text style={{ color: c.primary, fontWeight: '800', fontSize: 13, marginTop: 10 }}>프리미엄 보기 →</Text>
            </Pressable>
          ) : (
            <View style={[styles.card, { backgroundColor: c.backgroundElement ?? c.card, borderColor: c.border, marginTop: 8, alignItems: 'center', paddingVertical: 22 }]}>
              <Icon name="lock" size={26} color={c.textSecondary} />
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, marginTop: 8 }}>경쟁사 분석은 프리미엄 기능이에요</Text>
              <Text style={{ color: c.textSecondary, fontSize: 12.5, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>경쟁·관심 매장의 노출 키워드·순위·N지수 비교는{'\n'}프리미엄 전용이에요.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ c, label, value, last }: { c: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderColor: c.border }}>
      <Text style={{ color: c.textSecondary, fontSize: 13, width: 90 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 13, flex: 1, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

// 지표별 라인차트(react-native-svg) — y축·그리드·영역채움·점·값라벨·날짜축. mock 스타일.
function MetricChart({ c, title, icon, color, dates, byDate, data, fmt, height = 150 }: {
  c: any; title: string; icon: string; color: string; dates: string[];
  byDate: Record<string, any>; data: (number | null)[]; fmt: (v: number) => string; height?: number;
}) {
  const [w, setW] = useState(0);
  const [tip, setTip] = useState<number | null>(null);   // 호버/탭한 점 인덱스(툴팁)
  const n = dates.length;
  const vals = data.filter((v): v is number => v != null);
  const hasData = vals.length >= 1;
  let min = hasData ? Math.min(...vals) : 0, max = hasData ? Math.max(...vals) : 1;
  if (min === max) { const pad = Math.abs(min) * 0.01 || 1; min -= pad; max += pad; }
  const range = max - min;
  const padL = 46, padR = 12, padT = 16, padB = 18;
  const W = w, H = height;
  const innerW = Math.max(1, W - padL - padR), innerH = H - padT - padB;
  const X = (i: number) => padL + innerW * (n <= 1 ? 0.5 : i / (n - 1));
  const Y = (v: number) => padT + innerH * (1 - (v - min) / range);
  // 연속 구간(빈 날 기준으로 끊음)
  const runs: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  data.forEach((v, i) => { if (v == null) { if (cur.length) { runs.push(cur); cur = []; } } else cur.push({ i, v }); });
  if (cur.length) runs.push(cur);
  const linePath = runs.map((run) => run.map((p, k) => `${k === 0 ? 'M' : 'L'}${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ')).join(' ');
  const areaPath = runs.filter((r) => r.length >= 2).map((run) => {
    const base = (H - padB).toFixed(1);
    return `M${X(run[0].i).toFixed(1)} ${base} ` + run.map((p) => `L${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ') + ` L${X(run[run.length - 1].i).toFixed(1)} ${base} Z`;
  }).join(' ');
  const ticks = [max, (max + min) / 2, min];
  const gid = `g_${title.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <Icon name={icon as any} size={13} color={color} />
        <Text style={{ color: c.text, fontSize: 12.5, fontWeight: '800' }}>{title}</Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height: H }}>
        {W > 0 && hasData ? (
          <>
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.18} />
                <Stop offset="1" stopColor={color} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {ticks.map((t, k) => (
              <Fragment key={k}>
                <SvgLine x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke={c.border} strokeWidth={1} />
                <SvgText x={padL - 5} y={Y(t) + 3} fontSize={8.5} fill={c.textSecondary} textAnchor="end">{fmt(t)}</SvgText>
              </Fragment>
            ))}
            {areaPath ? <Path d={areaPath} fill={`url(#${gid})`} /> : null}
            <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {tip != null && data[tip] != null ? (
              <SvgLine x1={X(tip)} y1={padT} x2={X(tip)} y2={H - padB} stroke={c.textSecondary} strokeWidth={1} strokeDasharray="3 3" />
            ) : null}
            {data.map((v, i) => v == null ? null : (
              <Fragment key={i}>
                <Circle cx={X(i)} cy={Y(v)} r={i === tip ? 5 : 3} fill={i === tip ? color : (c.card ?? '#fff')} stroke={color} strokeWidth={2} />
                {tip == null ? <SvgText x={X(i)} y={Y(v) - 6} fontSize={7.5} fill={c.textSecondary} textAnchor="middle">{fmt(v)}</SvgText> : null}
              </Fragment>
            ))}
            {dates.map((d, i) => (
              <SvgText key={'x' + d} x={X(i)} y={H - 5} fontSize={8} fontWeight={byDate[d] ? '700' : '400'}
                fill={byDate[d] ? c.textSecondary : c.border} textAnchor="middle">{d.slice(5)}</SvgText>
            ))}
          </Svg>
          {/* 호버/탭 히트영역(점마다) — 점 위에 올리면 툴팁 표시. 웹=hover, 모바일=탭 */}
          {data.map((v, i) => v == null ? null : (
            <Pressable key={'hit' + i} onHoverIn={() => setTip(i)} onHoverOut={() => setTip(null)}
              onPressIn={() => setTip((p) => p === i ? null : i)}
              style={{ position: 'absolute', left: X(i) - Math.max(9, innerW / (n - 1) / 2), top: padT, width: Math.max(18, innerW / (n - 1)), height: innerH }} />
          ))}
          {/* 툴팁 박스 — 날짜 + 값 */}
          {tip != null && data[tip] != null ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: Math.min(Math.max(X(tip) - 46, 2), W - 94), top: Math.max(2, Y(data[tip] as number) - 30), backgroundColor: '#2A2A2E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700' }}>{dates[tip].slice(5)}  {fmt(data[tip] as number)}</Text>
            </View>
          ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

const TREND_COLORS = ['#3B82F6', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#0EA5E9'];

// 순위 추이 — 선택 키워드들의 일자별 순위(여러 선). y축 반전(1위=위). null=그날 데이터 없음(선 끊김).
function RankTrendChart({ c, dates, series }: { c: any; dates: string[]; series: { kw: string; color: string; ranks: (number | null)[] }[] }) {
  const [w, setW] = useState(0);
  const all = series.flatMap((s) => s.ranks).filter((v): v is number => v != null);
  if (!all.length) return <Text style={{ color: c.textSecondary, fontSize: 12, paddingVertical: 14, textAlign: 'center' }}>선택한 키워드의 순위 데이터가 아직 없어요.</Text>;
  const lo = Math.max(1, Math.min(...all) - 1); let hi = Math.max(...all) + 1; if (hi <= lo) hi = lo + 1;
  const H = 190, padL = 36, padR = 12, padT = 14, padB = 20, n = dates.length;
  const W = w, innerW = Math.max(1, W - padL - padR), innerH = H - padT - padB;
  const X = (i: number) => padL + innerW * (n <= 1 ? 0.5 : i / (n - 1));
  const Y = (rk: number) => padT + innerH * ((rk - lo) / (hi - lo));   // rk=lo(작은순위)→위
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', height: H }}>
      {W > 0 ? (
        <Svg width={W} height={H}>
          {ticks.map((t, k) => (
            <Fragment key={k}>
              <SvgLine x1={padL} y1={Y(t)} x2={W - padR} y2={Y(t)} stroke={c.border} strokeWidth={1} />
              <SvgText x={padL - 5} y={Y(t) + 3} fontSize={8.5} fill={c.textSecondary} textAnchor="end">{t}위</SvgText>
            </Fragment>
          ))}
          {dates.map((d, i) => (
            <SvgText key={'x' + d} x={X(i)} y={H - 5} fontSize={8} fill={c.textSecondary} textAnchor="middle">{d.slice(5)}</SvgText>
          ))}
          {series.map((s) => {
            const runs: { i: number; rk: number }[][] = []; let cur: { i: number; rk: number }[] = [];
            s.ranks.forEach((rk, i) => { if (rk == null) { if (cur.length) { runs.push(cur); cur = []; } } else cur.push({ i, rk }); });
            if (cur.length) runs.push(cur);
            const path = runs.map((run) => run.map((p, k) => `${k === 0 ? 'M' : 'L'}${X(p.i).toFixed(1)} ${Y(p.rk).toFixed(1)}`).join(' ')).join(' ');
            return (
              <Fragment key={s.kw}>
                <Path d={path} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {s.ranks.map((rk, i) => rk == null ? null : <Circle key={i} cx={X(i)} cy={Y(rk)} r={3} fill={c.card ?? '#fff'} stroke={s.color} strokeWidth={2} />)}
              </Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

// 순위 분포 도넛 — TOP3 / TOP4~10 / 그 외.
function DonutChart({ c, segments, total }: { c: any; segments: { label: string; n: number; color: string }[]; total: number }) {
  const size = 116, stroke = 16, r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        {segments.map((s, i) => {
          const frac = total ? s.n / total : 0, dash = circ * frac, off = -acc; acc += dash;
          return <Circle key={i} cx={cx} cy={cy} r={r} stroke={s.color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={off} transform={`rotate(-90 ${cx} ${cy})`} />;
        })}
        <SvgText x={cx} y={cy + 1} fontSize={22} fontWeight="800" fill={c.text} textAnchor="middle">{total}</SvgText>
        <SvgText x={cx} y={cy + 15} fontSize={9.5} fill={c.textSecondary} textAnchor="middle">전체</SvgText>
      </Svg>
      <View style={{ gap: 7, flex: 1 }}>
        {segments.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: s.color }} />
            <Text style={{ color: c.text, fontSize: 12.5, flex: 1 }}>{s.label} <Text style={{ color: c.textSecondary }}>({s.n}개)</Text></Text>
            <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>{total ? Math.round(s.n / total * 100) : 0}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 키워드 일자별 상세 스트립 — 탭한 키워드의 최근 일자별 순위·방/블/저·N1/N2/N3 카드(가로 스크롤).
function KwDetailStrip({ c, kw, snaps, byDate, category }: { c: any; kw: string; snaps: Snap[]; byDate: Record<string, any>; category: string | null }) {
  const rows = snaps.filter((s) => s.keyword === kw).slice(0, 10);   // 이미 snap_date desc, 하루 1행
  if (!rows.length) return <Text style={{ color: c.textSecondary, fontSize: 12, paddingVertical: 8 }}>아직 일자별 기록이 없어요. 매일 자동 수집되며 쌓여요.</Text>;
  const N2C = '#F59E0B', N3C = c.textSecondary;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 4 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}>
      {rows.map((s, i) => {
        const prev = rows[i + 1];
        const delta = s.rank != null && prev?.rank != null ? prev.rank - s.rank : null;
        const n1 = estN1(s.total_biz, s.search_volume, kw, category);
        const day = byDate[s.snap_date] ?? null;
        const latest = i === 0;
        return (
          <View key={s.snap_date} style={{ width: 104, borderWidth: latest ? 1.5 : 1, borderColor: latest ? c.primary : c.border, borderRadius: 10, padding: 8, backgroundColor: latest ? (c.primarySoft ?? c.background) : c.background }}>
            <Text style={{ color: latest ? c.primaryDeep : c.textSecondary, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>{s.snap_date.slice(5)}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 3, marginTop: 2 }}>
              <Text style={{ color: latest ? c.primaryDeep : UP, fontSize: 18, fontWeight: '900' }}>{s.rank != null ? `${s.rank}위` : '권외'}</Text>
              <Text style={{ color: delta == null || delta === 0 ? c.textSecondary : delta > 0 ? UP : DOWN, fontSize: 10, fontWeight: '800' }}>{delta == null ? '-' : delta === 0 ? '–' : delta > 0 ? `▲${delta}` : `▼${-delta}`}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: c.border, marginTop: 6, paddingTop: 5, gap: 2 }}>
              {([['방', s.visitor_review], ['블', s.blog_review], ['저', s.save_count]] as const).map(([lb, val]) => (
                <View key={lb} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.textSecondary, fontSize: 10 }}>{lb}</Text>
                  <Text style={{ color: c.text, fontSize: 10, fontWeight: '600' }}>{val != null ? val.toLocaleString() : '-'}</Text>
                </View>
              ))}
            </View>
            <View style={{ borderTopWidth: 1, borderColor: c.border, marginTop: 5, paddingTop: 5, gap: 2 }}>
              {([['N1', n1, DOWN], ['N2', day?.n2 ?? null, N2C], ['N3', day?.n3 ?? null, N3C]] as const).map(([lb, val, col]) => (
                <View key={lb} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.textSecondary, fontSize: 10 }}>{lb}</Text>
                  <Text style={{ color: col, fontSize: 10, fontWeight: '700' }}>{val != null ? Number(val).toFixed(6) : '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function DistBar({ c, label, n, total, color, last }: { c: any; label: string; n: number; total: number; color: string; last?: boolean }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <View style={{ marginBottom: last ? 0 : 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: c.text, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: c.textSecondary, fontSize: 12 }}>{n}개 · {pct}%</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.background, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '700' },
  hTitle: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  cta: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  storeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  smallBtn: { paddingHorizontal: 16, justifyContent: 'center', borderRadius: 10 },
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  statRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 19, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  kwChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  kwRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1 },
  rankPill: { minWidth: 44, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
});
