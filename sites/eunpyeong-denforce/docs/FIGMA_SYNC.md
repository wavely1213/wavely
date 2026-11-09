# FIGMA_SYNC.md — 피그마 ↔ 사이트 동기화 + 프로구단급 리디자인 (D-066, D-067)

> 총괄 세션이 관리하는 작업 계획서. 기능 세션과 디자인 세션은 이 문서를 기준으로 일하고, 바꿀 것이 있으면 총괄에게 보고한다.
> 사이트 규칙(AGENTS.md, docs/)이 먼저다 — 특히 토큰 밖 색 금지(tokens.css), 화면 글에 중간점(·) 금지(BR-024), 비밀 키 금지(SECURITY_GUIDELINES).

## 목표 (소유자 2026-11-09)

1. **디자인 시스템**: 사이트의 색/글꼴/간격/라운드와 부품(헤더, 푸터, 카드, 버튼, 표, 관리자 입력칸)을 피그마 변수와 컴포넌트로 만들고, 코드와 같은 값을 유지한다.
2. **화면(UX) 전체 — 프로구단급 리디자인 (D-067, 소유자 2026-11-09 "스포츠 프로구단 기준으로 홈페이지 구축")**: 지금 사이트를 1:1로 옮기는 것이 아니라, 아래 '리디자인 기준'(프로구단 사이트 레퍼런스)대로 공개 화면 새 시안을 PC 1280 / 휴대폰 390 으로 만든다. 소유자 승인 후 사이트 코드에 반영(별도 작업). 관리자 화면은 지금 화면을 옮기는 정도(우선순위 낮음).
3. **콘텐츠 → 포스터**: 사이트 데이터(다음 경기, 경기 결과, 영입/작별 선수, 스폰서)로 피그마 포스터 템플릿(MATCH DAY, 경기결과, WELCOME, GOOD LUCK)을 채운다.

## 피그마 파일

- 파일: https://www.figma.com/design/d7A7Hc34KQ9jR2sDFkFaXI (fileKey `d7A7Hc34KQ9jR2sDFkFaXI`, 팀 'mot mot의 팀' Pro)
- 페이지 구성 (디자인 세션이 만든다):
  - `00 안내` — 이 파일 사용법, 동기화 날짜, 코드 위치
  - `00 References` — 프로구단 사이트 레퍼런스 캡처와 메모 (리디자인 기준의 근거)
  - `01 Foundations` — 변수 컬렉션 `Color`, `Space`, `Radius`, `Layout` (+ `Mode: Desktop / Mobile`), 글꼴 스타일
  - `02 Components` — 사이트 부품 (이름 = 코드 컴포넌트 이름, 아래 '부품 지도')
  - `03 Screens — Site` — 공개 페이지 리디자인 시안 PC/휴대폰 (+ 비교용 '지금 사이트' 캡처)
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

#### B-1. 응답 모양 (확정, `version: 1` — 코드 `src/lib/figma-feed.ts`, 라우트 `src/app/api/figma/feed/route.ts`)

```
{ version, generatedAt, club, nextMatch | null, lastResult | null, recentSignings[], recentFarewells[], sponsors[] }
```

- 다음 경기 = 상태 '예정' 경기 중 시작 시각이 가장 이른 것(홈/원정 모두, BR-003). 결과 = 상태 '종료'이고 점수가 있는 가장 최근 경기.
- 영입/작별 = 최근 180일 구단뉴스 제목에서 읽는다(관리자 알림과 같은 규칙, `parseRosterNews`). 최근 소식 먼저, 최대 10명. 같은 이름 활동 선수가 한 명일 때만 등번호/포지션/사진을 붙인다(BR-025). 떠난 선수는 활동 명단에 없어서 보통 이름과 소식 사진만 있다.
- 주소는 모두 절대 주소. 값이 없으면 글자는 `""`, 이미지는 `null`. 개인정보(생년월일, 키), 비공개 글, 관리자 정보는 넣지 않는다.
- 응답 헤더: `Access-Control-Allow-Origin: *`(플러그인 iframe 출처가 null), `Cache-Control: public, max-age=60, s-maxage=60`.

#### B-2. 필드 = 레이어 이름 (텍스트 레이어는 글자, `이미지` 표시는 사각형/프레임에 이미지 채우기)

