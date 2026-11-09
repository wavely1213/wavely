# FIGMA_SYNC.md — 피그마 ↔ 사이트 동기화 (D-066)

> 총괄 세션이 관리하는 작업 계획서. 기능 세션과 디자인 세션은 이 문서를 기준으로 일하고, 바꿀 것이 있으면 총괄에게 보고한다.
> 사이트 규칙(AGENTS.md, docs/)이 먼저다 — 특히 토큰 밖 색 금지(tokens.css), 화면 글에 중간점(·) 금지(BR-024), 비밀 키 금지(SECURITY_GUIDELINES).

## 목표 (소유자 2026-11-09)

1. **디자인 시스템**: 사이트의 색/글꼴/간격/라운드와 부품(헤더, 푸터, 카드, 버튼, 표, 관리자 입력칸)을 피그마 변수와 컴포넌트로 만들고, 코드와 같은 값을 유지한다.
2. **화면(UX) 전체**: 공개 페이지와 관리자 화면을 피그마 프레임(PC 1280, 휴대폰 390)으로 옮기고, 사이트가 바뀌면 다시 맞춘다.
3. **콘텐츠 → 포스터**: 사이트 데이터(다음 경기, 경기 결과, 영입/작별 선수, 스폰서)로 피그마 포스터 템플릿(MATCH DAY, 경기결과, WELCOME, GOOD LUCK)을 채운다.

## 피그마 파일

- 파일: https://www.figma.com/design/d7A7Hc34KQ9jR2sDFkFaXI (fileKey `d7A7Hc34KQ9jR2sDFkFaXI`, 팀 'mot mot의 팀' Pro)
- 페이지 구성 (디자인 세션이 만든다):
  - `00 안내` — 이 파일 사용법, 동기화 날짜, 코드 위치
  - `01 Foundations` — 변수 컬렉션 `Color`, `Space`, `Radius`, `Layout` (+ `Mode: Desktop / Mobile`), 글꼴 스타일
  - `02 Components` — 사이트 부품 (이름 = 코드 컴포넌트 이름, 아래 '부품 지도')
  - `03 Screens — Site` — 공개 페이지 PC/휴대폰
  - `04 Screens — Admin` — 관리자 화면 PC/휴대폰
  - `05 Posters` — 포스터 템플릿 컴포넌트 (1080×1350, 1080×1080)

## 무료로 되는 것 / 안 되는 것 (Pro 플랜)

- 피그마 REST API 로 **파일을 쓰는 것은 안 된다** (변수 쓰기 API 는 Enterprise). 피그마 수정은 ① Claude 세션의 Figma 연결(use_figma) 또는 ② 피그마 플러그인(사람이 버튼 한 번)으로만.
- Code Connect(피그마 부품 ↔ 코드 연결 표시)는 Organization 이상일 수 있다 — 기능 세션이 확인하고, 안 되면 `docs/FIGMA_SYNC.md` 부품 지도 표로 대신한다.
- 사이트 → 피그마 자동 반영(사람 없이)은 불가. 대신 **사이트가 데이터를 공개 JSON 으로 내보내고**, 피그마 플러그인이 그걸 읽어 채운다.

## 역할

| 세션 | 맡는 것 | 작업 브랜치 |
|---|---|---|
| 총괄 (이 세션) | 계획, 기준 문서, 두 세션 결과 검토, 합치기, 운영 배포 승인 요청, 소유자 보고 | `claude/tender-keller-fd45tu` |
| 기능 | 토큰 내보내기/검사 스크립트, 포스터용 공개 JSON, 피그마 플러그인 코드, 테스트 | `claude/figma-sync-feature` |
| 디자인 | 피그마 파일 (Foundations, Components, Screens, Posters), 피그마 쪽 이름/구조 | `claude/figma-sync-design` (피그마 작업 기록만) |

두 세션 모두 `claude/tender-keller-fd45tu` 에서 출발한다 (사이트 코드가 아직 main 에 없다). 운영 배포/운영 DB 변경은 하지 않는다 — 총괄이 소유자 승인 받아서 한다.

