# 와벨리 — Supabase 연결 가이드 (전 페이지)

> **목적:** 동봉 프로토타입(SSOT)의 **목업 상수 → Supabase 쿼리** 교체 지점을 면·페이지별로 1:1 명시.
> **원칙:** 마크업·스타일·레이아웃 **재생성 금지**. "데이터만 연결". 앱·소비자웹·관리자웹은 **하나의 Supabase**. 랜딩은 백엔드 없음(입점 폼만).
> 짝 문서: `schema.sql`(서버 스키마) · `ARCHITECTURE.md`(연결 구조) · `NAVER_MAPS.md`(지도) · `wavely.tokens.ts`(디자인 토큰).

---

## 0. Claude Code 지시 프롬프트 (그대로 복붙)
```
이 폴더의 디자인을 '단일 진실 소스(SSOT)'로 삼아라.
- 마크업/스타일/레이아웃/컴포넌트 재생성·재배치 금지.
- 각 화면의 목업 상수(POSTS, STORES, KPIS, NSCORE …)를
  SUPABASE_INTEGRATION.md의 매핑표대로 Supabase 쿼리로만 교체하라.
- DB는 schema.sql 기준. 없는 테이블만 생성, 있으면 건드리지 마라.
- 새 화면/새 디자인 만들지 마라. 바뀐 게 있으면 '프로토타입과 다른 점'만 보고하라.
```

## 1. 셋업
- 패키지: `@supabase/supabase-js` (웹·RN 공통).
- env: `*_SUPABASE_URL`, `*_SUPABASE_ANON_KEY` (Expo=`EXPO_PUBLIC_`, Vite=`VITE_`, Next=`NEXT_PUBLIC_`).
- 클라이언트 (`lib/supabase.ts`):
```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(URL, ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```
- 공통 데이터 훅 — 프로토타입의 `loading` 스켈레톤/빈화면 자리에 그대로 연결:
```ts
export function useQuery(run, deps = []) {
  const [data, setData] = useState(null), [loading, setLoading] = useState(true);
  useEffect(() => { let on = true; setLoading(true);
    run().then(({ data }) => { if (on) { setData(data); setLoading(false); } });
    return () => { on = false; }; }, deps);
  return { data, loading }; // loading → <Skeleton/>, data?.length===0 → <Empty/>
}
```

## 2. 스키마
`schema.sql`을 Supabase SQL Editor에 실행(이미 서버에 있으면 **diff만**). 핵심:
`profiles · posts · comments · stores · places · store_news · place_analysis(n3, w_index, breakdown) · ad_campaigns · ad_billing · chats · chat_members · messages · follows · scraps · post_likes · leads`
RPC: `nearest_dong · dong_list · hot_posts · place_keyword_rank · ad_kpis · unread_counts`.

## 3. 인증 (로그인/가입/온보딩)
- 화면: 웹 `LoginModal`, 앱 `Onboarding`.
- 이메일: `supabase.auth.signUp / signInWithPassword`.
- 소셜: `supabase.auth.signInWithOAuth({ provider: 'kakao' })`. 네이버는 OIDC 커스텀 프로바이더 또는 Edge Function.
- 역할 칩(손님/알바/직장인/사장님) → 가입 직후 `profiles.upsert({ id: uid, role, nickname, dong })`.
- 세션 = 프로토타입 `ME` 대체: `supabase.auth.getUser()` + `onAuthStateChange`.

## 4. 면·페이지별 연결 맵 ★

### ① 소비자 웹  (`web/wavely-web-*.jsx`)
| 화면 · 컴포넌트 | 목업 상수 | Supabase 쿼리 |
|---|---|---|
| `CommunityFeed` 피드 | `POSTS` | `supabase.from('posts').select('*, author:profiles(nickname,role,avatar_url)').order('created_at',{ascending:false})` · 보드필터 `.eq('board', board)` |
| 인피드 광고 | `FEED_ADS` | `ad_campaigns` (product='infeed', status='active') ⋈ `stores` |
| `RailHot` 지금뜨는글 | (hot) | `supabase.rpc('hot_posts',{ hours:24, lim:5 })` |
| `RailNews` 새소식 | `STORE_NEWS` | `from('store_news').select('*, store:stores(name)').order('created_at',{ascending:false}).limit(3)` |
| `RailAd`/배너 | `AD`,`BANNER` | `ad_campaigns` (product in 'place','banner') |
| `Neighborhood` 목록+지도 | `STORES`,`MAP_PLACES`,`CATS` | `from('stores').select('*').order('ad_weight',{ascending:false})` · 카테고리 `.eq('main',cat)` · 인증 `.eq('biz_verified',true)` · 반경=§7 · 좌표 `lat,lng` |
| `StoreDetail` | store | `from('stores').select('*, reviews(*)').eq('id',id).single()` |
| `PostDetail` | post+`COMMENTS` | post by id + `from('comments').select('*, author:profiles(*), replies:comments(*)').eq('post_id',id)` |
| `WriteModal` (쓰기) | — | `from('posts').insert({ board, title, body, anonymous, place_name, author_id: uid })` |
| `MyPage` | `ME`+내글/댓글/스크랩 | auth user + `posts.eq('author_id',uid)` / `comments` / `scraps.select('post:posts(*)')` |

