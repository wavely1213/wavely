# ARCHITECTURE.md — 아키텍처

> **목적**: 코드가 어떻게 조직되어 있고, 무엇이 무엇에 의존해도 되는지 정의한다.
> 구조 변경·새 모듈 추가·데이터 흐름 관련 작업 전에 반드시 읽는다.
> **갱신 시점**: 레이어/모듈/데이터 흐름이 바뀔 때. 코드와 문서가 다르면 문서를 고친다.

---

## 1. 아키텍처 개요

Next.js 16 App Router (Cache Components). 하나의 앱에 두 영역:
- **공개 사이트** `app/(site)/*` — 서버 컴포넌트가 `lib/repo.ts` 로 데이터를 받는다. repo 는 `'use cache'` + 태그로 캐시하고, 데이터 소스는 Supabase 설정 유무로 고른다 (DB ↔ `src/data` 정적 데이터).
- **관리자** `app/admin/*` — 세션 쿠키로 로그인, 서버 액션으로 Supabase 에 쓰고 `updateTag()` 로 공개 캐시를 즉시 갱신.

```
공개   app/(site)/* ─→ components/* (표시)
          │
          └→ lib/repo.ts ('use cache' + cacheTag)
                 ├→ lib/data/db-source.ts ─→ Supabase (anon, RLS: 공개 행만)
                 └→ lib/data/static-source.ts ─→ src/data/* (미설정 시)

관리자 app/admin/(panel)/<섹션>/page.tsx ─→ requireAdminPage() ─→ Supabase (세션, RLS: 관리자)
       app/admin/(panel)/<섹션>/actions.ts ─→ requireAdminAction() → FormReader 검증
                                            → resolveImage(Storage) → insert/update/delete
                                            → updateTag(TAGS.x) → redirect
proxy.ts (/admin/*) ─→ 세션 쿠키 갱신만 (권한 판단 X)
```

## 2. 레이어와 책임

| 레이어 | 위치 | 책임 | 하면 안 되는 것 |
|---|---|---|---|
| 공개 Route | /src/app/(site) | 페이지 조립, 메타데이터, 파라미터 검증 | `src/data`·Supabase 직접 호출 (repo 만) |
| 관리자 Route | /src/app/admin | 목록·폼 화면, 서버 액션 | 권한 검사 생략, `'use cache'` 사용 |
| Component | /src/components | 표시·상호작용 | 데이터 조회 (props 로만 받음) |
| 공개 데이터 접근 | /src/lib/repo.ts, /src/lib/data | 조회·정렬·필터·캐시, DB 행 변환(rows.ts) | 쿠키·세션 읽기 |
| 관리자 DAL | /src/lib/admin | 권한(auth.ts)·검증(form.ts)·이미지(storage.ts) | UI |
| Supabase 클라이언트 | /src/lib/supabase | config / public(anon) / server(세션) | 다른 곳에서 createClient 직접 생성 |
| Data | /src/data | 정적 모드 값, 라벨 상수 | 로직 |
| DB | /supabase | 마이그레이션(스키마·RLS·버킷), seed, 권한 테스트 | — |

## 3. 의존 방향 규칙

- 의존은 항상 **바깥 → 안** 한 방향: app → components / lib → data. 라벨 상수(`*_LABEL`)는 components·admin 에서 data 를 직접 import 허용.
- 하위 레이어는 상위 레이어를 import 하지 않는다.
- 순환 의존이 생기면 구현을 멈추고 구조를 먼저 보고한다.
- 레이어를 건너뛰는 접근(예: UI에서 DB 직접 호출)은 금지. 예외가 필요하면 `DECISION_LOG.md`에 기록 후 진행.

## 4. 주요 모듈