## 맞물리는 약속 (두 세션이 같이 쓰는 것)

### A. 토큰 파일 — `sites/eunpyeong-denforce/design/tokens.json` (기능 세션이 만든다)
- 출처는 `src/styles/tokens.css` (코드가 기준). 스크립트가 tokens.css → tokens.json 을 만든다.
- 모양: W3C Design Tokens 형식. 그룹 `color`, `space`, `radius`, `layout`, `font`. 반응형 값(720px 이하)은 `$extensions.mobile`.
- 이름 규칙: CSS `--c-blue` → `color/blue`, `--radius-s` → `radius/s`, `--gutter` → `layout/gutter`. 디자인 세션은 피그마 변수 이름을 이 경로 그대로 쓴다.
- 검사: 피그마에서 내보낸 변수 JSON(플러그인 '토큰 내보내기')과 tokens.json 이 다르면 테스트가 실패해 알려 준다.

### B. 포스터 데이터 — 공개 JSON `GET https://eunpyeong-fs.com/api/figma/feed` (기능 세션이 만든다)
- 이미 홈페이지에 공개된 정보만 (비공개 글, 관리자 정보, 개인정보 없음). 캐시 1분.
- 내용: `nextMatch`, `lastResult`, `recentSignings`(WELCOME), `recentFarewells`, `sponsors`, `club`(이름, 엠블럼 주소).
- 디자인 세션의 포스터 템플릿 텍스트/이미지 레이어 이름 = JSON 필드 이름 (`#opponent`, `#kickoff`, `#venue`, `#round`, `#playerName`, `#playerNumber`, `#playerPhoto` …). 기능 세션이 확정해서 이 문서에 표로 적는다.

### C. 피그마 플러그인 — `sites/eunpyeong-denforce/figma-plugin/` (기능 세션이 만든다)
- 버튼: '포스터 채우기'(B 를 읽어 `05 Posters` 템플릿을 복제해 채움), '토큰 내보내기'(변수 → JSON 복사), '토큰 가져오기'(tokens.json → 변수).
- 네트워크는 eunpyeong-fs.com 만 (manifest networkAccess). 비밀 키 없음.
- 설치: 피그마 데스크톱 › Plugins › Development › Import plugin from manifest (소유자 안내는 총괄이 한다).

## 부품 지도 (디자인 세션이 채운다)

