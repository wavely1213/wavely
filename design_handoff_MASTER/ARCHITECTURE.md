# 와벨리 아키텍처 — 4개 surface 연결 구조

## 한눈에
```
        ┌─────────────────── 같은 Supabase 프로젝트 (실시간 공유) ───────────────────┐
        │                                                                          │
  ┌─────┴─────┐        ┌──────────────┐        ┌────────────────┐                  │
  │  ① 앱      │        │ ② 소비자 웹   │        │ ③ 관리자 웹     │   ← 모두 같은 DB │
  │ (Expo RN) │        │ (Expo Web /  │        │ (사장님·광고주) │      읽기/쓰기    │
  │           │        │  react-native│        │                │                  │
  └───────────┘        │  -web, 반응형)│        └────────────────┘                  │
        │              └──────────────┘                                            │
        └──────────────────────────────────────────────────────────────────────────┘

  ┌────────────────────────┐
  │ ④ 마케팅 홍보 사이트     │   ← 백엔드 없음(또는 입점/대기 폼만). 별도 배포. 정적.
  │ (정적 랜딩)             │
  └────────────────────────┘
```

## ①②③ 은 하나의 제품 = 하나의 Supabase 백엔드
- **앱·소비자 웹·관리자 웹은 동일한 Supabase 프로젝트**(같은 `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY`)에 붙는 **세 개의 클라이언트**일 뿐이다. 서로 다른 DB를 만들지 말 것.
- 소비자 웹은 사실상 **기존 Expo 앱의 web 빌드**(`react-native-web`, 이미 `vercel.json`·explore.tsx `wide` 반응형 존재)거나, 같은 Supabase를 쓰는 별도 웹. 데이터/인증/스토리지 공유.
- 관리자 웹은 같은 DB의 `stores`/`place_analysis`/광고 테이블을 **읽고**, 캠페인·정산을 **쓴다**.
- **실시간 연결**: Supabase Realtime 구독으로 한쪽 변경이 다른 쪽에 반영.
  - 예: 관리자 웹에서 광고 `is_ad=true`/`ad_weight` 변경 → 소비자 웹·앱의 `우리동네` 노출 순위 즉시 반영.
  - 예: 앱에서 글 작성 → 소비자 웹 피드 실시간 갱신. 채팅은 `messages` 구독.
  ```ts
  supabase.channel('posts').on('postgres_changes',
    { event: '*', schema: 'public', table: 'posts' }, reload).subscribe();
  ```

## 공유 데이터 모델 (이미 repo에 존재 — 새로 만들지 말 것)
| 테이블/RPC | 쓰는 surface | 용도 |
|---|---|---|
| `posts` (board, dong, anonymous, place_name, image_url, comments) | 앱·웹 | 커뮤니티 글 |
| `stores` (is_ad, ad_weight, biz_verified, rating, review_count, categories, owner_id) | 앱·웹(읽기) · 관리자(쓰기) | 등록 매장·광고·인증 |
| `places` | 앱·웹 | 디렉터리 장소 |
| `place_analysis` (store_id, n3, w_index, analyzed_at) | 관리자(N·W지수 분석) · 웹(노출 가중) | **N지수**(네이버 플레이스 외부 지수) + **W지수**(와벨리 자체 판단지수) |
| `profiles` (role, nickname, avatar_url) | 전부 | 손님/알바/직장인/사장님 역할 |
| RPC `dong_list`, `nearest_dong` | 앱·웹 | 춘천 동 목록·위치 매칭 |
| RPC `unread_chat_count`, `unread_notif_count` | 앱·웹 | 뱃지 |
| (신규) `ad_campaigns`, `ad_billing` | 관리자 | 광고 집행·정산 (배너/인피드/플레이스 3종) |

- 노출 점수(`exposureScore`)·N지수 가중(`n3 * 70`) 공식은 `src/app/(tabs)/explore.tsx`에 이미 있음 → 관리자 웹은 **그 값을 그대로 시각화**(읽기 전용), 새 공식 만들지 말 것.
- **지수 2종**: **N지수**=네이버 플레이스 외부 지수(기존 `n3` 계열, 1–3 척도). **W지수**=와벨리 자체 지수(0–100): 단골(팔로워)·매장소식 활동성·커뮤니티 반응·문의 응답률·동네 추천 등 와벨리 네이티브 신호 가중. 관리자·랜딩은 둘을 토글/병행으로 표기.

## ④ 마케팅은 별개
- 백엔드 의존 없음. 앱스토어 링크 + 입점/대기 폼(원하면 별도 테이블/이메일)만.
- 별도 도메인/배포(예: `wavely.kr`), ①②③ 인증과 분리.
- ①②③ 으로 가는 링크(앱 다운로드, `사장님 센터`)만 연결.
