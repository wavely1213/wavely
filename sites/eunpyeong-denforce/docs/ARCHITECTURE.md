# ARCHITECTURE.md — 아키텍처

> **목적**: 코드가 어떻게 조직되어 있고, 무엇이 무엇에 의존해도 되는지 정의한다.
> 구조 변경·새 모듈 추가·데이터 흐름 관련 작업 전에 반드시 읽는다.
> **갱신 시점**: 레이어/모듈/데이터 흐름이 바뀔 때. 코드와 문서가 다르면 문서를 고친다.

---

## 1. 아키텍처 개요

Next.js App Router 정적 사이트. 페이지(서버 컴포넌트)가 `lib/repo.ts` 의 async 함수로 데이터를 받고, 지금은 그 구현이 `src/data` 상수를 읽는다. 상세 페이지는 `generateStaticParams` 로 빌드 시 생성된다.

```
[app/* page] → [components/*] (표시)
      ↓
[lib/repo.ts] → [data/*.ts]   (추후 DB/CMS 로 교체)
      ↑
[types] [config/site.ts] [styles/tokens.css]
```

## 2. 레이어와 책임

| 레이어 | 위치 | 책임 | 하면 안 되는 것 |
|---|---|---|---|
| Route | /src/app | 페이지 조립, 메타데이터, 파라미터 검증 | `src/data` 직접 import |
| Component | /src/components | 표시·상호작용(탭, 메뉴) | 데이터 조회 (props 로만 받음) |
| Data access | /src/lib/repo.ts | 조회·정렬·필터 | UI 관심사 |
| Data | /src/data | 원본 값 | 로직 |

## 3. 의존 방향 규칙

- 의존은 항상 **바깥 → 안** 한 방향: app → components / lib → data. 라벨 상수(`*_LABEL`)는 components 에서 data 를 직접 import 허용.
- 하위 레이어는 상위 레이어를 import 하지 않는다.
- 순환 의존이 생기면 구현을 멈추고 구조를 먼저 보고한다.
- 레이어를 건너뛰는 접근(예: UI에서 DB 직접 호출)은 금지. 예외가 필요하면 `DECISION_LOG.md`에 기록 후 진행.

## 4. 주요 모듈

| 모듈 | 위치 | 역할 |
|---|---|---|
| 사이트 설정·메뉴 | /src/config/site.ts | 구단명·연락처·SNS·NAV. 메뉴 변경은 여기만 |
| 레이아웃 | /src/components/layout | Header(모바일 메뉴), Footer, PageHeader(섹션 탭) |
| 메인 섹션 | /src/components/home | Hero, NewsTabs, PlayersPreview, QuickLinks, SponsorStrip |
| 도메인 UI | /src/components/{match,news,player} | MatchRow, NewsCard, PlayerCard |
| 데이터 접근 | /src/lib/repo.ts | 모든 조회 함수 |
| 디자인 토큰 | /src/styles/tokens.css | 색·간격·라운드. hex 하드코딩은 여기만 |

## 5. 데이터 모델 요약

`src/types/index.ts` 가 진실의 원천: Player, Staff, Match(+score), StandingRow, NewsPost(category), Sponsor(tier), HistoryItem.

## 6. 횡단 관심사 처리 방식

- **에러 처리**: 없는 slug/카테고리는 `notFound()` → `app/not-found.tsx`
- **로깅**: 없음
- **설정/환경변수 접근**: `src/config/site.ts` 를 통해서만
- **인증/인가 체크 위치**: 해당 없음 (공개 사이트)

## 7. AI 작업 시 구조 관련 규칙

1. 새 파일은 기존 레이어 구조에 맞는 위치에 만든다. 새 최상위 디렉터리가 필요하면 먼저 제안한다.
2. 구조를 크게 바꾸는 리팩토링은 `REFACTORING_GUIDELINES.md` 절차를 따르고 사전에 계획을 보고한다.
3. 이 문서에 없는 패턴을 새로 도입할 때는 도입 이유를 `DECISION_LOG.md`에 남긴다.