| 모듈 | 위치 | 역할 |
|---|---|---|
| 사이트 설정·메뉴 | /src/config/site.ts | 엠블럼 경로·NAV·공식 주소 (고정값). 구단 이름·창단일 등은 '홈페이지 내용'의 기본값 출처(SITE) — 화면은 getSiteContent() 를 쓴다. 연락처·SNS·주소는 DB(club_settings) |
| 홈페이지 내용(총괄 관리자) | /src/lib/content/(fields·lists·sections·values·views·markup).ts, app/admin/(panel)/content, getSiteContent()·getContentList() | 화면 곳곳 문구·사진(site_content, 바꾼 값만 저장)·목록(content_items) — 키·기본값·검사는 코드 목록이 정한다 (D-046). 푸터 정보 줄은 '**이름표** 값' + {값 이름} 글(markup.ts, 편집기 MarkupEditor, D-048). 탭: 공통·메인·구단소개·엠블럼/유니폼(D-049) — 목록 칸 형식 lines(한 줄에 하나)·hex(색 코드) |
| 관리자 대시보드 알림 | /src/lib/admin/alerts.ts, app/admin/(panel)/page.tsx, /src/config/admin-pages.ts | 구단뉴스 영입/이적 제목 ↔ 선수·스태프 명단, 등번호 겹침, '준비 중' 빈 곳 — 순수 함수 (D-048) |
| 관리자 메뉴 | /src/config/admin-nav.ts | 관리자 사이드바 묶음·순서(ADMIN_NAV_GROUPS), 휴대폰 메뉴 버튼은 AdminNav.tsx 의 AdminMenu (D-048) |
| 지도 설정 | /src/config/map.ts | 홈구장 네이버 장소(번호·좌표), 네이버 지도 키(NEXT_PUBLIC_NAVER_MAP_KEY_ID) — D-026 |
| 검색 등록 | /src/lib/seo.ts, /src/app/robots.ts, /src/app/sitemap.ts | 사이트맵 목록·구단 JSON-LD(순수 함수) — D-027. 소유 확인 값은 config/site.ts SEARCH_VERIFICATION |
| 페이지 안 탭·엠블럼 | /src/components/ui/ContentTabs.tsx, app/(site)/club/emblem (EmblemPanel·UniformPanel), /src/lib/emphasis.ts·color.ts, /public/brand/downloads | 한 페이지 안 탭(#id 로 열기), 엠블럼 모눈 패널·팀 색상·파일 내려받기, `**굵게**` 표시 (D-045). 설명·색·유니폼은 홈페이지 내용 값/목록(D-049) |
| 상단 띠·사이트맵 | /src/components/layout/TopBar.tsx, /src/components/ui/SnsIcon.tsx, app/(site)/sitemap | 헤더 위 SNS·사이트맵 띠(PC), 모바일 메뉴 안 같은 링크, 전체 메뉴 페이지 (D-042) |
| 링크 미리보기 | /src/lib/og.ts(순수), /src/lib/og-metadata.ts(관리자 설정 읽기), layout·홈·구단소식 상세·선수 상세 generateMetadata | 관리자가 정한 이미지·제목·설명(club_settings) 또는 기본 public/og/site.jpg·admin.jpg, 글·선수는 그 사진 (D-037·D-038) |
| 리그 표기·출처 | /src/config/league.ts | 순위표 시즌 제목, 기록 기준 시즌, 다음 시즌, 새 경기 대회 기본값, 자료 출처 (D-011) |
| 레이아웃 | /src/components/layout | Header(모바일 메뉴), Footer(연락처·SNS), PageHeader(섹션 탭) |
| 메인 섹션 | /src/components/home | Hero, SponsorMarquee(히어로 아래 스폰서 띠, D-029), HomeColumns(본문 + 오른쪽 위젯 칸)·StandingsWidget(리그 순위, D-034), NewsTabs, PlayersPreview, QuickLinks, SponsorStrip(스폰서 페이지 격자) |
| 도메인 UI | /src/components/{club,match,news,player,posting} | VenueMap·NaverMap(오시는 길 지도, 네이버 지도 스크립트는 키가 있을 때만), MatchRow(목록), MatchCard(메인), NewsCard, PlayerCard, PostingBoard(분류 탭·출처 칩·더 보기, 클라이언트)·PostingCard |
| 포스팅 도우미 | /src/lib/postings.ts | 정렬(최근 먼저)·분류/출처 필터·개수 (순수 함수, D-022) |
| 공용 UI | /src/components/ui | Section, Placeholder, EmblemFallback(사진 없을 때), FitImage(세로 사진도 잘리지 않는 미리보기 — D-050), DocumentBody(관리자가 쓴 긴 문서 — D-051) |
| 없는 주소 화면 | /src/app/not-found.tsx, /src/app/(site)/not-found.tsx, /src/components/layout/NotFoundBody.tsx | 맞는 주소가 없을 때(루트, 띠/헤더/푸터 직접) / 사이트 페이지 안 notFound()(본문만) (D-050) |
| 관리자 UI | /src/components/admin | AdminForm(useActionState + 필드 오류·입력값 유지), fields, DeleteButton, PageTitle, AdminNav |
| 공개 데이터 접근 | /src/lib/repo.ts | 모든 공개 조회 함수 (캐시 태그: lib/cache-tags.ts) |
| 데이터 소스 | /src/lib/data | source.ts(계약), db-source.ts, static-source.ts, rows.ts(DB↔도메인 변환) |
| 관리자 DAL | /src/lib/admin | auth.ts, form.ts, storage.ts |
| 경기 표시 도우미 | /src/lib/match.ts | 대회별 묶기, 대회·라운드 라벨 (BR-011) |
| 세션 갱신 | /src/proxy.ts | /admin 요청의 Supabase 쿠키 갱신 |
| 디자인 토큰 | /src/styles/tokens.css | 색·간격·라운드. hex 하드코딩은 여기만 |

## 5. 데이터 모델 요약

DB 진실의 원천: `supabase/migrations/*.sql`. 실데이터 적재본: `supabase/data/*.sql` (연맹·인스타그램 출처, D-010). 도메인 타입: `src/types/index.ts`, DB 행 타입·변환: `src/lib/data/rows.ts`.
- 테이블: admins(허용 목록), club_settings(단일 행 — 연락처·SNS·주소 + 링크 미리보기 이미지·제목·설명 og_*·admin_og_*, D-037·D-038), history_items, national_team_alumni(배출 풋살 국가대표 — D-043), site_content(홈페이지 내용 한 칸 값, key/value — D-046), content_items(홈페이지 내용 목록 — D-046), players, staff, matches, standings(season = 대회명, played·points 생성 컬럼 — D-020), news_posts(published, thumbnail_url 목록용 + images 상세 사진 배열 — D-017), postings(바깥 글 모음: kind·platform·원문 url 유일·posted_on·published — D-022), sponsors
- 공통: uuid id, updated_at·updated_by(트리거), check 제약 = 폼 검증 범위
- 저장소: 버킷 `media` (공개 읽기, 관리자 쓰기), 경로 `<news|players|staff|sponsors|postings|og>/<uuid>.<ext>` (일괄 적재한 포스팅 사진은 `postings/<url 해시>.jpg`, 처음 받은 스폰서 로고는 `sponsors/<영문 이름>.png` — D-029)

## 6. 횡단 관심사 처리 방식

- **에러 처리**: 공개 — 없는 slug/카테고리는 `notFound()`. DB 조회 실패는 throw (에러 페이지). 관리자 — 액션은 `ActionState`(message·errors·values)로 돌려주고 DB 오류는 `dbErrorMessage()` 로 내부 정보 없이 변환
- **캐시**: 공개 조회는 `'use cache'` + `cacheTag(TAGS.x)` + `cacheLife('minutes')`. 관리자 저장 시 `updateTag(TAGS.x)` (서버 액션에서 redirect 전에)
- **로깅**: 없음
- **설정/환경변수 접근**: 고정값은 `src/config/site.ts`, Supabase 는 `src/lib/supabase/config.ts` 를 통해서만
- **인증/인가 체크 위치**: DB RLS(`is_admin()`) + 관리자 페이지 본문(`requireAdminPage`) + 모든 서버 액션(`requireAdminAction`). 레이아웃·proxy 는 권한 경계가 아니다

## 7. AI 작업 시 구조 관련 규칙

1. 새 파일은 기존 레이어 구조에 맞는 위치에 만든다. 새 최상위 디렉터리가 필요하면 먼저 제안한다.
2. 구조를 크게 바꾸는 리팩토링은 `REFACTORING_GUIDELINES.md` 절차를 따르고 사전에 계획을 보고한다.
3. 이 문서에 없는 패턴을 새로 도입할 때는 도입 이유를 `DECISION_LOG.md`에 남긴다.
