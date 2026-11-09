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
| Header | src/components/layout/Header.tsx |
| Footer | src/components/layout/Footer.tsx |
| PageHeader | src/components/layout/PageHeader.tsx |
| MatchCard | src/components/match/MatchCard.tsx |
| … | … |

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
