import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useScheme } from '@/lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

import NativeDongMap, { type DongMapItem } from '@/components/NativeDongMap';
import { StripBanner } from '@/components/StripBanner';
import { prettyCat } from '@/constants/app';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const MAINS: { key: string | null; label: string; emoji: string }[] = [
  { key: null, label: '전체', emoji: '🏘️' },
  { key: '음식점', label: '음식점', emoji: '🍴' },
  { key: '쇼핑', label: '쇼핑', emoji: '🛍️' },
  { key: '미용·뷰티', label: '미용', emoji: '💇' },
  { key: '교육', label: '교육', emoji: '📚' },
  { key: '의료', label: '의료', emoji: '🏥' },
  { key: '숙박', label: '숙박', emoji: '🏨' },
  { key: '여가·오락', label: '여가', emoji: '🎯' },
  { key: '생활서비스', label: '생활', emoji: '🔧' },
  { key: '기타', label: '기타', emoji: '📦' },
];
const SUBS: Record<string, { label: string; pat: string }[]> = {
  음식점: [{ label: '한식', pat: '한식' }, { label: '카페', pat: '비알코올' }, { label: '술집', pat: '주점' }, { label: '분식', pat: '간이' }, { label: '중식', pat: '중식' }, { label: '일식', pat: '일식' }, { label: '양식', pat: '서양식' }],
  쇼핑: [{ label: '의류', pat: '섬유' }, { label: '종합소매', pat: '종합 소매' }, { label: '식료품', pat: '식료품' }, { label: '가전', pat: '가전' }],
  '미용·뷰티': [{ label: '미용실', pat: '이용' }, { label: '세탁', pat: '세탁' }],
  교육: [{ label: '학원', pat: '교육' }],
  의료: [{ label: '병원·의원', pat: '의원' }, { label: '약국', pat: '의약' }],
  숙박: [{ label: '숙박', pat: '숙박' }],
  '여가·오락': [{ label: '수영장', pat: '수영' }, { label: '스포츠', pat: '스포츠' }, { label: '오락', pat: '유원지' }],
  생활서비스: [{ label: '부동산', pat: '부동산' }, { label: '자동차', pat: '자동차' }],
  기타: [],
};
const CATCOLOR: Record<string, string> = {
  음식점: '#FF6B4A', 쇼핑: '#4D96FF', '미용·뷰티': '#FF6FB5', 교육: '#5FBF73', 의료: '#00BFA6',
  숙박: '#9B7BFF', '여가·오락': '#FF9F40', 생활서비스: '#8A94A6', 기타: '#AAB2BD',
};
const colorOf = (m: string | null) => CATCOLOR[m ?? ''] ?? '#AAB2BD';
const emojiOf = (m: string | null) => MAINS.find((x) => x.key === m)?.emoji ?? '📍';
const trimAddr = (a: string | null) => (a ?? '').replace(/^강원특별자치도\s*/, '').replace(/^서울특별시\s*/, '');

const U = (id: string) => `https://images.unsplash.com/${id}?w=400&q=60&auto=format`;
const MAIN_IMG: Record<string, string> = {
  음식점: U('photo-1504674900247-0877df9cc836'), 쇼핑: U('photo-1441986300917-64674bd600d8'),
  '미용·뷰티': U('photo-1560066984-138dadb4c035'), 교육: U('photo-1503676260728-1c00da094a0b'),
  의료: U('photo-1519494026892-80bbd2d6fd0d'), 숙박: U('photo-1566073771259-6a8506099945'),
  '여가·오락': U('photo-1517649763962-0c623066013b'), 생활서비스: U('photo-1441986300917-64674bd600d8'), 기타: U('photo-1441986300917-64674bd600d8'),
};
const KW: [string, string][] = [
  ['한식', U('photo-1498654896293-37aacf113fd9')], ['비알코올', U('photo-1495474472287-4d71bcdd2085')], ['주점', U('photo-1514933651103-005eec06c04b')],
  ['간이', U('photo-1583224964978-2257b960c3d3')], ['중식', U('photo-1585032226651-759b368d7246')], ['일식', U('photo-1579871494447-9811cf80d66c')],
  ['서양식', U('photo-1551183053-bf91a1d81141')], ['양식', U('photo-1551183053-bf91a1d81141')], ['고기', U('photo-1555939594-58d7cb561ad1')],
  ['제과', U('photo-1509440159596-0249088772ff')], ['섬유', U('photo-1441984904996-e0b6ba687e04')], ['식료품', U('photo-1542838132-92c53300491e')], ['의약', U('photo-1587854692152-cbe660dbde88')],
];
function imgFor(category: string | null, main: string | null): string {
  const cat = category ?? '';
  for (const [k, url] of KW) if (cat.includes(k)) return url;
  return MAIN_IMG[main ?? ''] ?? MAIN_IMG.쇼핑;
}