| 묶음 | 필드 (레이어 이름은 앞에 `#`) | 예 |
|---|---|---|
| club (모든 포스터) | `clubName`, `clubNameEn`, `clubEmblem`(이미지), `clubUrl` | 서울은평 덴포스 |
| nextMatch (MATCH DAY) | `opponent`, `homeTeam`, `awayTeam`, `homeAway`, `date`, `time`, `kickoff`(ISO 원본), `venue`, `competition`, `round`, `matchLabel` | 용인지솔FS / HOME / 2026-11-15 (일) / 15:00 / 은평다목적체육관 / 2026-27 FK1리그 / 3R |
| lastResult (경기결과) | nextMatch 필드 전부 + `score`(홈 먼저 '3 : 2'), `homeScore`, `awayScore`, `scoreUs`, `scoreThem`, `result`(W/D/L), `resultLabel`(승/무/패), `scorers` | 2 : 3 / 승 / 원해연 2, 김민성 |
| recentSignings[i] (WELCOME), recentFarewells[i] (GOOD LUCK) | `playerName`, `playerNumber`, `position`(GK/FIXO/ALA/PIVO), `positionLabel`(아라 등, 스태프면 직책), `playerPhoto`(이미지), `newsImage`(이미지), `newsTitle`, `newsDate`, `newsUrl`, `isStaff` | 김선빈 / 7 / ALA / 아라 |
| sponsors[i] (모든 포스터) | `sponsorLogo`(이미지), `sponsorName`, `sponsorTierLabel`, `sponsorTier` | 같은 이름 레이어가 여러 개면 등급 순서대로 하나씩 채운다 |

#### B-3. 포스터 템플릿 ↔ 데이터 (플러그인 '포스터 채우기')

| `05 Posters` 템플릿 이름 (컴포넌트 또는 프레임) | 채우는 데이터 |
|---|---|
| `MATCH DAY` | nextMatch + club + sponsors |
| `경기결과` | lastResult + club + sponsors |
| `WELCOME` | 고른 recentSignings 한 명 + club + sponsors |
| `GOOD LUCK` | 고른 recentFarewells 한 명 + club + sponsors |

- 이름은 앞부분이 같으면 된다: `MATCH DAY`, `MATCH DAY 1080x1350`, `MATCH DAY / 1080x1080` 모두 MATCH DAY 템플릿. 크기 2종(1080×1350, 1080×1080)을 따로 만들어도 된다 — 플러그인은 크기마다 하나씩 채운다.
- 레이어 이름은 `#필드` 로 시작하면 된다(`#opponent`, `#opponent 2` 둘 다 opponent). 이미지 필드는 사각형/프레임/원 같은 도형 레이어에 둔다(이미지 채우기 Fill). 템플릿에 없는 필드는 건너뛰고, 데이터가 비면 글자는 비우고 이미지는 템플릿 그대로 둔다.
- 플러그인은 템플릿을 복제(컴포넌트면 인스턴스를 만든 뒤 떼어 냄)해 템플릿 오른쪽에 놓고 채운다. 원본 템플릿은 건드리지 않는다.

### C. 피그마 플러그인 — `sites/eunpyeong-denforce/figma-plugin/` (기능 세션이 만든다)
- 버튼: '포스터 채우기'(B 를 읽어 `05 Posters` 템플릿을 복제해 채움), '토큰 내보내기'(변수 → JSON 복사), '토큰 가져오기'(tokens.json → 변수).
- 네트워크는 eunpyeong-fs.com 만 (manifest networkAccess). 비밀 키 없음.
- 설치: 피그마 데스크톱 › Plugins › Development › Import plugin from manifest (소유자 안내는 총괄이 한다).

## Code Connect 확인 (기능 세션, 2026-11-09)

- 계정은 'mot mot의 팀' **Pro + Full 좌석** (Figma 연결 whoami 로 확인).
- 피그마 현재 문서: Code Connect 는 Professional 에서도 된다 — 단 **활성 라이브러리 1개, 프레임워크 1개**(우리는 React 하나라 맞음). 예전 포럼 답(Organization 이상만)과 다르다.
- 실제 연결은 아직 시험하지 못했다: 파일에 컴포넌트가 없고(`get_code_connect_map` 결과 빈 값), 연결을 만드는 것은 피그마 파일을 고치는 일이라 디자인 세션 몫이다.
- 결정: 아래 **부품 지도 표를 기준으로 계속 쓴다.** 디자인 세션이 Components 를 만든 뒤 한 개(Header)로 Code Connect 를 시험해 되면 그때 더하고, 안 되면 표만 쓴다.

## 리디자인 기준 (총괄이 레퍼런스 조사 후 채운다)

_조사 중 — 채워지기 전에는 디자인 세션이 Foundations/Components(지금 값)까지만 진행._

## 부품 지도 (디자인 세션이 채운다)

| 피그마 컴포넌트 | 코드 |
|---|---|
| Header | src/components/layout/Header.tsx |
| Footer | src/components/layout/Footer.tsx |
| PageHeader | src/components/layout/PageHeader.tsx |
| MatchCard | src/components/match/MatchCard.tsx |
| … | … |

## 기능 세션 결정 (총괄이 합칠 때 DECISION_LOG 로 옮겨 주세요)