| 피그마 컴포넌트 | 코드 |
|---|---|
| TopBar (Device=Desktop, 휴대폰은 숨김) | src/components/layout/TopBar.tsx |
| Header (Active × Device) | src/components/layout/Header.tsx |
| Footer (Device) | src/components/layout/Footer.tsx |
| PageHeader (Type=Default/Compact × Device) | src/components/layout/PageHeader.tsx |
| Hero (Device) | src/components/home/Hero.tsx |
| SponsorMarquee | src/components/home/SponsorMarquee.tsx |
| Section | src/components/ui/Section.tsx |
| NewsTabs | src/components/home/NewsTabs.tsx (+ Tabs.module.css) |
| StandingsWidget | src/components/home/StandingsWidget.tsx |
| QuickLinks | src/components/home/QuickLinks.tsx |
| MatchCard (State=Result/Upcoming) | src/components/match/MatchCard.tsx |
| MatchTable (Device) | src/components/match/MatchTable.tsx |
| StandingsTable | src/components/match/StandingsTable.tsx |
| NewsCard | src/components/news/NewsCard.tsx |
| NewsBanner | src/components/news/NewsBanner.tsx |
| NewsGallery | src/components/news/NewsGallery.tsx |
| ShareButton | src/components/news/ShareButton.tsx |
| article/Pager | src/app/(site)/news/[category]/[id]/page.tsx (article.module.css) |
| PlayerCard | src/components/player/PlayerCard.tsx |
| StaffCard | src/components/player/StaffCard.tsx |
| PostingBoard | src/components/posting/PostingBoard.tsx |
| PostingCard | src/components/posting/PostingCard.tsx |
| MoreButton | src/components/ui/MoreButton.tsx |
| prose/Button | src/styles/prose.module.css .button |
| prose/Card | src/styles/prose.module.css .card |
| (관리자 부품: 아래 진행 기록 4단계 참고) | src/components/admin/** |

## 단계와 완료 기준

| 단계 | 기능 | 디자인 | 완료 기준 |
|---|---|---|---|
| 1 | tokens.css → tokens.json 스크립트 + 테스트 | Foundations 변수/글꼴 (tokens.css 값 그대로) | 피그마 변수 값 = tokens.json (총괄이 대조) |
| 2 | `/api/figma/feed` + 테스트 (배포는 총괄) | Components (부품 지도 채움) + Screens Site/Admin PC·휴대폰 | 실제 사이트 캡처와 피그마 화면 1:1 |
| 3 | 피그마 플러그인 (포스터 채우기, 토큰 내보내기/가져오기) | Posters 템플릿 4종 (레이어 이름 = B 필드) | 플러그인으로 다음 경기 MATCH DAY 포스터가 채워짐 |
| 4 | 토큰 어긋남 검사(테스트) + 사용법 문서 | 00 안내 페이지 | 소유자가 혼자 써 볼 수 있음 |

## 보고

- 각 세션은 단계마다 브랜치에 커밋/푸시하고, 이 문서 '진행 기록'에 한 줄 남긴다.
- 막히면(권한, 플랜 한계, 판단 필요) 바로 멈추고 기록에 적는다 — 총괄이 확인해 소유자에게 묻는다.

## 진행 기록

- 2026-11-09 총괄: 피그마 파일 생성, 이 계획서 작성, 기능/디자인 세션 시작.
- 2026-11-09 디자인: 1단계 01 Foundations — 페이지 6개(00~05) 생성, 변수 컬렉션 `Color`(19개, 모드 Value) · `Radius`(s 6, m 10) · `Layout`(container/gutter/header-h/section-gap, 모드 Desktop/Mobile) 값은 tokens.css 그대로, 이름은 약속 A 경로, WEB 코드 문법 `var(--…)`. 글꼴 스타일 `kfa/<크기> Regular|Bold` 34개. 견본 시트 노드 3:69 (페이지 3:2), 스크린샷 확인. 참고: ① tokens.css 에 간격(space) 토큰이 없어 `Space` 컬렉션은 만들지 않음(값 발명 금지) — tokens.json 에 생기면 추가. ② KFA고딕은 피그마 글꼴 목록에 없음(사이트 로컬 글꼴, Pro 플랜은 팀 글꼴 업로드 불가) → CSS 대체 순서의 `Noto Sans KR` 로 스타일을 만듦. 소유자가 데스크톱 앱에 KFA고딕을 설치하면 스타일 글꼴만 바꾸면 된다(총괄 확인 필요).
- 2026-11-09 디자인: 2단계 02 Components (사이트 부품) — 실제 사이트(eunpyeong-fs.com)를 Playwright 로 렌더한 DOM 을 html_to_figma 로 옮겨 1:1 재현, 컴포넌트로 변환. 색은 Color 변수에 자동 결합(채움/선 584 중 562, 나머지 22개는 코드 CSS 의 rgba 리터럴 오버레이로 토큰에 없음), 글자는 kfa 스타일, 라운드 6/10 은 radius 변수. 세트: Header(Active 없음/구단/구단소식/선수단/경기/스폰서/문의 × Device) 39:36, TopBar 39:35(휴대폰은 사이트에서 숨김), Hero 39:37, Footer 39:38, PageHeader(Default/Compact × Device) 39:39, MatchTable 39:40, MatchCard(Result/Upcoming) 39:41 외 단일 18종. 페이지 3:3, 스크린샷 확인.
- 2026-11-09 디자인: 3단계 03 Screens — Site — 공개 페이지 25개 × PC 1280 / Mobile 390 = 프레임 50개 (페이지 3:4, PC 47:2~71:2, Mobile 72:2~96:2). 사이트 캡처와 스크린샷 대조 확인. TopBar/Header/Footer 는 02 컴포넌트 인스턴스. 남은 차이: ① 영상 글의 인스타그램/유튜브 임베드와 오시는 길 네이버 지도는 iframe/스크립트라 빈 자리 상자 ② 글꼴은 Noto Sans KR 대체. 변환기 보정: 표 셀 max-width:0(말줄임) 폭, 휴대폰 홈 가로 스크롤 카드 폭을 사이트 값으로 맞춤.
- 2026-11-09 디자인: 5단계 05 Posters — 템플릿 컴포넌트 8개 (페이지 3:6): `MATCH DAY / 1080x1350` 98:2, `경기결과 / 1080x1350` 98:34, `WELCOME / 1080x1350` 98:64, `GOOD LUCK / 1080x1350` 98:81, 같은 이름의 `/ 1080x1080` 98:95, 98:127, 98:157, 98:174. 레이어 이름은 기능 세션이 확정한 B-2 필드 그대로(`#clubName` `#clubNameEn` `#clubEmblem` `#clubUrl` `#competition` `#round` `#matchLabel` `#homeTeam` `#awayTeam` `#homeAway` `#date` `#time` `#venue` `#score` `#resultLabel` `#scorers` `#playerName` `#playerNumber` `#positionLabel` `#playerPhoto` `#sponsorLogo`×5). 이미지 필드는 사각형(채우기 color/bg-soft). 색은 Color 변수만. 형식은 구단 인스타 WELCOME/GOOD LUCK 이미지를 참고. 스크린샷 확인. 참고: 경기결과 배지는 승(color/win) 색으로 만들어 둠 — 무/패 색 자동 전환은 플러그인 쪽 판단(기능 세션).
- 2026-11-09 디자인: 총괄 멈춤 지시 받음 (02:58 발송, 이 세션에는 03:40 도착 — 그 전에 03 Screens Site 와 05 Posters, 00 안내는 이미 만들어 둠). 지시에 따라 04 Screens Admin 은 시작 전에 중단(관리자 화면 구조 명세만 세션 임시 폴더에 있음, 파일에는 없음). 이미 만든 03/05/00 은 지우지 않고 그대로 둠 — 방향 확정 뒤 유지/삭제/수정은 총괄 판단. 01 Foundations, 02 Components 는 완료 상태. 다음 지시 대기.
- 2026-11-09 디자인: 글꼴 결정(KFA고딕 하나) 반영 — `listAvailableFontsAsync` 에 'KFAGothic TTF' 없음(피그마 클라우드는 이 컨테이너에서 글꼴을 설치할 수 없고, Pro 플랜은 팀 글꼴 업로드 불가). 그래서 Noto Sans KR Regular/Bold 두 굵기만 임시로 쓰고, 파일 안의 모든 글자(02 365, 03 2460, 05 76, 00, 01 구간)를 글꼴 스타일에 연결함(스타일 없는 글자 0, Black/Medium 굵기 제거). 사이트 줄간격/자간을 지키려고 스타일 이름에 `/lh 숫자`, `/ls 숫자` 꼬리를 붙인 변형 스타일이 있음(총 112개, 모두 kfa/ 로 시작). 이전 단계에서 줄간격을 덮어써 스타일 연결이 풀렸던 문제도 이것으로 바로잡음. 소유자 지시 "KFA고딕 받아서 진행": 저장소 src/fonts 의 woff2 를 TTF 로 바꿔(패밀리 'KFAGothic TTF') 소유자에게 전달 — 소유자 PC 에 설치하고 피그마 데스크톱 앱에서 이 파일을 연 뒤 알려 주면 112개 스타일의 글꼴을 한 번에 KFAGothic TTF 로 바꾼다(또는 플러그인 'KFA 글꼴 적용'). TTF 는 사용 조건 미확인(I-007)이라 저장소에 커밋하지 않음.