function deriveMain(category: string | null): string {
  const cat = category ?? '';
  const has = (...ks: string[]) => ks.some((k) => cat.includes(k));
  if (has('부동산', '자동차', '수리', '세차', '청소', '광고', '인쇄', '디자인', '컨설팅', '기술', '방제', '경영')) return '생활서비스';
  if (has('이용', '미용', '세탁')) return '미용·뷰티';
  if (has('교육', '학원')) return '교육';
  if (has('의원', '병원', '약', '의료', '한의', '치과')) return '의료';
  if (has('숙박', '호텔', '모텔', '펜션')) return '숙박';
  if (has('스포츠', '오락', '유원지', '노래', '골프', 'PC', '헬스', '수영', '워터', '볼링', '당구')) return '여가·오락';
  if (has('한식', '중식', '일식', '양식', '분식', '간이', '비알코올', '제과', '주점', '닭', '고기', '횟집', '음식', '퓨전', '카페', '술집', '맛집', '치킨', '베이커리')) return '음식점';
  if (has('소매', '쇼핑', '마트', '편의점', '의류', '식료품')) return '쇼핑';
  return '기타';
}

// 한글 지명이 표기되는 지도 타일 (네이버 지도 API 연동 전 임시) — OSM 한국 데이터는 한글 라벨
const OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const PAGE_SIZE = 20;

const CENTER = { lat: 37.8813, lng: 127.7298 }; // 춘천 중심 (위치 거부 시 기본값)
const RADIUS_OPTS = [1, 3, 5, 10] as const; // km