- 새 의존성 없음: 피그마 타입은 `figma-plugin/src/figma.d.ts`(쓰는 API 만), 플러그인 묶기는 저장소 typescript 로(`scripts/figma/plugin-bundle.ts`). `@figma/plugin-typings`/esbuild 는 DEPENDENCY_POLICY 승인 대상이라 넣지 않았다.
- 이미지 중계 `GET /api/figma/image?src=…` 추가: 플러그인 화면 출처가 null 이라 CORS 가 필요하고, networkAccess 가 eunpyeong-fs.com 하나라 Supabase 저장소에 직접 닿지 못한다. 허용 목록은 사이트 public 파일 + Supabase 공개 `media` 버킷만(SSRF 방지), PNG/JPEG/GIF, 10MB.
- `figma-plugin/dist/` 는 커밋한다 (소유자가 빌드 없이 설치). 테스트가 최신인지 확인.
- 피그마 변수 이름 = 토큰 경로(`color/blue`), 컬렉션 = Color/Space/Radius/Layout/Font, 모드 Desktop(+휴대폰 값이 있는 컬렉션만 Mobile). 플러그인은 앞부분을 뺀 이름(`blue`)도 같은 변수로 읽는다.
- 글꼴 토큰은 글꼴 파일 안 이름 `KFAGothic TTF` (피그마 변수에는 첫 글꼴만, 비교도 첫 글꼴만).

## 단계와 완료 기준

| 단계 | 기능 | 디자인 | 완료 기준 |
|---|---|---|---|
| 1 | tokens.css → tokens.json 스크립트 + 테스트 | Foundations 변수/글꼴 (tokens.css 값 그대로) | 피그마 변수 값 = tokens.json (총괄이 대조) |
| 2 | `/api/figma/feed` + 테스트 (배포는 총괄) | References + Components(리디자인 부품, 부품 지도 채움) + Screens Site 시안 PC/휴대폰 (홈 먼저) | 리디자인 기준 체크리스트 통과 → 총괄 검토 → 소유자 승인 |
| 3 | 피그마 플러그인 (포스터 채우기, 토큰 내보내기/가져오기) | Posters 템플릿 4종 (레이어 이름 = B 필드) | 플러그인으로 다음 경기 MATCH DAY 포스터가 채워짐 |
| 4 | 토큰 어긋남 검사(테스트) + 사용법 문서 | 00 안내 페이지 | 소유자가 혼자 써 볼 수 있음 |

## 보고

- 각 세션은 단계마다 브랜치에 커밋/푸시하고, 이 문서 '진행 기록'에 한 줄 남긴다.
- 막히면(권한, 플랜 한계, 판단 필요) 바로 멈추고 기록에 적는다 — 총괄이 확인해 소유자에게 묻는다.

## 진행 기록

- 2026-11-09 총괄: 피그마 파일 생성, 이 계획서 작성, 기능/디자인 세션 시작.
- 2026-11-09 기능: 1단계 토큰 — `scripts/figma/tokens.ts`(변환/비교 순수 함수) + `build-tokens.ts`(`npm run figma:tokens`, `--check`) + `check-figma.ts`(`npm run figma:check <내보낸 JSON>`) → `design/tokens.json` 생성, 테스트 `tests/figma-tokens.test.ts`. tokens.css 에 `--space-*` 가 없어 `space` 그룹은 비어 있음(만들지 않음). 글꼴 이름은 파일 안 이름 `KFAGothic TTF`.
- 2026-11-09 기능: 2단계 포스터 데이터 — `GET /api/figma/feed`(`src/app/api/figma/feed/route.ts`, 변환 `src/lib/figma-feed.ts`, 테스트 `tests/figma-feed.test.ts`). 응답 모양/필드 이름/템플릿 규칙을 위 B-1~B-3 표로 확정. 로컬 정적 데이터 모드 빌드/응답 확인. **운영 배포 전이라 eunpyeong-fs.com 에는 아직 없음 — 총괄 배포 필요.**
- 2026-11-09 기능: 3단계 피그마 플러그인 — `figma-plugin/`(manifest, `src/code.ts`, `src/poster.ts`, `src/variables.ts`, `ui.html`, `README.md` 빌드/설치) + 이미지 중계 `/api/figma/image`. `npm run figma:plugin` 으로 `dist/` 생성, 테스트 `tests/figma-plugin.test.ts`. 가짜 피그마 API 로 dist/code.js 를 돌려 가져오기(26개)→다시 가져오기(그대로 26)→내보내기→`figma:check` 차이 0, 포스터 채우기(템플릿 그대로, 복제본 오른쪽) 확인. 실제 피그마 앱 실행은 소유자/총괄 몫(데스크톱 앱 필요).
- 2026-11-09 기능: 4단계 — 토큰 어긋남 검사는 1단계에 포함(`design/figma-variables.json` 이 생기면 `npm test` 가 비교, `npm run figma:check <파일>`). Code Connect 확인 결과는 위 'Code Connect 확인'. **멈춤/총괄 확인 필요: ① `/api/figma/feed`, `/api/figma/image` 운영 배포 ② 디자인 세션 템플릿 레이어 이름을 B-2 표에 맞춤 ③ 위 '기능 세션 결정' DECISION_LOG 반영.**
- 2026-11-09 총괄: 소유자 방향 변경 — 화면은 프로구단급 리디자인 시안 (D-067). 디자인 세션에 Foundations/Components 까지만 하고 대기하라고 전달. 레퍼런스 조사 시작.