### ② 앱  (`app/wabely-*.jsx`) — 위와 **같은 테이블**, RN 컴포넌트로
| 화면 | 목업 상수 | Supabase |
|---|---|---|
| `HomeScreen` | `POSTS`,`CHANNELS`,`STORE_NEWS`,`PLACE_AD` | posts(최신) · 채널=정적/`board` 그룹 · store_news · ad_campaigns(place) |
| `ExploreScreen` | `KEYWORDS`,`RESTAURANTS`,`CHANNELS` | `rpc('trending_keywords')` · `stores.order('rating',{ascending:false})` |
| `PostDetail`/`WriteScreen` | `COMMENTS` / insert | 소비자 웹과 동일 |
| `ChatScreen`/`ChatRoom` | `CHATS`,`ROOM_MSGS` | `chats`(member=uid) + `messages`(chat_id) **+ realtime(§6)** |
| `AppMap` (우리동네 지도) | `MAP_STORES`,`MAP_MY` | `stores` + `navigator.geolocation` (RN=expo-location) |
| `ProfileScreen` | `ME` | auth + profiles + 통계 집계 |
| `Onboarding` | role | §3 |

### ③ 관리자 웹  (`admin/wavely-admin-*.jsx`) — 항상 `store_id = 현재 사장님 매장`
| 화면 | 목업 상수 | Supabase |
|---|---|---|
| `Dashboard` KPI 6 | `KPIS` | `rpc('ad_kpis',{ store_id, days:30 })` (노출·클릭·CTR·문의·지출·N지수) |
| 추이/도넛 | `TREND`,`SPEND` | `ad_stats` group by day / product |
| 진행중 광고표 | `CAMPAIGNS` | `from('ad_campaigns').eq('store_id',sid).eq('status','active')` |
| 지수 요약·`PlaceAnalysis` | `NSCORE`,`WSCORE`,`NBREAKDOWN`,`WBREAKDOWN`,`KEYWORDS`,`RANK_TREND`,`W_TREND`,`WSIGNALS` | `from('place_analysis').eq('store_id',sid).single()` → `n3`(N지수)·`w_index`(W지수)·`breakdown`(jsonb) · 키워드 `rpc('place_keyword_rank',{store_id})` · **W신호=커뮤니티/매장소식/응답률 집계 뷰** |
| `AdCenter`/`AdBuilder` | `PRODUCTS`(정적), insert | `from('ad_campaigns').insert({ store_id, product, budget, keywords, status:'review' })` (검수=review→active) |
| `Settlement` | `SETTLE` | `from('ad_billing').eq('store_id',sid)` (balance + invoices) |
| `WorkspaceSwitch` (대행사) | `WORKSPACES` | `from('stores').eq('owner_id',uid)` (대행=`agency_stores` 권한) |

### ④ 마케팅 랜딩  (`와벨리 소개.html`) — 백엔드 없음
- 정적 배포. 입점/대기 신청만: `from('leads').insert({ email, store_name, phone })` 또는 폼서비스/이메일.

## 5. 쓰기(mutations) 요약
글쓰기·댓글·스크랩/좋아요(`scraps`/`post_likes`)·매장 등록/수정(`stores`)·광고 집행(`ad_campaigns`)·충전(`ad_billing`)·프로필(`profiles`). 모두 RLS = 본인 소유 row만.

## 6. 실시간 구독
```ts
supabase.channel('feed')
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'}, reload)
  .subscribe();
```
- `posts`(피드 갱신) · `messages`(채팅) · `stores`(광고 `is_ad/ad_weight` 변경 → 우리동네 노출순위 즉시 반영).

## 7. 지도 좌표
- `stores.lat / stores.lng` 사용. 없으면 주소→네이버 geocode 1회 후 컬럼 캐시.
- 반경 필터: PostGIS `ST_DWithin(geog, my_point, meters)` **또는** 클라이언트 거리계산(현재 프로토타입 방식).
- 마커/클러스터/미리보기/길찾기 UI = 프로토타입 그대로(`NAVER_MAPS.md`).

## 8. 프로토타입 → 프로덕션 빌드 이전 체크리스트
1. CDN React/Babel `<script>` 제거 → **Vite(웹) / Expo(앱)** 프로젝트로 JSX 이동.
2. 전역 `window.X` 공유 → 정식 `import`.
3. 인라인 `<style>` 토큰은 유지(= `wavely.tokens`). 다크모드 `data-theme="dark"` 토글 로직 그대로.
4. 목업 데이터 파일(`wabely-data.jsx`, `wavely-web-data.jsx`, `wavely-admin-data.jsx`)을 **삭제하지 말고** 각 상수를 §4 쿼리로 대체 → import 경로만 교체.
5. 스켈레톤/빈화면 컴포넌트는 그대로 `loading`/`length===0`에 연결(이미 자리 있음).

> 핵심: **화면은 이미 완성**돼 있다. Supabase는 "데이터를 흘려보내는 배선"만 하면 된다 — 새로 만드는 게 아니라 이 위에 얹는 것.