// 두 좌표 사이 거리(km) — 하버사인
function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 현재 위치 (웹: navigator, 네이티브: expo-location). 실패 시 null.
async function getMyLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') {
      return await new Promise((res) => {
        const g = (globalThis as any).navigator?.geolocation;
        if (!g) return res(null);
        g.getCurrentPosition(
          (p: any) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => res(null),
          { timeout: 8000, maximumAge: 60000 },
        );
      });
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// 페이지 번호 윈도우 (최대 10개)
function pageWindow(cur: number, totalPages: number): number[] {
  const max = 7;
  let start = Math.max(1, cur - Math.floor(max / 2));
  const end = Math.min(totalPages, start + max - 1);
  start = Math.max(1, end - max + 1);
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function injectCss(d: any, id: string, href: string) {
  if (d.getElementById(id)) return;
  const link = d.createElement('link');
  link.id = id; link.rel = 'stylesheet'; link.href = href;
  d.head.appendChild(link);
}
function injectScript(d: any, id: string, src: string): Promise<void> {
  return new Promise((res, rej) => {
    const ex = d.getElementById(id);
    if (ex) { if ((ex as any)._loaded) return res(); ex.addEventListener('load', () => res()); ex.addEventListener('error', () => rej(new Error(id))); return; }
    const s = d.createElement('script');
    s.id = id; s.src = src;
    s.onload = () => { (s as any)._loaded = true; res(); };
    s.onerror = () => rej(new Error(id));
    d.head.appendChild(s);
  });
}

async function loadLeaflet(): Promise<any> {
  const w = globalThis as any;
  const d = w.document;
  if (!d) throw new Error('웹 전용');
  injectCss(d, 'leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  injectCss(d, 'mcluster-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
  injectCss(d, 'mcluster-css2', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');
  if (!w.L) await injectScript(d, 'leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
  if (w.L && !w.L.markerClusterGroup) {
    try { await injectScript(d, 'mcluster-js', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'); } catch {}
  }
  return w.L;
}

// 네이버 지도 클라이언트 ID (있으면 네이버 지도, 없으면 OSM 폴백)
const NAVER_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID || '';
const USE_NAVER = !!NAVER_ID;

async function loadNaver(): Promise<any> {
  const w = globalThis as any;
  const d = w.document;
  if (!d) throw new Error('웹 전용');
  if (!w.naver?.maps) {
    await injectScript(d, 'naver-maps-js', `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_ID}`);
  }
  // 스크립트는 로드됐지만 naver.maps 초기화가 한 박자 늦을 수 있어 잠깐 대기
  for (let i = 0; i < 40 && !w.naver?.maps; i++) await new Promise((r) => setTimeout(r, 50));
  if (!w.naver?.maps) throw new Error('네이버 지도 로드 실패');
  return w.naver;
}

type Place = { id: string; name: string; category: string | null; address: string | null; main_cat: string | null; lat: number | null; lng: number | null };
type Store = {
  id: string; name: string; category: string | null; categories: string[] | null; address: string | null;
  biz_verified: boolean; photo: string | null; is_ad: boolean; ad_weight: number | null; rating: number | null; review_count: number | null;
  lat: number | null; lng: number | null;
};

// 매장 정보 충실도 (사진·업종·주소가 얼마나 채워졌나) 0~1
function infoScore(s: Store): number {
  let f = 0;
  if (s.photo) f++;
  if (s.categories && s.categories.length) f++;
  if (s.address) f++;
  return f / 3;
}
// 복합 노출점수: 인기(별점·리뷰·정보) + 인증/광고 가산점
//  - 광고/인증은 "가산점"이라 위로 올려주지만, 인기 점수가 낮으면 한계가 있음
function exposureScore(s: Store): number {
  let pop = 0;
  pop += ((s.rating ?? 0) / 5) * 30;                                   // 별점 0~30
  pop += Math.min(Math.log10((s.review_count ?? 0) + 1) * 15, 25);     // 리뷰 0~25
  pop += infoScore(s) * 20;                                            // 정보 충실도 0~20
  let bonus = 0;
  bonus += s.biz_verified ? 18 : 0;                                    // 인증 가산점
  bonus += s.is_ad ? 20 + (s.ad_weight ?? 0) : 0;                      // 광고 가산점(상대평가)
  return pop + bonus;
}

export default function StoresScreen() {
  const scheme = useScheme();
  const c = Colors[scheme];
  const router = useRouter();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  const [main, setMain] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [members, setMembers] = useState<Store[]>([]);
  const [nByStore, setNByStore] = useState<Record<string, number>>({});   // 등록매장 N지수(n3) — 상위노출 가중
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState<'일반' | '위성'>('일반');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [radius, setRadius] = useState<number | null>(null); // km, null=전체
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locDenied, setLocDenied] = useState(false);
  const loc = myLoc ?? CENTER;

  // 첫 진입 시 내 위치 best-effort 확보
  useEffect(() => {
    getMyLocation().then((p) => { if (p) setMyLoc(p); else setLocDenied(true); });
  }, []);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const mq = supabase.from('stores').select('id,name,category,categories,address,biz_verified,photo,is_ad,ad_weight,rating,review_count,lat,lng').not('owner_id', 'is', null).not('is_probe', 'is', true).limit(50);
    let pq = supabase.from('places').select('id,name,category,address,main_cat,lat,lng', { count: 'exact' });
    if (main) pq = pq.eq('main_cat', main);
    if (sub) pq = pq.ilike('category', `%${sub}%`);
    if (search.trim()) pq = pq.ilike('name', `%${search.trim()}%`);
    if (radius) {
      // 반경(km) → 위경도 박스 (일반 장소는 보너스 없이 반경 그대로)
      const dLat = radius / 111;
      const dLng = radius / (111 * Math.cos((loc.lat * Math.PI) / 180));
      pq = pq.gte('lat', loc.lat - dLat).lte('lat', loc.lat + dLat).gte('lng', loc.lng - dLng).lte('lng', loc.lng + dLng);
    }
    pq = pq.order('name').range(from, from + PAGE_SIZE - 1);
    const [{ data: m }, pr] = await Promise.all([mq, pq]);
    const mem = (m as Store[]) ?? [];
    setMembers(mem);
    setPlaces((pr.data as Place[]) ?? []);
    setTotal(pr.count ?? 0);
    // 등록매장 N지수(최신 n3) 로드 — 상위노출 가중치용
    const ids = mem.map((s) => s.id);
    if (ids.length) {
      const { data: na } = await supabase.from('place_analysis')
        .select('store_id,n3,analyzed_at').in('store_id', ids).order('analyzed_at', { ascending: false });
      const nb: Record<string, number> = {};
      for (const r of (na ?? []) as any[]) { if (!(r.store_id in nb) && r.n3 != null) nb[r.store_id] = r.n3; }
      setNByStore(nb);
    }
    setLoading(false);
  }, [main, sub, search, page, radius, myLoc]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mapCtx = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    (async () => {
      try {
        if (USE_NAVER) {
          // ── 네이버 지도 ──
          const naver = await loadNaver();
          if (cancelled) return;
          const d = (globalThis as any).document;
          const host = d.getElementById('wavely-map');
          if (!host || (host as any)._wvMap) return;
          // 네이버 지도는 컨테이너 스타일(absoluteFill)을 덮어써서 높이가 0이 되므로,
          // 100% 채우는 내부 div에 마운트해 RN View의 크기를 보존한다.
          let inner = host.querySelector('#wavely-map-inner') as any;
          if (!inner) { inner = d.createElement('div'); inner.id = 'wavely-map-inner'; inner.style.width = '100%'; inner.style.height = '100%'; host.appendChild(inner); }
          const map = new naver.maps.Map(inner, {
            center: new naver.maps.LatLng(CENTER.lat, CENTER.lng),
            zoom: 14,
            mapTypeControl: false,
            logoControlOptions: { position: naver.maps.Position.RIGHT_BOTTOM },
            zoomControl: true,
            zoomControlOptions: { position: naver.maps.Position.LEFT_BOTTOM },
          });
          (host as any)._wvMap = true;
          const infoWindow = new naver.maps.InfoWindow({ content: '', borderWidth: 0, disableAnchor: true, backgroundColor: 'transparent', pixelOffset: new naver.maps.Point(0, -8) });
          mapCtx.current = { provider: 'naver', naver, map, infoWindow, markers: [] };
          setMapReady(true);
          // 레이아웃 안정 후 크기 재계산 (0px로 잡히는 것 방지)
          setTimeout(() => { try { naver.maps.Event.trigger(map, 'resize'); } catch {} }, 350);
          return;
        }
        // ── OSM(Leaflet) 폴백 ──
        const L = await loadLeaflet();
        if (cancelled) return;
        const el = (globalThis as any).document.getElementById('wavely-map');
        if (!el || el._leaflet_id) return;
        const map = L.map(el, { zoomControl: false, attributionControl: false }).setView([CENTER.lat, CENTER.lng], 14);
        L.control.zoom({ position: 'bottomleft' }).addTo(map);
        const tile = L.tileLayer(OSM, { maxZoom: 19 }).addTo(map);
        const layer = (L.markerClusterGroup
          ? L.markerClusterGroup({ maxClusterRadius: 48, spiderfyOnMaxZoom: true, showCoverageOnHover: false })
          : L.layerGroup()
        ).addTo(map);
        mapCtx.current = { provider: 'leaflet', L, map, layer, tile };
        setMapReady(true);
        setTimeout(() => { try { map.invalidateSize(); } catch {} }, 250);
      } catch (e) {
        console.warn('[map] init failed', e);
      }
    })();
    return () => {
      cancelled = true;
      const ctx = mapCtx.current;
      if (ctx?.provider === 'naver') { try { ctx.map.destroy(); } catch {} const el = (globalThis as any).document?.getElementById('wavely-map'); if (el) (el as any)._wvMap = false; }
      else if (ctx?.map) { try { ctx.map.remove(); } catch {} }
      mapCtx.current = null;
    };
  }, []);

  const switchMap = (t: '일반' | '위성') => {
    setMapType(t);
    const ctx = mapCtx.current;
    if (!ctx) return;
    if (ctx.provider === 'naver') {
      ctx.map.setMapTypeId(t === '위성' ? ctx.naver.maps.MapTypeId.HYBRID : ctx.naver.maps.MapTypeId.NORMAL);
      return;
    }
    ctx.map.removeLayer(ctx.tile);
    ctx.tile = ctx.L.tileLayer(t === '위성' ? SAT : OSM, { maxZoom: 19 }).addTo(ctx.map);
    ctx.tile.bringToBack();
  };

  const focusOn = (p: Place) => {
    const ctx = mapCtx.current;
    if (!ctx || p.lat == null || p.lng == null) return;
    if (ctx.provider === 'naver') {
      const pos = new ctx.naver.maps.LatLng(p.lat, p.lng);
      ctx.map.setCenter(pos); ctx.map.setZoom(17);
      const entry = markersRef.current[p.id];
      if (entry) { ctx.infoWindow.setContent(entry.content); ctx.infoWindow.open(ctx.map, entry.marker); }
      return;
    }
    ctx.map.setView([p.lat, p.lng], 17);
    const m = markersRef.current[p.id];
    if (m && m.openPopup) setTimeout(() => m.openPopup(), 60);
  };

  const pickMain = (k: string | null) => { setMain(k); setSub(null); setPage(1); };
  const chooseSub = (p: string | null) => { setSub(p); setPage(1); };
  const onSearch = (t: string) => { setSearch(t); setPage(1); };
  const toggleVerified = () => { setOnlyVerified((v) => !v); setPage(1); };
  const chooseRadius = (r: number | null) => {
    setRadius(r); setPage(1);
    if (r && !myLoc) getMyLocation().then((p) => { if (p) setMyLoc(p); else setLocDenied(true); });
  };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subList = main ? (SUBS[main] ?? []) : [];
  const canRegister = profile?.role === 'owner';
  // 등록매장 노출점수 = 기존 복합점수 + N지수(SEO) 가중. 분석된(구독) 매장이 상위노출.
  const memberScore = (s: Store) => exposureScore(s) + (nByStore[s.id] ?? 0) * 70;
  const displayMembers = useMemo(() => {
    const sl = main && sub ? SUBS[main]?.find((x) => x.pat === sub)?.label ?? null : null;
    const q = search.trim();
    return members
      .filter((s) => {
        const cats = s.categories && s.categories.length ? s.categories : s.category ? [s.category] : [];
        if (main && !cats.some((cc) => deriveMain(cc) === main)) return false;
        if (sub && !cats.some((cc) => cc.includes(sub) || (sl ? cc.includes(sl) : false))) return false;
        // 키워드 검색 — 등록매장도 이름/업종 매칭으로 노출(네이버 플레이스식)
        if (q && !((s.name ?? '').includes(q) || (s.category ?? '').includes(q) || cats.some((cc) => cc.includes(q)))) return false;
        if (onlyVerified && !s.biz_verified) return false;
        // 반경 필터 — 광고/인증은 보너스 거리까지 노출 (각 +10%, 둘 다면 +20%)
        if (radius) {
          if (s.lat == null || s.lng == null) return false;
          const bonus = (s.is_ad ? 1 : 0) + (s.biz_verified ? 1 : 0); // 0,1,2
          const limit = radius * (1 + 0.1 * bonus);
          if (kmBetween(loc.lat, loc.lng, s.lat, s.lng) > limit) return false;
        }
        return true;
      })
      .sort((a, b) => memberScore(b) - memberScore(a)); // N지수 포함 복합 노출점수 순
  }, [members, nByStore, search, main, sub, onlyVerified, radius, myLoc]);

  // 네이티브(앱) 지도 마커 데이터 — 웹 지도는 별도 useEffect에서 그림
  const nativeMapItems = useMemo<DongMapItem[]>(() => {
    const list: DongMapItem[] = [];
    if (page === 1) displayMembers.forEach((s) => list.push({ id: s.id, storeId: s.id, name: s.name, color: colorOf(deriveMain(s.category)), lat: s.lat, lng: s.lng, verified: s.biz_verified }));
    if (!onlyVerified) places.forEach((p) => list.push({ id: p.id, storeId: null, name: p.name, color: colorOf(p.main_cat), lat: p.lat, lng: p.lng, verified: false }));
    return list.filter((i) => i.lat != null && i.lng != null);
  }, [displayMembers, places, page, onlyVerified]);

  // 지도 마커 = 목록에 보이는 매장만 (회원 + 디렉터리)
  useEffect(() => {
    const ctx = mapCtx.current;
    if (!ctx || !mapReady) return;
    (globalThis as any).__wvNav = (t: string) => router.push(t as any); // 팝업 버튼용 네비게이션
    (globalThis as any).__wvCloseInfo = () => {
      const cx = mapCtx.current;
      if (!cx) return;
      if (cx.provider === 'naver') { try { cx.infoWindow.close(); } catch {} }
      else { try { cx.map.closePopup(); } catch {} }
    };
    const items = [
      ...(page === 1 ? displayMembers.map((s) => ({ id: s.id, storeId: s.id as string | null, name: s.name, main: deriveMain(s.category), cat: (s.categories && s.categories.length ? s.categories.join(' · ') : s.category) ?? '', lat: s.lat, lng: s.lng, verified: s.biz_verified, rating: s.rating ?? 0 })) : []),
      ...(onlyVerified ? [] : places.map((p) => ({ id: p.id, storeId: null as string | null, name: p.name, main: p.main_cat, cat: prettyCat(p.category), lat: p.lat, lng: p.lng, verified: false, rating: 0 }))),
    ];
    const popupHtml = (p: typeof items[number]) => {
      const target = p.storeId ? `/store/${p.storeId}` : `/place/${p.id}`;
      const badge = p.storeId && p.verified ? `<span style="color:#11B981;font-weight:800;font-size:10px;margin-left:3px">✓인증</span>` : '';
      const rating = p.storeId ? `<span style="font-size:11px;color:#666">${p.rating > 0 ? `⭐ ${p.rating.toFixed(1)}` : '⭐ 신규'}</span>` : '';
      return `<div style="position:relative;width:166px;background:#fff;border-radius:11px;padding:8px 9px 9px;box-shadow:0 2px 10px rgba(0,0,0,.2)">` +
        `<button onclick="window.__wvCloseInfo()" style="position:absolute;top:4px;right:4px;width:19px;height:19px;border:none;background:#eef0f3;border-radius:50%;color:#777;font-size:11px;line-height:19px;text-align:center;padding:0;cursor:pointer">✕</button>` +
        `<div style="font-weight:800;font-size:13px;color:#111;padding-right:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}${badge}</div>` +
        `<div style="color:#999;font-size:11px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.cat}</div>` +
        (rating ? `<div style="margin-top:3px">${rating}</div>` : '') +
        `<button onclick="window.__wvNav('${target}')" style="margin-top:7px;width:100%;background:${c.primary};color:#fff;border:none;border-radius:8px;padding:6px 0;font-weight:800;font-size:12px;cursor:pointer">상세보기 ›</button></div>`;
    };
    const pinHtml = (p: typeof items[number]) =>
      `<div style="width:30px;height:30px;background:${colorOf(p.main)};border:3px solid #fff;border-radius:50%;box-shadow:0 1px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer">${emojiOf(p.main)}</div>`;

    if (ctx.provider === 'naver') {
      const { naver, map, infoWindow } = ctx;
      (ctx.markers || []).forEach((m: any) => m.setMap(null));
      ctx.markers = [];
      markersRef.current = {};
      const bounds = new naver.maps.LatLngBounds();
      let n = 0;
      items.forEach((p) => {
        if (p.lat == null || p.lng == null) return;
        const pos = new naver.maps.LatLng(p.lat, p.lng);
        const marker = new naver.maps.Marker({ position: pos, map, icon: { content: pinHtml(p), anchor: new naver.maps.Point(15, 15) } });
        const content = popupHtml(p);
        naver.maps.Event.addListener(marker, 'click', () => { map.setCenter(pos); infoWindow.setContent(content); infoWindow.open(map, marker); });
        markersRef.current[p.id] = { marker, content };
        ctx.markers.push(marker);
        bounds.extend(pos); n++;
      });
      if (n > 0) { try { map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 }); } catch {} }
      return;
    }

    // ── Leaflet 폴백 ──
    const { L, map, layer } = ctx;
    try { map.invalidateSize(); } catch {}
    layer.clearLayers();
    markersRef.current = {};
    const pts: any[] = [];
    items.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const icon = L.divIcon({ html: pinHtml(p), className: '', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
      const marker = L.marker([p.lat, p.lng], { icon }).addTo(layer);
      marker.on('click', () => { map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15)); setTimeout(() => marker.openPopup(), 90); });
      marker.bindPopup(popupHtml(p), { autoPan: false, autoClose: false, closeOnClick: false, closeButton: false });
      markersRef.current[p.id] = marker;
      pts.push([p.lat, p.lng]);
    });
    if (pts.length > 0) { try { map.fitBounds(pts, { padding: [50, 50], maxZoom: 16 }); } catch {} }
  }, [displayMembers, places, page, onlyVerified, mapReady, router]);

  // ───────── 왼쪽: 검색 + 카드 목록 ─────────
  const LeftPanel = (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchBox, { backgroundColor: c.card, borderColor: c.primary }]}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput style={[styles.searchInput, { color: c.text }]} placeholder="춘천 가게·장소 검색" placeholderTextColor={c.textSecondary} value={search} onChangeText={onSearch} returnKeyType="search" />
        {search ? <Pressable onPress={() => onSearch('')} hitSlop={8}><Text style={{ color: c.textSecondary }}>✕</Text></Pressable> : null}
      </View>

      {/* 인증 토글 + 반경 필터 한 줄 (칩 스타일 통일) */}
      <View style={styles.filterBar}>
        <Pressable onPress={toggleVerified} style={[styles.filterChip, { backgroundColor: onlyVerified ? c.verify : c.background, borderColor: onlyVerified ? c.verify : c.border }]}>
          <Text style={[styles.filterTxt, { color: onlyVerified ? '#fff' : c.textSecondary }]}>{onlyVerified ? '✓ ' : ''}인증매장</Text>
        </Pressable>
        <View style={[styles.filterDivider, { backgroundColor: c.border }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingRight: 12 }} style={{ flex: 1 }}>
          <Pressable onPress={() => chooseRadius(null)} style={[styles.filterChip, { backgroundColor: !radius ? c.primary : c.background, borderColor: !radius ? c.primary : c.border }]}>
            <Text style={[styles.filterTxt, { color: !radius ? c.onPrimary : c.textSecondary }]}>전체</Text>
          </Pressable>
          {RADIUS_OPTS.map((r) => (
            <Pressable key={r} onPress={() => chooseRadius(r)} style={[styles.filterChip, { backgroundColor: radius === r ? c.primary : c.background, borderColor: radius === r ? c.primary : c.border }]}>
              <Text style={[styles.filterTxt, { color: radius === r ? c.onPrimary : c.textSecondary }]}>{r}km</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {radius ? (
        <Text style={[styles.locHint, { color: c.textSecondary }]}>
          {myLoc ? `📍 내 위치 기준 ${radius}km` : locDenied ? `⚠️ 위치 권한이 없어 춘천 시내 기준 ${radius}km` : '내 위치 확인 중…'} · 광고·인증 매장은 조금 더 멀리까지 노출돼요
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.centerBox}><ActivityIndicator color={c.primary} /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 12 }}>
          {/* 노출 배너 광고 (스트립) */}
          {page === 1 && <View style={{ marginHorizontal: -12 }}><StripBanner scheme={scheme} mainCat={main} /></View>}

          <Text style={[styles.sect, { color: c.text }]}>
            {onlyVerified ? `인증매장 ${displayMembers.length}곳` : `검색 결과 ${total.toLocaleString()}곳 · ${page}/${totalPages}페이지`}
          </Text>

          {/* 1페이지 상단: 노출점수 높은 매장(광고·인증·인기) 우선 */}
          {page === 1 && displayMembers.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/store/${s.id}`)} style={[styles.card, { backgroundColor: c.card, borderColor: s.is_ad ? c.primary : c.border }]}>
              <Image source={{ uri: s.photo ?? imgFor(s.category, deriveMain(s.category)) }} style={styles.cardImg} contentFit="cover" transition={150} />
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>{s.name}</Text>
                  {s.is_ad && <View style={[styles.badge, { backgroundColor: c.primary }]}><Text style={styles.badgeTxt}>광고</Text></View>}
                  {s.biz_verified && <View style={[styles.badge, { backgroundColor: c.verify }]}><Text style={styles.badgeTxt}>✓ 인증</Text></View>}
                  {nByStore[s.id] != null && <View style={[styles.badge, { backgroundColor: c.primaryDeep ?? c.primary }]}><Text style={styles.badgeTxt}>N {nByStore[s.id].toFixed(2)}</Text></View>}
                </View>
                <View style={styles.ratingRow}>
                  <Text style={styles.star}>⭐</Text>
                  <Text style={[styles.reviewTxt, { color: c.textSecondary }]}>
                    {(s.rating ?? 0) > 0 ? `${(s.rating ?? 0).toFixed(1)} · 리뷰 ${s.review_count ?? 0}` : `신규 · 리뷰 ${s.review_count ?? 0}`}
                  </Text>
                  <Text style={{ color: c.border }}>·</Text>
                  <Text style={[styles.cardCat, { color: c.textSecondary }]} numberOfLines={1}>{(s.categories && s.categories.length ? s.categories.join(' · ') : s.category) ?? ''}</Text>
                </View>
                {s.address ? <Text style={[styles.cardAddr, { color: c.textSecondary }]} numberOfLines={1}>📍 {trimAddr(s.address)}</Text> : null}
              </View>
            </Pressable>
          ))}
          {onlyVerified && displayMembers.length === 0 ? <Text style={[styles.empty, { color: c.textSecondary }]}>인증 매장이 없어요</Text> : null}

          {!onlyVerified && (
            <>
          {places.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSecondary }]}>결과가 없어요</Text>
          ) : (
            places.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/place/${p.id}`)} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Image source={{ uri: imgFor(p.category, p.main_cat) }} style={styles.cardImg} contentFit="cover" transition={120} />
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <View style={[styles.dot, { backgroundColor: colorOf(p.main_cat) }]} />
                    <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>{p.name}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Text style={styles.star}>⭐</Text>
                    <Text style={[styles.reviewTxt, { color: c.textSecondary }]}>리뷰 0</Text>
                    <Text style={{ color: c.border }}>·</Text>
                    <Text style={[styles.cardCat, { color: c.textSecondary }]} numberOfLines={1}>{prettyCat(p.category)}</Text>
                  </View>
                  {p.address ? <Text style={[styles.cardAddr, { color: c.textSecondary }]} numberOfLines={1}>📍 {trimAddr(p.address)}</Text> : null}
                </View>
              </Pressable>
            ))
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <View style={styles.pager}>
              <Pressable disabled={page <= 1} onPress={() => setPage((v) => Math.max(1, v - 1))} style={[styles.pageArrow, { backgroundColor: c.backgroundElement, opacity: page <= 1 ? 0.4 : 1 }]}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '800' }}>‹</Text>
              </Pressable>
              {pageWindow(page, totalPages).map((n) => (
                <Pressable key={n} onPress={() => setPage(n)} style={[styles.pageNum, { backgroundColor: n === page ? c.primary : c.backgroundElement }]}>
                  <Text style={{ color: n === page ? c.onPrimary : c.textSecondary, fontSize: 13, fontWeight: n === page ? '800' : '700' }}>{n}</Text>
                </Pressable>
              ))}
              <Pressable disabled={page >= totalPages} onPress={() => setPage((v) => Math.min(totalPages, v + 1))} style={[styles.pageArrow, { backgroundColor: c.backgroundElement, opacity: page >= totalPages ? 0.4 : 1 }]}>
                <Text style={{ color: c.text, fontSize: 15, fontWeight: '800' }}>›</Text>
              </Pressable>
            </View>
          )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );

  // ───────── 오른쪽: 지도 + 떠있는 칩/토글 ─────────
  const MapPanel = (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'web' ? (
        <View nativeID="wavely-map" style={[StyleSheet.absoluteFill as any, { backgroundColor: c.backgroundElement }]} />
      ) : (
        <NativeDongMap items={nativeMapItems} center={loc} onPressItem={(it) => router.push((it.storeId ? `/store/${it.storeId}` : `/place/${it.id}`) as any)} />
      )}

      {/* 일반/위성 토글 */}
      {Platform.OS === 'web' && (
        <View style={[styles.mapType, { backgroundColor: c.card }]}>
          {(['일반', '위성'] as const).map((t) => (
            <Pressable key={t} onPress={() => switchMap(t)} style={[styles.mapTypeBtn, { backgroundColor: mapType === t ? c.primary : 'transparent' }]}>
              <Text style={[styles.mapTypeTxt, { color: mapType === t ? c.onPrimary : c.textSecondary }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  // ───────── 상단 카테고리 바 (메인 + 서브) ─────────
  const CategoryBar = (
    <View style={[styles.catBar, { backgroundColor: c.card, borderColor: c.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChips}>
        {MAINS.map((b) => {
          const on = main === b.key;
          return (
            <Pressable key={b.label} onPress={() => pickMain(b.key)} style={[styles.catChip, { backgroundColor: on ? c.primary : c.background, borderColor: on ? c.primary : c.border }]}>
              <Text style={[styles.catChipTxt, { color: on ? c.onPrimary : c.text }]}>{b.emoji} {b.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {subList.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.catChips, { paddingTop: 0 }]}>
          <Pressable onPress={() => chooseSub(null)} style={[styles.subChip, { backgroundColor: !sub ? c.primarySoft : c.background, borderColor: !sub ? c.primary : c.border }]}>
            <Text style={[styles.subChipTxt, { color: !sub ? c.primaryDeep : c.textSecondary }]}>전체</Text>
          </Pressable>
          {subList.map((s) => {
            const on = sub === s.pat;
            return (
              <Pressable key={s.label} onPress={() => chooseSub(s.pat)} style={[styles.subChip, { backgroundColor: on ? c.primarySoft : c.background, borderColor: on ? c.primary : c.border }]}>
                <Text style={[styles.subChipTxt, { color: on ? c.primaryDeep : c.textSecondary }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.loc, { color: c.text }]}>강원 춘천시 <Text style={{ color: c.textSecondary, fontSize: 13 }}>▾</Text></Text>
      </View>
      {CategoryBar}
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={[styles.leftCol, { borderColor: c.border }]}>{LeftPanel}</View>
          <View style={{ flex: 1 }}>{MapPanel}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ height: 240, borderBottomWidth: 1, borderColor: c.border }}>{MapPanel}</View>
          <View style={{ flex: 1 }}>{LeftPanel}</View>
        </View>
      )}

      {canRegister && (
        <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => router.push('/store-new')}>
          <Text style={styles.fabTxt}>＋ 매장 등록</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, borderBottomWidth: 1 },
  loc: { fontSize: 18, fontWeight: '800' },
  leftCol: { width: 380, borderRightWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 15 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkTxt: { fontSize: 13, fontWeight: '700' },
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingBottom: 8 },
  filterDivider: { width: 1, height: 16, marginHorizontal: 1 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterTxt: { fontSize: 12, fontWeight: '700' },
  locHint: { fontSize: 11, paddingHorizontal: 14, paddingBottom: 8, lineHeight: 15 },
  catBar: { borderBottomWidth: 1, paddingVertical: 7, gap: 6 },
  catChips: { gap: 6, paddingHorizontal: 12, alignItems: 'center' },
  catChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  catChipTxt: { fontSize: 13, fontWeight: '700' },
  subChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  subChipTxt: { fontSize: 12, fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sect: { paddingTop: 14, paddingBottom: 8, fontSize: 14, fontWeight: '800' },
  bannerAd: { width: 280, height: 130, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  bannerAdImg: { width: '100%', height: '100%' },
  bannerAdOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.45)' },
  bannerAdTag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginBottom: 4 },
  bannerAdTagTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bannerAdHeadline: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bannerAdName: { color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.9, marginTop: 1 },
  empty: { fontSize: 13, paddingVertical: 16 },
  adCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  adImg: { width: 54, height: 54, borderRadius: 10 },
  adBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, marginBottom: 3 },
  adBadgeTxt: { fontSize: 10, fontWeight: '800' },
  adTitle: { fontSize: 14, fontWeight: '800' },
  adDesc: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: Radius.card, borderWidth: 1, marginBottom: 12, overflow: 'hidden', boxShadow: Shadow.card },
  cardImg: { width: '100%', height: 130 },
  cardBody: { padding: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cardName: { fontSize: 15, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  star: { fontSize: 12 },
  reviewTxt: { fontSize: 12.5, fontWeight: '700' },
  cardCat: { fontSize: 12.5, flexShrink: 1 },
  cardAddr: { fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeTxt: { fontSize: 10, fontWeight: '800', color: '#fff' },
  memberBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  memberTxt: { fontSize: 10, fontWeight: '800' },
  mapType: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', borderRadius: 10, padding: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' },
  mapTypeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  mapTypeTxt: { fontSize: 12, fontWeight: '800' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 20 },
  pageArrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pageNum: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 18, bottom: 92, paddingHorizontal: 18, paddingVertical: 14, borderRadius: Radius.pill, boxShadow: Shadow.fab, elevation: 5 },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
