# FIGMA_SYNC.md — 피그마 ↔ 사이트 동기화 + 프로구단급 리디자인 (D-066, D-067)

> 총괄 세션이 관리하는 작업 계획서. 기능 세션과 디자인 세션은 이 문서를 기준으로 일하고, 바꿀 것이 있으면 총괄에게 보고한다.
> 사이트 규칙(AGENTS.md, docs/)이 먼저다 — 특히 토큰 밖 색 금지(tokens.css), 화면 글에 중간점(·) 금지(BR-024), 비밀 키 금지(SECURITY_GUIDELINES).

## 목표 (소유자 2026-11-09)

1. **디자인 시스템**: 사이트의 색/글꼴/간격/라운드와 부품(헤더, 푸터, 카드, 버튼, 표, 관리자 입력칸)을 피그마 변수와 컴포넌트로 만들고, 코드와 같은 값을 유지한다.
2. **화면(UX) 전체 — 프로구단급 리디자인 (D-067, 소유자 2026-11-09 "스포츠 프로구단 기준으로 홈페이지 구축")**: 지금 사이트를 1:1로 옮기는 것이 아니라, 아래 '리디자인 기준'(프로구단 사이트 레퍼런스)대로 공개 화면 새 시안을 PC 1280 / 휴대폰 390 으로 만든다. 소유자 승인 후 사이트 코드에 반영(별도 작업). 관리자 화면은 지금 화면을 옮기는 정도(우선순위 낮음).
3. **콘텐츠 → 포스터** (보관 — D-070, 구단 공식 그래픽을 그대로 쓴다): 사이트 데이터(다음 경기, 경기 결과, 영입/작별 선수, 스폰서)로 피그마 포스터 템플릿(MATCH DAY, 경기결과, WELCOME, GOOD LUCK)을 채운다.

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
- 영입/작별 = 최근 180일 구단뉴스 제목에서 읽는다(관리자 알림과 같은 규칙, `parseRosterNews`). **소식 하나에 한 사람**(같은 이름도 합치지 않음 — 동명이인 BR-025), 최근 소식 먼저, 각 최대 10명. 명단 정보(등번호/포지션/사진)는 사람이 확실할 때만: 작별은 붙이지 않는다(남은 같은 이름 선수는 다른 사람), 선수 영입은 제목의 이름 바로 앞 포지션 낱말(골레이로/픽소/아라/피보)과 포지션이 같은 활동 선수가 딱 한 명일 때, 스태프 영입은 제목에 '이름 직책'이 있는 스태프가 딱 한 명일 때. 그 밖에는 이름과 소식 사진(`newsImage`)만.
- 주소는 모두 절대 주소. 값이 없으면 글자는 `""`, 이미지는 `null`. 개인정보(생년월일, 키), 비공개 글, 관리자 정보는 넣지 않는다.
- 응답 헤더: `Access-Control-Allow-Origin: *`(플러그인 iframe 출처가 null), `Cache-Control: public, max-age=60, s-maxage=60`.

#### B-2. 필드 = 레이어 이름 (텍스트 레이어는 글자, `이미지` 표시는 사각형/프레임에 이미지 채우기)

| 묶음 | 필드 (레이어 이름은 앞에 `#`) | 예 |
|---|---|---|
| club (모든 포스터) | `clubName`, `clubNameEn`, `clubEmblem`(이미지), `clubUrl` | 서울은평 덴포스 |
| nextMatch (MATCH DAY) | `opponent`, `homeTeam`, `awayTeam`, `homeAway`, `date`, `time`, `kickoff`(ISO 원본), `venue`, `competition`, `round`, `matchLabel` | 용인지솔FS / HOME / 2026-11-15 (일) / 15:00 / 은평다목적체육관 / 2026-27 FK1리그 / 3R |
| lastResult (경기결과) | nextMatch 필드 전부 + `score`(홈 먼저 '3 : 2'), `homeScore`, `awayScore`, `scoreUs`, `scoreThem`, `result`(W/D/L), `resultLabel`(승/무/패), `scorers` | 2 : 3 / 승 / 원해연 2, 김민성 |
| recentSignings[i] (WELCOME), recentFarewells[i] (GOOD LUCK) | `playerName`, `playerNumber`, `position`(GK/FIXO/ALA/PIVO), `positionLabel`(아라 등, 스태프면 직책), `playerPhoto`(이미지), `newsImage`(이미지), `newsTitle`, `newsDate`, `newsUrl` | 김선빈 / 7 / ALA / 아라 |
| sponsors[i] (모든 포스터) | `sponsorLogo`(이미지), `sponsorName`, `sponsorTierLabel`, `sponsorTier` | 같은 이름 레이어가 여러 개면 등급 순서대로 하나씩 채운다 |

- 참/거짓 값 `nextMatch.isHome`, `lastResult.isHome`, `recentSignings[i].isStaff` 는 JSON 에는 있지만 **레이어용이 아니다** (플러그인이 '모르는 필드'로 건너뜀). 홈/원정 글자는 `homeAway` 를 쓴다.

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
- 버튼: '포스터 채우기'(B 를 읽어 `05 Posters` 템플릿을 복제해 채움), '토큰 내보내기'(변수 → JSON 복사), '토큰 가져오기'(tokens.json → 변수), 'KFA 글꼴 적용'(Noto Sans KR → KFAGothic TTF).
- 네트워크는 eunpyeong-fs.com 만 (manifest networkAccess). 비밀 키 없음.
- 설치: 피그마 데스크톱 › Plugins › Development › Import plugin from manifest (소유자 안내는 총괄이 한다).

## Code Connect 확인 (기능 세션, 2026-11-09)

- 계정은 'mot mot의 팀' **Pro + Full 좌석** (Figma 연결 whoami 로 확인).
- 피그마 현재 문서: Code Connect 는 Professional 에서도 된다 — 단 **활성 라이브러리 1개, 프레임워크 1개**(우리는 React 하나라 맞음). 예전 포럼 답(Organization 이상만)과 다르다.
- 실제 연결은 아직 시험하지 못했다: 파일에 컴포넌트가 없고(`get_code_connect_map` 결과 빈 값), 연결을 만드는 것은 피그마 파일을 고치는 일이라 디자인 세션 몫이다.
- 디자인 세션 시험(2026-11-09): Header 세트(39:36) ↔ src/components/layout/Header.tsx 를 add_code_connect_map 으로 연결 시도 → 거절 "Code connections can only be made in libraries that are in Organization or Enterprise plans." 지금 Pro 플랜에서는 안 된다. **부품 지도 표만 쓴다.**
- 결정: 아래 **부품 지도 표를 기준으로 계속 쓴다.** 디자인 세션이 Components 를 만든 뒤 한 개(Header)로 Code Connect 를 시험해 되면 그때 더하고, 안 되면 표만 쓴다.

## 리디자인 기준 (총괄, 2026-11-09 — D-067)

> 근거: 프로구단 사이트 18곳 조사(전북, 울산, K리그, Arsenal, Man City, Liverpool, Real Madrid, Barça 풋살, Palma Futsal, LG, SK 나이츠 등, PC 1280 / 휴대폰 390 캡처), 운영 데이터 확인, 초안 3개(경기 / 브랜드 / 휴대폰과 운영) 채점과 합치기, 비판 검토 2회. 소유자 결정 반영: 프로급 리디자인(D-067), 글꼴은 KFA고딕만, 선수 상세 관련 소식(D-068).

### 입장과 원칙
- **메인 프레임은 프로구단급 리디자인 그 자체**(D-067, 소유자 선택). 레퍼런스 구조를 우리 데이터에 맞추고 지금안/제안안 두 벌로 그리지 않는다.
- 지금 결정과 다른 곳은 시안 옆에 [변경 D-034: 경기 카드 2장 → 3칸 띠]처럼 전 → 후, 새 관리자 입력칸은 [관리자 칸 필요: 무엇](yellow 바탕, black 글자, kfa/caption). 소유자가 주석마다 승인/거절. 지금 사이트는 03 '현재 사이트 (2026-11-09)' 50프레임이 있어 안 그린다.
- **바꾸지 않는 것**: D-036 두 줄 문구 "대한민국 풋살의 중심 / 서울은평 덴포스"와 폭 맞춤, 구단 이름 표기, BR-002 홈팀 왼쪽, BR-003 히어로 카드는 다음 홈경기, BR-008 출처 줄, BR-012 순위 열 순서, BR-019, BR-024 중간점 금지, BR-025 등번호 비움과 동명이인, BR-031 관련 소식, 1차 메뉴 6개와 2차 구성(D-002, D-054), 지금 접근성 수준.
- 원칙: ① 경기와 숫자가 주인공. 첫째 시선 D-036 문구, 둘째 NextMatchHero. 히어로 아래는 경기(MatchStrip)와 순위가 먼저, 스폰서 띠만 D-029 때문에 그 사이(PC 순위는 소식 옆 sticky). ② 검정과 흰색이 면, 파랑은 핵심 부품, 노랑은 점(D-005 '푸르댕댕'). ③ 없는 것은 안 그린다(번호 칸, 상대 엠블럼). ④ 비어도 안 무너진다(가득 / 일부 / 없음, 개막 전 / 시즌 중 / 휴식기).

### 범위와 순서
1. 01 Foundations → 02 Components(홈 부품부터).
2. 03 Screens Site: **홈 PC 1280 → 홈 휴대폰 390 → 총괄에게 보고하고 멈춘다**(총괄 검토, 소유자 승인 뒤 다음). 이어서 경기일정/결과 → 선수/선수 상세 → 순위 → 구단소식/기사 → 나머지.
3. 05 Posters는 홈 승인 뒤. 04 Screens Admin은 지금 화면 옮기기만(D-056, BR-027 노랑 유지, 나중). 00 안내, Header로 Code Connect 1회 시험.
- 프레임 이름 예 `Home / PC 1280 / 개막 전`. 섹션은 auto layout 자식으로 따로(순서 주석 거절 시 옮기기만). 색 이름은 color/ 생략.

### 정보 구조
- NAV 그대로, 모양만 PC MegaMenu와 휴대폰 전체 화면 메뉴.
- TeamSwitcher는 02에 한 장: 선수단, 경기일정 2차 탭 아래 "1군 / 유소년" 알약과 팀 하나뿐인 기본(안 보임)을 나란히. 메모: 팀 구분 열(DB 변경) 필요 [확인 I-019, D-002] [관리자 칸 필요: 선수/경기 팀 구분].

### 홈 PC 1280
폭 layout/container 1200. 전폭 색 면(Hero, MatchStrip, 선수단, Footer)과 SponsorMarquee는 사이 0, 색 면 안쪽과 흰 면 섹션 위아래는 layout/section-gap(72, 겹치면 한 번).
1. **TopBar 44**(black, D-042, D-047) + **Header 80**(D-052, 영문 kfa/header-en). **MegaMenu**: 전폭 black-soft, 1차 kfa/label yellow, 2차 kfa/body on-dark('메뉴 열림' 프레임).
2. **Hero** 640(layout/hero-h): 관리자 사진 + 그라데이션(왼쪽 아래 overlay-strong → 오른쪽 위 overlay-faint). 왼쪽 아래 윗글씨(kfa/label, yellow), 윗줄 kfa/hero-lead, 아랫줄 구단 이름 kfa/display, 두 줄 폭 같게(D-036). 기본 문구는 kfa/hero-lead 그대로. 최대 길이 프레임은 윗줄 크기를 덮어써 폭을 맞추고(체크리스트 4 예외, 'HeroTitle이 화면에서 크기 계산' 주석), 윗줄과 이름은 각 2줄까지(긴 줄끼리 맞춤, 이름이 2줄을 넘으면 display 크기도 덮어씀) [확인 D-036], 휴대폰도 520 안에서 NextMatchHero와 안 겹침.
3. **NextMatchHero**(히어로 오른쪽 아래 space/2xl): 400(layout/match-hero-w), blue, radius/l, 패딩 space/l, 오른쪽 아래 사선 삼각형 96(line-on-dark). 기본 글자, 숫자, [경기일정] 테두리, 초점은 on-blue. 'NEXT HOME MATCH'(kfa/label, yellow) + CompetitionTag / TeamCrest 56 둘 + 아래 팀 이름(kfa/body-s, 2줄까지, 줄임 금지), 홈팀 왼쪽, 우리 엠블럼은 bg 원 받침 / '12월 5일 (토) 14:00'(kfa/h3), '은평다목적체육관' + HOME / 버튼 2개 높이 44: [오시는 길] bg 바탕 blue 글자, [경기일정] 테두리.
   - 상태: 있음 / 다음 홈경기 없음(숨김). 결과 입력 전까지는 킥오프가 지나도 그 경기가 남는다(BR-003). **카운트다운은 넣지 않는다** (소유자 2026-11-09 "이거까진 필요 없을듯").
4. **MatchStrip**(black-soft): 섹션 제목(관리자 값) + 링크(예정 있으면 '전체 일정' → 경기일정, 휴식기 '전체 결과' → 경기결과). [지난 경기 | 다음 경기(원정 포함) | 그다음 경기], 칸 사이 line-on-dark. 칸: 라벨, CompetitionTag, 날짜 / TeamCrest 40 + 아래 이름(2줄까지, 줄임 금지), 홈팀 왼쪽 / 스코어나 시각(kfa/number, on-dark) / 지난 경기는 ResultBadge, 득점 줄, 있을 때만 [하이라이트] [다시보기] 새 창 버튼. 대진 줄만 링크. '일부' 예: 8/25 인천ZD스포츠 3 : 3(다시보기만). 빈 칸은 숨기고 남은 칸이 폭을 나눔(3 / 2 / 1칸, 0이면 숨김). 휴식기(예정 0) 프레임은 최근 결과 3칸(라벨 '지난 경기') + '전체 결과'. [변경 D-034: 경기 카드 2장(휴식기 최근 2장) → 3칸 띠(휴식기 최근 결과 3칸)]
5. **SponsorMarquee**(bg, 높이 96, 로고 40, 10곳 등급순): 마우스, 초점, 움직임 줄이기에서 멈춤 + 멈춤 버튼 44. [변경 D-029: 히어로 바로 아래 → MatchStrip 아래] [변경 I-033: 멈춤 버튼 없음(보류) → 44 멈춤 버튼]
6. **HomeColumns** 888 + 280(layout/aside-w). 왼쪽 NewsTabs 5탭, 큰 NewsCard 1(520, 16:9) + 목록 행 4(썸네일 120x80) [변경 D-034: 구단 소식 3칸 x 2줄 → 큰 카드 1 + 목록 행 4]. 오른쪽 **StandingsWidget** sticky: 순위, 팀, 경기, 승점, 승, 무, 패, 우리 팀 행 blue-tint 바탕 + text 글자, '자료: 한국풋살연맹', '고양불스풋살클럽' 2줄 넘침 프레임, 개막 전은 순위 '-' + "개막 전 / 팀명 가나다순". [변경 D-034: 순위 위젯 4열 → 7열]
7. **선수단**(black): 포지션 탭(골레이로 / 픽소 / 아라 / 피보, 활성 밑줄 yellow 2px), PlayerCard 4장(폭 282, 사이 space/l), 화살표 44 + 점. [변경 D-005: 선수단 흰 면 → 검정 면]
8. **InstagramGrid**: 저장된 표지 6칸 정사각, 새 창. [변경 D-002: INSTAGRAM 섹션 추가] [관리자 칸 필요: 섹션 제목, 또는 코드 고정 'INSTAGRAM']
9. **QuickLinks**: 글 타일(bg-soft, radius/m), 6칸 줄, 최대 12, 문의 설명 '제휴/후원'(BR-026).
10. **Footer**(black): NAV 사이트맵 6칸 + 기존 정보 줄 전부(BR-028), '관리자' 맨 끝.

### 홈 휴대폰 390
- Header 60 → Hero 520 → MatchStrip → 스폰서 띠 → 리그 순위 → 구단 소식 → 선수단 → INSTAGRAM → 바로가기 → 푸터. gutter 16, section-gap 48, 간격 규칙은 PC와 같다. [변경 D-034: 휴대폰 리그 순위 구단 소식 뒤 → 스폰서 띠 바로 뒤]
- **첫 화면**: 60 + 520 = 580px, Safari 보이는 높이(약 660) 안. 히어로 위쪽에 윗글씨와 두 줄 제목, 아래쪽에 NextMatchHero 358(패딩 space/m, TeamCrest 40 + 팀 이름(PC 규칙), 일시 kfa/h4, 버튼 2개 나란히).
- MatchStrip과 선수단은 스와이프 + 점(옆 카드 24px, 1장이면 전폭). 소식은 ScrollRow 탭 + 썸네일 왼쪽 목록 4줄 + '더 보기'(PC의 D-034 주석). 순위 7열, INSTAGRAM 3x2, 바로가기 2열, 터치 44 이상.
- **메뉴 열림**: 전체 화면 black, NAV 1차와 2차, 맨 아래 SNS, MD스토어, 사이트맵(D-042).

### 하위 페이지
**PageHeader 기본 = black 면 + 엠블럼 사선**: PC 240 / 휴대폰 160, 1차 이름(kfa/label, yellow), 제목 kfa/h1, 2차 탭(활성 yellow 2px 밑줄). 오른쪽에 사선으로 잘린 black-soft 면 + 경계 blue 6px. 상세는 compact(120 / 96). [변경 D-005: PageHeader 흰 바탕 → 검정 면 + 사선]
1. **경기일정, 경기결과**: 대회별 MatchTable(BR-011), TeamCrest 24, HOME, 다음 경기 행 blue-tint, 득점 줄, 영상 버튼, 출처 줄, 휴대폰 3칸(D-012). 결과 스코어는 ResultBadge box 안 글자이고 D-013 색.
2. **선수**: 포지션 칩 + 묶음, 이름순, PC 5열 / 휴대폰 2열. 동명이인 프레임: 김대현 두 명(no-8, no-18, 둘 다 픽소)을 한 탭에 나란히, 구분안 둘 [확인 BR-025]. 1은 사진만. 2는 기록 있는 7명 모두 카드 아래 '2025-26 출전 N경기' 한 줄, 기록 없는 17명은 그 줄 높이만 비워 카드 높이를 맞추고, 목록 아래 '출전: 2025-26 기록 / 자료: 한국풋살연맹'. 김종호 두 명은 피보와 아라로 나뉜다.
   **선수 상세**(D-068, BR-031): PlayerHero(사진 FitImage 3:4 폭 400 / h1 이름, 포지션, '합류 2026-27 시즌' 또는 '13경기 / 1골'(kfa/number-l, 득점 0이면 '0골' 그대로), 도움은 0보다 클 때만, 출처 "출전/득점: 2025-26 기록 / 자료: 한국풋살연맹") → '관련 소식' NewsCard 격자(12개씩 더 보기, 없으면 숨김) → [선수 목록]. '영입 소식 보기' 없음.
3. **리그순위**: 10열, 우리 팀 blue-tint, '지난 리그'(BR-016, 0개면 숨김), 지난 시즌 화면, 두 화면 모두 '자료: 한국풋살연맹', 휴대폰은 순위와 팀 고정 + 가로 스크롤.
4. **구단소식, 기사**: NewsBanner(D-035, 1개면 넘김 숨김), 격자 + 더 보기, 구단영상 9:16 2 / 4 / 5칸(D-061). 기사는 h1, 사진 크게 보기, 공유, 이전/다음 글.
5. **나머지**: 구단소개, 연혁(성과 띠), 엠블럼/유니폼(D-045 구조), 오시는 길, 코칭스태프(BR-014) [변경 D-016: 사진 없는 스태프 카드 파랑 그라데이션 + 엠블럼 → black-soft + 엠블럼], 스폰서(네이밍 두 칸 폭), 문의, 포스팅(분류 탭 전체 / 구단 포스팅 / 뉴스 / 팬 포스팅 / FK리그, 출처 칩, PostingCard 격자 + 더 보기, D-032), 사이트맵, 404 두 종류.

### 부품
피그마 이름 = 코드 이름, 기존 부품은 변형만 더함.

|이름|변형|데이터|빈 상태|[변경]|
|---|---|---|---|---|
|Header, MegaMenu|pc, m, 메뉴 열림|NAV|-|-|
|Hero|사진 유무|관리자 값|black/black-soft 사선 면|-|
|NextMatchHero (새)|pc, m x 4상태|다음 홈경기|숨김|D-034|
|MatchStrip (새), MatchCard|3 / 2 / 1칸, 휴식기, 결과 / 예정|지난 1 + 예정 2|0칸 숨김|D-034|
|ResultBadge|badge(카드), box(표)|status, score|없음|-|
|HomeAwayBadge, CompetitionTag|HOME만 / 대회 + 라운드, 면별(시각 언어)|isHome, round|원정은 배지 없음|-|
|TeamCrest (새)|us, initial, image(수집 뒤)|팀 이름|bg-soft 원에 text 색 앞 2글자(56 kfa/pc/h4, 40 kfa/label, 24 kfa/m/header-en)|image [관리자 칸 필요: 상대팀 엠블럼 이미지, 또는 코드 고정 파일]|
|TeamSwitcher (새)|1팀(안 보임, 기본) / 1군, 유소년 알약|팀 구분(없음)|안 보임|[관리자 칸 필요]|
|SponsorMarquee, SponsorStrip|흐름, 멈춤 / 등급 묶음|로고, tier|이름 글자, 빈 등급 숨김|D-029, I-033|
|NewsTabs, NewsCard, NewsBanner|large, row, vertical / 1장|제목, 분류, 썸네일|안내 문구|D-034|
|StandingsWidget, StandingsTable|개막 전, 시즌 중, 넘침 / full|6팀, isUs|0팀 숨김|D-034|
|MatchTable|일정, 결과, m 3칸 / 득점 줄 유무, 영상 버튼 둘 / 하나 / 없음|BR-011|없는 줄 숨김, 0경기 대회 숨김|-|
|PlayersPreview, PlayerCard|촬영본, WELCOME, 사진 없음 x 번호 off(기본) / on|이름, 포지션|EmblemFallback|D-005|
|PlayerHero (새), 관련 소식|기록 / 합류|출전, 득점, BR-031|빈 칸 숨김|-|
|StaffCard|사진 유무|직책|black-soft + 엠블럼|[변경 D-016: 사진 없는 스태프 카드 파랑 그라데이션 + 엠블럼 → black-soft + 엠블럼]|
|PageHeader|default, compact, photo(부품만)|제목, 2차 탭|탭 줄 없음|D-005, photo [관리자 칸 필요]|
|QuickLinks, Footer|글 타일 / 사이트맵 칸|관리자 목록, NAV|숨김 / 관리자 버튼만|-|
|InstagramGrid (새)|6칸, 3x2|저장된 표지 145|숨김|D-002, [관리자 칸 필요]|

### 시각 언어
- **색**: 큰 면은 black, black-soft, bg, bg-soft. blue는 NextMatchHero, 결과 박스 없는 흰 면 위 큰 숫자(예: 선수 상세 기록), 주 버튼, 우리 팀 행과 다음 경기 행(blue-tint), PageHeader 띠, 초점 링에만. **파랑 큰 면은 화면 높이(800 / 844)당 1곳, 파랑 그라데이션과 그림자 없음.** 검정 면 위 스코어는 on-dark. yellow는 검정, 파랑 면 위 작은 라벨, 검정 면 활성 밑줄 2px, 제목 마크 24x4, TopBar와 휴대폰 메뉴의 MD스토어 버튼(D-047, 지금 그대로: 검정 면 위 yellow 1px 테두리 + yellow 글자, radius/pill, hover는 yellow 바탕 + black 글자)만. 흰 면 활성 탭은 text 글자 + text 2px 밑줄, 활성 칩(포지션, 출처)은 black 바탕 + on-dark 글자. [변경 D-005: 흰 면 + 구분선 → 검정 면 섹션, 노랑 라벨]
- **배지**: HOME은 흰 면, blue-tint 행에서 blue 바탕 + on-dark 글자, 검정 면에서 on-dark 1px 테두리 + 글자, 파랑 면에서 on-blue 1px 테두리 + 글자. kfa/label, radius/s, 패딩 space/2xs, space/xs. CompetitionTag는 kfa/caption 글자만: 흰 면 text-sub, blue-tint 행 text, 검정 면 on-dark-sub, 파랑 면 on-blue.
- **글꼴**: KFA고딕 Regular/Bold('KFAGothic TTF'). 피그마는 Noto Sans KR Regular, Bold만 쓰고 모든 글자를 kfa/ 스타일에 연결(소유자가 'KFA 글꼴 적용'으로 바꿈). Medium, SemiBold 금지, 숫자도 Bold.
  - 크기가 둘인 스타일은 kfa/pc/, kfa/m/ 두 벌(예: kfa/pc/display 76), 하나인 것(body-s, caption, label, badge)은 한 벌. 이 기준의 'kfa/display'는 그 프레임의 벌.
  - 크기(PC / 휴대폰). Bold, -0.02em, 줄 1.2: display 76 / 40, hero-lead 58 / 30.5(이름의 0.7625배, D-036, 기본 문구 기준), h1 48 / 32, h2 32 / 24, h3 24 / 20, h4 18 / 16, badge 20. Bold, -0.02em, 줄 1.0: number 32 / 24, number-l 56 / 40. Regular, 자간 0, 줄 1.6: body 16 / 15, body-s 14, caption 12. Bold, 0.08em, 줄 1.2: label 12(대문자), header-en 11 / 10(D-052).
- **간격, 라운드**: space/* 단계만, 카드 패딩과 격자 사이 space/l(휴대폰 space/m). radius/s 6 배지, radius/m 10 카드, radius/l 16 큰 카드, radius/pill 999 알약과 원.
- **사진**: WELCOME 포스터 17장과 파란 배경 촬영본 7장이 섞여 모든 사진 칸은 FitImage(D-050). 첫 화면 큰 이미지 1장, 빈 칸은 black-soft + 엠블럼.
- **엠블럼 모티프**: 엠블럼 사선 각도(왼쪽 아래 → 오른쪽 위, SVG에서 잼)로 면을 자른다: PageHeader black/black-soft + blue 6px, NextMatchHero blue/line-on-dark(1.20:1인 blue-hover 대신), 포스터 black/blue, Hero 빈 상태 black/black-soft. 원본 엠블럼은 그대로, 사선은 엠블럼 바로 옆에 두지 않는다(두 파랑이 다름).
- **아이콘**: 24px, 선 2px, 누르는 영역 44.
- **대비**: 금지 blue/black 1.83, blue/black-soft 1.59, yellow/bg 1.64, text-sub/blue-tint 4.37. 노랑 라벨은 노랑 바탕 + black(11.67)이나 파랑(6.39), 또는 검정 면 위 노랑 글자. ResultBadge는 메인 프레임도 지금 D-013 색: badge(카드) 흰/win 3.29, 흰/draw 3.24, 흰/loss 4.62 / box(표) 흰/win 3.29, text-sub/draw-tint 4.32, loss/loss-tint 4.07, 둘 다 kfa/badge 20 Bold라 큰 글자 3:1. 초점 2px blue, 어두운 면(black, black-soft, blue 면, 사진 위)은 흰 초점(파랑 면 on-blue, 나머지 on-dark).

### 후보 토큰
- 기존 26개 변수는 design/tokens.json 경로 그대로(layout/section-gap, font/family 포함), 컬렉션 Color / Space / Radius / Layout / Font.
- **새 값은 새 컬렉션 `Candidates`(모드 Desktop, Mobile)에 토큰 경로 이름 그대로** 만들어 시안을 묶고, 견본은 01 Foundations에. 플러그인이 모르는 컬렉션이라 figma:check가 안 깨지고, 승인 뒤 tokens.css에 실제 값(별칭 아님)으로 더하면 같은 이름으로 옮긴다. radius/circle, color/blue-deep(= blue-hover, 1.20:1), 부품 고유 치수는 안 만든다.
- 글자 크기는 kfa/ 텍스트 스타일에만 두고 토큰으로 만들지 않는다(기능 세션이 font/size 경로를 정한 뒤 다시 정함).

|경로|Desktop / Mobile|쓰임|
|---|---|---|
|color/on-blue|#ffffff|파랑 면 글자, 테두리, 초점|
|color/overlay-strong, -mid, -weak, -faint|rgba(14,15,18) 0.9, 0.55, 0.35, 0.15|사진 위|
|color/win-strong, draw-strong, loss-strong|#15803d, #5f6472, #b42323|견본만, 이 짝으로(흰 글자/win-strong 5.02, 흰 글자/draw-strong 5.91, loss-strong 글자/loss-tint 5.78) [변경 D-013: win/draw/loss → win-strong/draw-strong/loss-strong]|
|color/emblem-blue, -gold, -black|#2B4FA2, #E3A33A, #1A1715|견본만, 포스터에도 안 씀 [확인 구단 색]|
|space/2xs, xs, s, m, ml, l, xl, 2xl, 3xl|4, 8, 12, 16, 20, 24, 32, 48, 64|모든 간격|
|radius/l, radius/pill|16, 999|큰 카드, 알약|
|layout/topbar-h, hero-h|44 / 0, 640 / 520|TopBar, Hero|
|layout/aside-w|280|순위 위젯|
|layout/match-hero-w|400 / 358|NextMatchHero|

### 05 Posters
- MATCH DAY, 경기결과, WELCOME, GOOD LUCK을 1080x1350(필요하면 1080x1080), 이름은 B-3 규칙(`MATCH DAY 1080x1350`). 이미 만든 8개도 이 기준으로 다듬는다.
- black 바탕, 사선으로 잘린 blue 면 하나(일시나 스코어), 노랑은 라벨만, 아래 bg 띠 180에 `#sponsorLogo` 4칸(등급순 네이밍 1 + 메인 3). 사이트 토큰(black, blue, yellow, bg)만, emblem-*는 안 쓴다.
- MATCH DAY, 경기결과: 왼쪽 `#homeTeam`, 오른쪽 `#awayTeam` 글자 레이어, 가운데 `#score`(홈 먼저)나 `#date`(BR-002, nextMatch는 원정 포함). `#clubEmblem`(bg 원 받침)은 팀 줄과 떨어진 위쪽 가운데. `#opponent`는 안 쓰거나 보조 문구에만, `#homeAway`는 안 넣는다(중립 경기장도 AWAY). 나머지도 B-2 이름(`#time`, `#venue`, `#round`, `#playerName` 등).
- **`#playerNumber` 빈 상태가 기본 프레임**: 이름과 같은 auto layout 줄이라 비면 접히고, 큰 배번 칸은 없다.
- `#playerPhoto`는 4:5 칸(720x900, Fill)이라 WELCOME 그래픽(1350x1688, 640x791)이 거의 안 잘리고, 뒤에 `#playerPhoto 2` 전폭 + 흐림 40(FitImage처럼). WELCOME 그래픽이 들어간 프레임도 그린다.
- GOOD LUCK 사진 칸은 `#newsImage`(소식 사진). WELCOME은 `#playerPhoto` 뒤에 `#newsImage`를 깔고 `#playerPhoto` 템플릿은 비워 둬서 사진이 없으면 소식 사진이 보인다. GOOD LUCK에는 `#position`, `#positionLabel`을 기본으로 두지 않는다(작별은 명단 정보 없음, B-1).

### 빼는 것
티켓, 로그인, 쇼핑, 입력 양식 / 팝업, 광고, 조회수, 작성자 / 매치센터, 패럴랙스, 영상과 소리 자동 재생(D-035 배너 5초 넘김, D-029 띠 흐름은 멈춤 조건과 함께 유지), 홈 외부 임베드 / ICS 구독, 결과 묶음(경기 기사 0건), 하단 고정 알약 / AWAY 배지 / 확정 전 배번, GK/DF/MF/FW 칩, 빈 생년과 키 칸 / 버튼이 든 카드의 카드 전체 링크(NextMatchHero, MatchStrip 칸. PlayerCard, NewsCard, QuickLinks 타일은 지금처럼 전체 링크), 파랑 그라데이션, 그림자, 디스플레이 서체(Barlow, Oswald) 비교 프레임.

### 기본값과 소유자 확인 항목
1. 구단 색은 사이트 토큰(D-005), 엠블럼 색은 견본만 [확인 구단 색].
2. 카운트다운 없음(소유자 결정), 일정은 대회별 표(월별 아님).
3. 동명이인은 **구분안 2** (소유자 2026-11-09): 선수 카드 아래 '2025-26 출전 N경기'(출전 1경기 이상만, 없으면 같은 높이 빈 줄) + 목록 아래 출처 줄. 번호는 확정 전까지 off.
4. 연혁 성과 띠 "SINCE 2012 / 2018-19 FK리그 2부 우승 / 국가대표 11명 배출". 우승은 1회(2부)뿐이라 '우승 n회'로 쓰지 않는다 [확인 BR-004, BR-019, I-016].
5. 시즌 중 예시는 2025-26 실제 자료(5위, 2승 3무 10패, 9점), 개막 전은 6팀 모두 0.

### 모아야 할 자료
- 2026-27 단체/경기 사진, 같은 배경 프로필 촬영본 17명, 코치 사진, 확정 등번호
- FK1 상대 5팀 엠블럼 원본과 사용 허락(지금 92px, 용인지솔FS 최신본 확인), 인천ZD스포츠는 경로 없음
- 구단 유튜브 채널 주소, KFA고딕 웹 사용 허락(I-007), FK컵 3위 연도(I-016)

### 검토 체크리스트
1. 390x844 첫 화면에 구단 이름, NextMatchHero 전체, 버튼 2개.
2. NextMatchHero 4상태, MatchStrip 3 / 2 / 1칸과 휴식기, 가득 / 일부 / 없음, 개막 전 / 시즌 중 / 휴식기, 메뉴 열림.
3. 최대 길이(구단 이름 30자, 영문 60자, 윗글씨 60자, 슬로건 40자, 섹션 제목 20자, 바로가기 12개)와 280px 순위 넘침.
4. 간격(padding, gap, 항목 사이), 라운드, 색은 맨 값 0, 부품 고유 치수(폭, 높이, 선 굵기)만 이 기준 숫자를 고정값으로 허용. 모든 글자 kfa/(Hero 최대 길이 프레임 크기 덮어쓰기만 예외), Noto Sans KR Regular/Bold만, 중간점 0(글, 레이어 이름, 대체 텍스트).
5. 파랑 큰 면 화면 높이당 1곳, 흰 바탕 노랑 글자 0, 노랑 밑줄은 검정 면만, 대비 통과, 링크 안 버튼 0, 초점 표시, 터치 44, 흐르는 요소 멈춤.
6. 다른 곳마다 [변경 D-xxx: 전 → 후], 새 입력칸마다 [관리자 칸 필요]. 번호 없는 PlayerCard, initial TeamCrest 기본, 동명이인 비교 프레임, 세로 포스터 안 깨짐.
7. '바꾸지 않는 것' 전부(BR-008은 구분안 2 포함), D-013(메인 프레임은 지금 결과색), D-042, D-045, D-047, D-052, D-053(전화와 메일 링크, 득점 줄, 하이라이트/다시보기, 기사 h1, 공유, 이전/다음 글, 사진 크게 보기, 휴대폰 탭 가로 스크롤과 더 보기, 네이밍 두 칸 폭), D-061, D-068. 부품 지도와 Code Connect 결과 기록.

### 레퍼런스
구조와 부품 형태만 참고, 복제 금지(PROJECT_CONTEXT §7). 00 References 캡처: jeonbuk-home-pc, jeonbuk-squad-m(메가메뉴, 3단 매치) / liverpool-home-pc(3칸 매치 띠) / mancity-fixtures-pc, mancity-home-m(숫자 박스 스코어, 뉴스 행) / barca-futsal-schedule-m, barca-futsal-squad-pc(일정 3열, 포지션 칩) / ulsan-home-pc, kleague-home-m(스와이프 + 점) / lgtwins-home-pc, sk-knights-home-pc(어두운 히어로, 결과 띠) / palma-home-pc.

**00 References 메모 정정**: REFERENCES.md를 그대로 옮기지 말고 중간점은 '/'로 바꾸고, 스폰서는 10곳 4등급(네이밍 1, 메인 3, 서브 0, 후원사 6), 배번은 0/24(BR-025), 히어로 다음 홈경기는 결함이 아니라 BR-003 설계, 선수 상세는 기존 7명에게 2025-26 출전 기록이 있다(그중 득점 4명)고 고쳐 쓴다.

## 부품 지도 (디자인 세션이 채운다)

> 기존 부품은 변형만 더했다: 세트마다 `버전=현재`(2026-11-09 사이트 캡처) / `버전=리디자인`(D-067). 새 부품은 02 섹션 `리디자인 (D-067)`.

| 피그마 컴포넌트 (변형) | 코드 |
|---|---|
| TopBar (Device=Desktop, 휴대폰은 숨김) | src/components/layout/TopBar.tsx |
| Header (Active × Device × State 기본/메뉴 열림 × 버전) | src/components/layout/Header.tsx |
| MegaMenu (새, PC 메뉴 열림) | src/components/layout/Header.tsx |
| Footer (Device × 버전) | src/components/layout/Footer.tsx |
| PageHeader (Type=Default/Compact × Device × 버전, 리디자인=검정 면 + 사선, 불린 '탭 4~6') | src/components/layout/PageHeader.tsx |
| Chip (새, State 기본/활성/초점) 130:716 | 새 탭/필터 칩 (PageHeader 2차 탭, 경기 필터) |
| TeamSwitcher (새, 02 한 장만, 기본 숨김) | 새 src/components/layout/TeamSwitcher.tsx |
| Hero (Device × 사진 있음/없음 × 버전, NextMatchHero 내장) | src/components/home/Hero.tsx, HeroTitle.tsx |
| NextMatchHero (새, Device pc/m × State 있음/없음/초점, 카운트다운 없음) | 새 src/components/home/NextMatchHero.tsx |
| MatchStrip (새, Device pc/m × Count 3/2/1/휴식기) | 새 src/components/home/MatchStrip.tsx |
| MatchCard (Kind 결과/예정 × Device × 버전, 글자/불린 속성) | src/components/match/MatchCard.tsx |
| ResultBadge (새, Type badge/box × Result W/D/L) | MatchCard.module.css .result, MatchTable.module.css .score |
| HomeAwayBadge (새, Surface white/blue-tint/dark/blue) | MatchCard, MatchTable 의 HOME 표시 |
| CompetitionTag (새, Surface 4종) | MatchCard, MatchTable 의 대회 줄 |
| TeamCrest (새, Type us/initial × Size 56/40/24) | 새 src/components/match/TeamCrest.tsx |
| MatchEmblem (새, Type 우리 팀/자리표시/대체 × Size 96/88/64/40/32, 원 받침 없음) 190:734 | NextMatchHero, MatchStrip 엠블럼 (2026-11-10 다시 그리기) |
| SponsorMarquee (Device × State 흐름/멈춤 × 버전) | src/components/home/SponsorMarquee.tsx |
| Section | src/components/ui/Section.tsx |
| NewsTabs (Device × 버전) | src/components/home/NewsTabs.tsx (+ Tabs.module.css) |
| NewsCard (Type large/row/vertical × 버전) | src/components/news/NewsCard.tsx |
| StandingsWidget (Device × State 개막 전/시즌 중 × 버전) | src/components/home/StandingsWidget.tsx |
| QuickLinks (Device × 버전) | src/components/home/QuickLinks.tsx |
| PlayersPreview (새 모양, Device pc/m) | src/components/home/PlayersPreview.tsx |
| PlayerCard (Type 촬영본/WELCOME/사진 없음 × 버전 × State × 면 검정/흰, 불린 '기록 줄' = 구분안 2) | src/components/player/PlayerCard.tsx |
| InstagramGrid (새, Device pc/m) | 새 src/components/home/InstagramGrid.tsx |
| MatchTable (Device) | src/components/match/MatchTable.tsx |
| MatchTable Row (새, Kind 머리/일정/일정 다음 경기/결과 × Device) 131:813 | src/components/match/MatchTable.tsx (행) |
| PlayerHero (새, Device × 합류/기록, 전폭 black-soft 면) 132:816 | src/app/(site)/players/[id] 머리 |
| StandingsTable (Device × 버전, 리디자인은 팀명 앞 TeamCrest 24) 132:2062 | src/components/match/StandingsTable.tsx |
| NewsBanner (버전 × Device × Count 여러 장/1장 × State) 145:782 | src/components/news/NewsBanner.tsx |
| VideoCard (새, Device × State, 9:16) 145:810 | NewsGrid vertical (구단영상, D-061) |
| SponsorTile (새, Type 네이밍/메인/후원사 × State) 146:712 | 스폰서 페이지 등급 타일 |
| AchievementStrip (새, Device, 연혁 성과 띠) 146:737 | 연혁 페이지 |
| NewsGallery | src/components/news/NewsGallery.tsx |
| ShareButton | src/components/news/ShareButton.tsx |
| article/Pager | src/app/(site)/news/[category]/[id]/page.tsx (article.module.css) |
| StaffCard (버전 × Device × Type 사진/사진 없음 × State) 145:881 | src/components/player/StaffCard.tsx |
| PostingBoard | src/components/posting/PostingBoard.tsx |
| PostingCard (버전 × Device × State) 145:847 | src/components/posting/PostingCard.tsx |
| MoreButton (버전 × State) 146:744 | src/components/ui/MoreButton.tsx |
| prose/Button | src/styles/prose.module.css .button |
| prose/Card | src/styles/prose.module.css .card |
| (관리자 부품: 04 단계 보류) | src/components/admin/** |

### NextMatchHero 가운데 정렬 (소유자 확정 2026-11-10, 기준 원본)

피그마: 섹션 `NextMatchHero 가운데 정렬 (2026-11-10 확정)` 200:20880. 레퍼런스: 인천유나이티드 'NEXT MATCH', 수원삼성 'NEXT / LAST MATCH' (위→아래 가운데). 이전 섹션 192:20163(A/B/C)은 '[보관]'.
상태 프레임: PC 엠블럼 있음(강원FS 12/12) 200:20882 / 없음(화성FS 방패 12/5) 200:20985 / 긴 이름(고양불스풋살클럽 12/26) 200:21089 / 다음 홈경기 없음(카드 숨김) 200:21193, 휴대폰 200:21267 / 200:21341 / 200:21416 / 200:21491. MatchStrip PC 200:21536 / 휴대폰 200:21621.

| NextMatchHero 카드 | PC 1280 | 휴대폰 390 | 토큰 / 스타일 |
|---|---|---|---|
| 자리 | 히어로(640) 사진 위 오른쪽 아래: 오른쪽 40, 아래 48 | 히어로(520) 사진 위, 문구 아래: 좌우 16, 아래 16 | - |
| 히어로 문구(D-036) | 원래 자리 그대로 | 그대로 | - |
| 카드 | 폭 456, 높이 내용(약 410), 안쪽 여백 32, 줄 간격 16, 모두 가운데 | 폭 358, 안쪽 여백 16, 줄 간격 12 | color/black, radius/l |
| 1 라벨 | 'NEXT HOME MATCH' | 같음 | kfa/label, color/yellow |
| 2 대진 줄 | [우리 칸 160 \| VS 칸 56 \| 상대 칸 160], 칸 사이 8(space/xs), 엠블럼 자리 160x96(아래 맞춤) | [128 \| 48 \| 128], 사이 8, 엠블럼 자리 128x64 | - |
| 엠블럼 | 96 (우리 = 흰 1px 바깥선, 상대 = 원본 선 없음, 없음 = 대체 방패) | 64 | MatchEmblem 190:734 |
| VS | 칸 가운데, 크게 Bold | 같음 | kfa/pc/vs (40 Bold) / kfa/m/vs (28 Bold), color/on-dark (새 스타일, Candidates 기록) |
| 3 팀 이름 | 각 엠블럼 아래 12(space/s), 가운데, 2줄까지, 줄임 없음, 낱말 경계 줄바꿈 | 같음 | kfa/pc/h3 (24 Bold) / kfa/m/h4 (16 Bold), color/on-dark |
| 4 대회명 | 예: '2026-27 FK1리그 / 5R' | 같음 | CompetitionTag Surface=dark |
| 5 날짜와 시각 | 예: '12월 12일 (토) 14:00' | 같음 | kfa/pc/match-date (28 Bold) / kfa/m/match-date (22 Bold), color/on-dark |
| 6 경기장 | '@은평다목적체육관' + HOME 배지, 간격 8 | 같음 | kfa/body-s color/on-dark-sub, HomeAwayBadge Surface=dark |
| 7 버튼 | [오시는 길] [경기일정] 각 160x44, 간격 8, 가운데 | 두 버튼 같은 폭(카드 폭 나눔), 높이 44 | 오시는 길: color/bg 바탕 + color/blue 글자, 경기일정: 1px color/on-dark 선 + 글자, radius/m, kfa/m/h4 |
| 파랑 사선 면 | 우리(왼쪽) 칸 뒤만: 카드 왼쪽 끝부터 우리 칸 오른쪽 + 12 까지, 엠블럼 위 12 부터 높이 120, 오른쪽 아래로 28 기울기 | 높이 80, 기울기 20, 여백 8 | color/blue, 그라데이션 없음, 파랑 1곳 |
| 큰 E 워터마크 | 없음(잘려서 깨진 선처럼 보여 뺌, 총괄 2026-11-10) | 없음 | - |
| 다음 홈경기 없음 | 카드 숨김, 문구 그대로 | 같음 | - |
| 빼는 것 | 카드 전체 링크, 카운트다운, 넘김 화살표, AWAY 배지, 원 받침 | 같음 | - |

| MatchStrip 칸 (수원식 가운데) | PC | 휴대폰 | 토큰 / 스타일 |
|---|---|---|---|
| 순서 | 칸 제목(노랑 라벨) → 대회 태그(바로 아래, 간격 4) → [홈 엠블럼 \| 스코어 또는 시각 \| 원정 엠블럼] + 각 아래 팀 이름 → 날짜 → @경기장 + HOME → (지난 경기만) 득점 줄 → 하이라이트/다시보기, 모두 가운데 | 같음 | 기존 MatchStrip 간격 그대로 |
| 엠블럼 | 56 | 40 | MatchEmblem (원 없음) |
| 홈팀 | 왼쪽(BR-002, 원정 경기는 상대가 왼쪽) | 같음 | - |
| 결과 배지 | 스코어 아래 가운데 | 같음 | ResultBadge |
| 팀 이름 | Bold, 2줄까지, 낱말 경계 | 같음 | kfa/m/h4 (16 Bold) |
| 경기장 | '@' + 이름 + HOME 배지(이름 옆) | 같음 | - |

### NextMatchHero C '와이드 매치데이 띠' (보관: 위 '가운데 정렬'로 대체됨)

피그마: 섹션 `NextMatchHero 다시 그리기 (2026-11-10)` 192:20163 의 'C 최종' 줄. A, B 는 '[보관: 선택 안 됨]'.
상태 프레임: PC 엠블럼 있음 197:20635 / 없음(방패) 197:20672 / 긴 이름 197:20709 / 다음 홈경기 없음 197:20886, 휴대폰 197:20746 / 197:20772 / 197:20798 / 197:20960.

| 부분 | PC 1280 | 휴대폰 390 | 토큰 / 스타일 |
|---|---|---|---|
| 띠 자리 | 히어로(640) 아래쪽 안, 전체 폭, 높이 208 고정, 히어로 아래 끝에 붙음 | 히어로(520) 아래쪽 안, 전체 폭, 높이 내용만큼(기본 274, 긴 이름 293), 아래 끝에 붙음 | 바탕 color/black |
| 히어로 문구(D-036) | 띠 때문에 위로: 히어로 안 y 200(원래 405), 문구 아래와 띠 위 사이 45 이상. 폭 맞춤 그대로 | 그대로(히어로 안 y 32, 높이 111, 띠와 103 떨어짐) | - |
| 사진 덮개 | 바꾸지 않음(Hero 의 그라데이션 그대로, 아래쪽 진한 덮개는 띠 뒤로 들어감) | 그대로 | color/overlay-* |
| 첫 화면 | TopBar 45 + Header 80 + Hero 640 = 765 ≤ 800 (1280x800 에서 띠 전체 + 버튼 2개 보임) | Header 60 + Hero 520 = 580 ≤ 약 660(Safari 390x844) | - |
| 홈 쪽 파랑 사선 면 | 꼭짓점 (0,0) (520,0) (460,208) (0,208), 엠블럼 사선 각도 | 팀 줄 뒤만: 위 폭 200, 아래 폭 172, 팀 줄 위아래 8 더 | color/blue (그라데이션 없음, 파랑 큰 면 1곳) |
| 사선 글자 | 'SEOUL EUNPYEONG FUTSAL TEAM', 사선 경계 따라 73도 | 없음 | kfa/caption, color/on-blue |
| 큰 E 워터마크 | 'E' 글자형, 외곽선 2px, 채움 없음, x 560 | 없음 | kfa/poster/score, color/line-on-dark |
| 홈 쪽 묶음 | x 40, y 24, 세로 간격 12: 라벨 줄(간격 12) + 팀 줄(간격 16) | 띠 안 세로 묶음(안쪽 여백 16, 간격 12): 라벨 줄(양끝) → 팀 줄(양끝) → 일시 → 버튼 | space/s, space/m |
| 라벨 'NEXT HOME MATCH' | 홈 쪽 묶음 맨 위 | 맨 위 왼쪽 | kfa/label, color/yellow |
| 대회 태그 | 라벨 옆 | 맨 위 오른쪽 | CompetitionTag (PC Surface=blue, 휴대폰 Surface=dark) |
| 우리 엠블럼 | 96, 이름 오른쪽 | 64, 이름 위 | MatchEmblem Type=우리 팀 (흰 1px 바깥선) |
| 우리 이름 | 폭 200, 2줄까지, 줄임 없음 | 폭 140, 가운데, 2줄까지 | kfa/pc/h3 (24 Bold) / kfa/m/h4 (16 Bold), color/on-blue |
| 가운데 일시 | 폭 290, x 500, 세로 가운데, 간격 4: 'VS' → 날짜 → 장소 + HOME | 'VS' 는 팀 사이, 일시는 팀 줄 아래 가운데(간격 4) | VS kfa/label on-dark-sub, 날짜 kfa/pc/match-date (28 Bold) / kfa/m/match-date (22 Bold) on-dark, 장소 kfa/body-s on-dark-sub, HomeAwayBadge Surface=dark |
| 상대 묶음 | 이름(폭 180, 오른쪽 맞춤, 2줄) + 엠블럼 96, 간격 16, 끝 x 1056 | 엠블럼 64 + 이름(폭 140, 가운데, 2줄) | kfa/pc/h3 / kfa/m/h4, color/on-dark |
| 상대 엠블럼 | 있으면 원본(선 없음), 없으면 방패 윤곽선 + 앞 2글자 | 같음 | MatchEmblem Type=상대 / Type=대체 |
| 버튼 | 세로 2개 160x44, 간격 8, x 1080(오른쪽 여백 40), 세로 가운데 | 가로 2개 같은 폭, 높이 44, 간격 8 | [오시는 길] color/bg 바탕 + color/blue 글자, [경기일정] 1px color/on-dark 선 + on-dark 글자, radius/m, 글자 kfa/m/h4 |
| 다음 홈경기 없음 | 띠 숨김, 문구 원래 자리(y 405) | 띠 숨김 | - |
| 빼는 것 | 카드 전체 링크, 카운트다운, AWAY 배지, 원 받침 | 같음 | - |

| MatchEmblem 190:734 | 크기(높이) | 모양 | 토큰 |
|---|---|---|---|
| Type=우리 팀 | 96 / 88 / 64 / 56 / 40 / 32, 폭 = 높이 x 600/829 | public/brand/emblem.png 원본 그대로(흰 바탕 사각형), 검정 바탕에서 테두리가 보이게 1px 바깥선 | 선 color/on-dark 1px OUTSIDE |
| Type=상대 | 같은 높이, 폭은 원본 비율(강원 256x264) | public/crests/*.png 투명 원본, 선 없음 | - |
| Type=대체 | 같은 높이, 폭 = 높이 x 0.84 | 방패 윤곽선(64 이상 2px, 그 밑 1.5px) + 팀 이름 앞 2글자 가운데 | 선과 글자 color/on-dark, 글자 96, 88 kfa/pc/h3, 64 kfa/m/h4, 56, 40 kfa/label, 32 kfa/caption |
| Type=자리표시 | 정사각 | 점선 상자(원본 받기 전 시안용, 사이트에는 안 씀) | color/on-dark-sub |
| Size=24 (표 전용, 2026-11-10 추가) | 우리 팀 211:24754 (17x24) / 대체 211:24756 (20x24) / 상대 211:24759 (폭은 원본 비율, 기본 23x24) | 경기일정/결과 표(MatchTable Row 131:813), 리그순위 표(StandingsTable 132:2062)의 팀 칸. 두 부품의 TeamCrest 24 를 이것으로 바꿨다. 흰 바탕이라 색이 다르다. | 우리 팀 바깥선 color/line 1px. 대체 방패 선 color/text-sub 1px, 글자 color/text |
| 대체 글자 기준 | 96, 88, 64, 56, 40, 32: 앞 2글자 / 24: 앞 1글자 | 2글자는 24 칸(방패 안쪽 약 16)에 들어가지 않아 1글자로 줄였다. 영문으로 시작하면 첫 대문자 1자(예: LBFS → L). 글자 크기는 24 에서 kfa/10 Bold, 가운데 정렬 | 56 글자 스타일이 빠져 있던 것을 kfa/14 Bold/lh auto 로 연결 |

상대 엠블럼 원본(투명 PNG, 기능 863f54b `public/crests/`): 화성FS hwaseong, 고양불스 goyang, 용인지솔FS yongin, 노원제너FS nowon, 전주시민 jeonju, 경기LBFS lbfs, 강원FS gangwon. 원본이 없는 팀(지금 인천ZD스포츠, 제주서귀포)은 대체 방패를 쓴다. 피그마의 03 Screens 표 행 284곳, 가운데 정렬 카드, MatchStrip 의 상대를 모두 원본으로 바꿨다. '엠블럼 없음' 상태 프레임(200:20985 / 200:21341)은 대체 방패 예시를 남기려고 상대를 인천ZD스포츠로 바꿨다.

| MatchStrip 3칸 카드 | PC | 휴대폰 | 비고 |
|---|---|---|---|
| 엠블럼 | 56 (원 없음, 대체 방패도 56) | 40 | MatchEmblem |
| 팀 이름 | Bold, 2줄까지, 낱말 경계 줄바꿈 | 같음 | kfa/m/h4 (16 Bold) |
| 경기장 줄 | 대진 바로 아래 가운데(HOME 배지는 이름 옆) | 같음 | 소유자 2026-11-10 |
| 프레임 | 194:20766 (비교: 날짜, 득점, 버튼도 가운데 198:17) | 194:20932 (비교 198:117) | 나머지(라벨, 스코어, 버튼)는 기존 MatchStrip 그대로, 비교안은 소유자가 고름 |

### UX 상태 표 (기능 3~6단계용, 2026-11-10)

피그마 섹션 `UX 상태 (기능 3~6단계용, 2026-11-10)` 208:21342 (03 Screens — Site). 새 시각 요소 없이 기존 부품만 썼다. 빈 상자는 경기일정 '없음'의 bg-soft 상자(136:10032)를 그대로 복제했다. 문구는 코드의 관리자 수정 글(`src/lib/content/fields.ts`) 기본값을 따랐고, 코드에 없는 것은 '제안'으로 표시했다.

**모든 페이지 공통**

| 상태 | 시안 | 규칙 |
| --- | --- | --- |
| 불러오는 중 | PC 208:21343 / 휴대폰 208:21408 | 머리, PageHeader, 탭은 바로 보이고 본문 자리에만 빈 상자 '불러오는 중입니다.'(링크 없음)를 둔다. 뼈대 화면이나 빙글이는 새로 만들지 않는다. 지금 코드에는 `loading.tsx` 가 없다(서버에서 다 그린 뒤 보냄). |
| 오류 | PC 208:21444 / 휴대폰 208:21509 | 같은 빈 상자에 '(무엇) 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'와 링크 '다시 시도 →'(같은 주소 새로 불러오기)를 둔다. 머리와 탭은 남겨 다른 페이지로 갈 수 있게 한다. 지금 코드에는 `(site)/error.tsx` 가 없다. |
| 없는 글이나 선수 | 404 '없는 글' PC 158:19896 / 휴대폰 158:20214 | 기존 시안 그대로. |
| 초점 | 각 부품의 State=초점 변형 + 홈 예시 126:9950 | 고리는 2px color/blue, 바깥 간격 2(코드 outline 2px + offset 2). 순서는 공통 머리(로고 → 메뉴 → MD스토어 → 사이트맵) → PageHeader 탭(왼쪽→오른쪽) → 본문 → 푸터. 제안: 맨 앞 '본문 바로가기' 링크(초점 받을 때만 보임). 지금 코드에 없다. |
| 휴대폰 가로 넘침 | 밀린 뒤 209:3222 / 비교(밀기 전) 209:3588 | PageHeader 탭 줄은 옆으로 넘치게 두고, 처음 열 때 고른 탭이 보이게 옆으로만 민다. 가려진 쪽 끝은 32 흐림(코드 `ScrollRow` 그대로). 포스팅 분류 탭과 출처 칩은 줄바꿈하고 가운데 정렬한다(코드 그대로). 원래 시안 150:17391 의 분류 탭 한 줄 잘림은 코드가 맞다. |

**페이지별**

| 페이지 | 빈 상태, 데이터 없음, 이미지 없음 | 긴 이름과 긴 제목 | 휴대폰 넘침 | 초점 순서(본문) |
| --- | --- | --- | --- | --- |
| 경기일정 | 136:9977 / 136:10528 (schedule.empty + '경기결과 보기 →'). 상대 엠블럼 없음은 대체 방패(MatchEmblem). | 결과와 같은 행 부품. 209:1503 / 209:2211 참고 | 탭 3개라 넘침 없음 | 탭 → 행마다 (하이라이트 → 다시보기) → 경기결과 보기 |
| 경기결과 | 136:11324 / 136:12108 (results.empty) | 209:1503 / 209:2211: 팀 이름과 경기장은 칸 안에서 낱말 경계로 줄바꿈하고 줄임은 없다. 점수 칸은 고정이다. | 같음 | 탭 → 대회별 행 (하이라이트 → 다시보기) |
| 리그순위 | 개막 전 138:13329 / 138:14414 (0경기, 가나다순). 팀이 없으면 standings.empty 빈 상자. | 휴대폰 긴 팀명은 낱말 경계 줄바꿈(StandingsTable 리디자인) | 표는 넘치지 않게 칸을 줄임 | 탭 → 지난 시즌 링크 |
| 선수 목록 | 없음 208:21545 / 208:21649 (제안 '등록된 선수가 없습니다.' 지금 코드는 빈 화면). 사진 없음은 PlayerCard Type=사진 없음(209:2827 / 209:3039 둘째 카드). | 209:2827 / 209:3039: 이름은 카드 폭 안에서 낱말 경계로 줄바꿈. PlayerCard 부품 고침(아래 기록). | 포지션 칩 5개는 한 줄에 들어감 | 탭 → 포지션 칩 → 카드(포지션 순, 왼쪽→오른쪽) |
| 선수 상세 | 사진 없음은 PlayerHero 합류형과 같은 면, 기록 없음은 합류 줄(137:13033 / 137:13313). 없는 선수는 404. | 이름은 display 2줄까지 | 없음 | 탭 → 관련 소식 → 이전 선수 / 선수 목록 / 다음 선수 |
| 구단소식 (전체, 분류) | 분류에 글 없음 208:21724 / 208:21812 (news.empty + '구단소식 전체 보기 →'). 배너 0장이면 배너 줄을 숨긴다. 사진 없는 카드는 썸네일 자리에 엠블럼 대체 그림(코드 EmblemFallback). | NewsCard 제목은 2줄에서 줄임(…, 코드 line-clamp 2), 배너 제목은 3줄 | 탭 6개 넘침, 209:3222 규칙 | 탭 → 배너(이전/다음) → 카드 → 더 보기(누르면 새로 보인 첫 카드로 초점, 코드 그대로) |
| 기사 상세 | 사진 없음 209:1346 / 209:1439: 사진 칸을 통째로 뺀다(빈 칸이나 대체 그림 없음, BR-015). | 같은 프레임: h1 은 줄임 없이 여러 줄, 이전/다음 글 제목은 줄바꿈 | 탭 넘침 같음 | 공유 → 사진 크게 보기 → 본문 링크 → 다음 글 → 이전 글 → 목록. 크게 보기는 닫기 버튼으로 초점, 닫으면 연 버튼으로 돌아감(코드 그대로) |
| 구단영상 | 208:21724 / 208:21812 와 같은 빈 상자 | VideoCard 제목 2줄 줄임 | 같음 | 탭 → 카드 → 더 보기 |
| 포스팅 | 고른 분류나 출처에 글 없음 208:21871 / 208:21985 (posting.empty + '전체 보기 →'). 분류 탭과 칩은 남긴다. | PostingCard 제목 2줄 줄임 | 분류 탭과 칩은 줄바꿈 가운데 | 탭 → 분류 탭 → 출처 칩 → 카드 → 더 보기 |
| 구단소개, 연혁, 엠블럼/유니폼, 오시는 길 | 내용이 없는 블록은 숨김(코드 그대로). 오시는 길 지도를 못 불러오면 주소 상자(코드 VenueMap fallback), 값이 없으면 '준비 중'. | 연혁 한 줄 글은 줄바꿈 | 탭 4개, 휴대폰에서 넘치면 209:3222 규칙 | 탭 → 본문 링크 → (엠블럼) 엠블럼/유니폼 탭 |
| 코칭스태프 | 없음 208:22070 / 208:22158 (제안. 지금 코드는 섹션째 숨겨 빈 화면). 사진 없음은 StaffCard Type=사진 없음(155:18888 / 155:19181). | 직함과 이름은 줄바꿈 | 탭 2개 | 탭 → 카드 순서 |
| 스폰서 | 없음 208:22217 / 208:22306 (제안 '등록된 스폰서가 없습니다.' + 스폰서십 문의 상자는 남김) | 이름이 길면 SponsorTile 아래 이름 줄바꿈 | 없음 | 로고(링크) 등급 순 → 스폰서십 문의 버튼 |
| 문의 | 값이 없으면 '준비 중'(코드 그대로) | 없음 | 없음 | 메일 → 전화 |
| 사이트맵 | 고정 | 없음 | 없음 | 묶음 순서, 위→아래 |
| 404 | 고정 | 없음 | 없음 | 구단소식 목록 → 메인으로 |

'제안'은 시안만 있고 코드에는 없는 동작이다. 넣을지는 기능 세션과 총괄이 정한다.

### NextMatchHero v2 ② 좌우 분할 (소유자 확정 2026-11-11, 기준 원본)

피그마 섹션 223:24706. 확정 프레임: PC 223:24911, PC 제천FS 대체 223:24989, PC 긴 이름 227:187, 휴대폰 223:25069, 휴대폰 긴 이름 227:263, 휴대폰 제천FS 227:310. ①, ③ 은 '[보관: 선택 안 됨]'. 캡처는 docs/figma-captures/nmh-v2/2-*.jpg. 아래에 없는 값(버튼, 대회 태그, 날짜, 장소 + HOME, 가운데 정렬 순서)은 위 '가운데 정렬' 표 그대로다.

| 부분 | PC (카드 456) | 휴대폰 (카드 358) | 토큰 |
|---|---|---|---|
| 카드 | 검정, 라운드 16, 안쪽 여백 32, 줄 간격 16. 히어로 아래 끝에서 32 위에 붙인다(아래 맞춤) | 안쪽 여백 16, 줄 간격 12. 화면 580 에서 12 위에 아래 맞춤(카드와 버튼이 첫 화면 안) | color/black, radius/l |
| 파랑 반쪽 | 카드 왼쪽, 전체 높이, 카드 라운드로 잘림. 경계 사선 위 x = 50% + 16, 아래 x = 50% - 40(VS 가운데를 지남) | 위 50% + 10, 아래 50% - 30 | color/blue, 그라데이션 없음, 카드에 딸린 면이라 '떠 있는 박스'가 아님 |
| 라벨 NEXT HOME MATCH | 20 Bold (12 에서 키움, 소유자 2026-11-11 '작게 두지 말고') | 16 Bold | kfa/m/h3 / kfa/m/h4, color/yellow |
| 대진 줄 | [160 \| 56 \| 160] 사이 8, 엠블럼 칸 높이 112 | [135 \| 40 \| 135] 사이 8, 칸 높이 72 | - |
| 우리 엠블럼 | MatchEmblem 우리 팀 112 (88x112) | 72 (56x72) | emblem-mark.png, 테두리 없음, 바탕 없음 |
| 상대 엠블럼 | MatchEmblem 상대 112 (원본 비율, 높이 112) / 원본 없으면 대체 112 | 72 | public/crests/*.png / 방패 선 color/on-dark |
| 팀 이름 | 24 Bold, 2줄까지, 낱말 경계 줄바꿈(word-break: keep-all) | 20 Bold (16 에서 키움) | kfa/pc/h3 / kfa/m/h3, color/on-dark |
| VS | 40 Bold | 28 Bold | kfa/pc/vs / kfa/m/vs, color/on-dark |

**좁은 휴대폰(390 미만, 기능 실측 2026-11-11: 320/360/375 에서 우리 이름 2줄, 히어로 602)**: 팀 이름 kfa/m/h4 16 Bold, 엠블럼 칸 64 로 줄인다(라벨, VS, 날짜, 버튼은 그대로). 360 에서는 칸 [120 | 40 | 120] 에 '서울은평 덴포스' 16 Bold(약 108)가 한 줄로 들어간다. 320 은 칸 100 이라 두 줄이 될 수 있는데, 그대로 두고 첫 화면을 조금 넘는 것은 받아들인다(카드 아래 맞춤, 버튼은 스크롤 한 번).

**PC 확정 추가 (소유자 2026-11-13: A 세로 압축 + C 한 줄 헤더 + D 넓은 내용 폭, 휴대폰과 메가메뉴 위치는 그대로)**
- A 카드(PC): 456 폭 그대로, 안쪽 여백 위아래 20(space/l) 좌우 32, 줄 간격 12(space/s), 엠블럼과 이름 사이 8(space/xs). 순서 라벨 → 대진 → 날짜 → [대회 태그 · 간격 12 · @장소 + HOME] 한 줄 → 버튼. 글자와 엠블럼 크기 그대로. 높이 368(긴 이름 2줄 397). 사선 +16/-40, (다) 질감, 아래 32 그대로.
- C 헤더: Header 39:36 에 버전=한 줄 (C) Desktop 9변형(247:2 등). 윗줄(TopBar) 없이 메뉴 오른쪽에 구분선(1x20, color/line-on-dark, 앞뒤 space/xl 24) + 인스타, MD스토어, 사이트맵(사이 space/m 16). 높이 80(두 줄 124 에서 44 줄어 히어로가 위로).
- D 내용 폭: 피그마 변수 layout/container-wide 1480, layout/gutter-wide 40(1281px 이상, 내용 최대 1400). 1280 이하는 layout/container 1200, layout/gutter 20 그대로. 1440 내용 1360, 1720 내용 1400.
- 확정 프레임: 223:24911 / 223:24989 / 227:187(A + C), 기준 화면 섹션 홈 머리 + 히어로 + 경기 띠 PC 1280 247:3407 / 1440 247:3510 / 1720 247:3717.

**우리 엠블럼 규칙(모든 곳 공통, 17ddf61 의 흰 바탕을 대신함)**: public/brand/emblem-mark.png(SINCE 2012 줄 없음)를 테두리와 바탕 없이 그대로 쓴다. 깃발의 검은 외곽선이 어두운 면, 파랑 면, 흰 면 모두에서 경계가 된다. MatchEmblem 190:734 우리 팀 9크기(112, 96, 88, 72, 64, 56, 40, 32, 24)를 이 파일로 바꾸고 바깥선을 지웠다. 그래서 경기 3칸 띠(200:21536 / 200:21621)와 경기표, 순위표 24 에도 그대로 이어진다. 파랑 반쪽은 이 카드에만 쓰고, 띠와 표 바탕은 지금 그대로다.

## 기능 세션 결정 (총괄이 합칠 때 DECISION_LOG 로 옮겨 주세요)

- 새 의존성 없음: 피그마 타입은 `figma-plugin/src/figma.d.ts`(쓰는 API 만), 플러그인 묶기는 저장소 typescript 로(`scripts/figma/plugin-bundle.ts`). `@figma/plugin-typings`/esbuild 는 DEPENDENCY_POLICY 승인 대상이라 넣지 않았다.
- 이미지 중계 `GET /api/figma/image?src=…` 추가: 플러그인 화면 출처가 null 이라 CORS 가 필요하고, networkAccess 가 eunpyeong-fs.com 하나라 Supabase 저장소에 직접 닿지 못한다. 허용 목록은 사이트 public 파일 + Supabase 공개 `media` 버킷만(SSRF 방지), PNG/JPEG/GIF, 10MB.
- `figma-plugin/dist/` 는 커밋한다 (소유자가 빌드 없이 설치). 테스트가 최신인지 확인.
- 피그마 변수 이름 = 토큰 경로(`color/blue`), 컬렉션 = Color/Space/Radius/Layout/Font, 모드 Desktop(+휴대폰 값이 있는 컬렉션만 Mobile). 플러그인은 앞부분을 뺀 이름(`blue`)도 같은 변수로 읽는다.
- 글꼴 토큰은 글꼴 파일 안 이름 `KFAGothic TTF` (피그마 변수에는 첫 글꼴만, 비교도 첫 글꼴만).
- 두 공개 API(`/api/figma/feed`, `/api/figma/image`)는 `Access-Control-Allow-Origin: *` — SECURITY_GUIDELINES 5항('`*` 금지')의 예외. 피그마 플러그인 화면은 출처가 `null` 이라 특정 오리진을 적을 수 없고, 둘 다 쿠키/로그인 없는 공개 읽기 전용이다. 자격 증명 헤더(`Access-Control-Allow-Credentials`)는 보내지 않는다. 다른 API 에는 쓰지 않는다.
- 'KFA 글꼴 적용' 버튼(총괄 전달, 소유자 결정 "기본적으로 KFA 폰트로"): 디자인 세션이 원격 작업에서 쓴 임시 글꼴 Noto Sans KR 을 소유자 데스크톱에서 KFAGothic TTF 로 바꾼다 (Medium 이하 Regular, SemiBold 이상 Bold). Regular/Bold 둘 중 하나라도 설치되어 있지 않으면 아무것도 바꾸지 않는다. 글꼴 파일은 저장소/플러그인에 넣지 않는다(KFA 라이선스, I-007).
- 토큰 가져오기는 별칭(다른 변수 참조) 값을 덮지 않는다 — 참조 값이 토큰과 다르면 알려만 준다.

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
- 2026-11-09 디자인: 1단계 01 Foundations — 페이지 6개(00~05) 생성, 변수 컬렉션 `Color`(19개, 모드 Value) · `Radius`(s 6, m 10) · `Layout`(container/gutter/header-h/section-gap, 모드 Desktop/Mobile) 값은 tokens.css 그대로, 이름은 약속 A 경로, WEB 코드 문법 `var(--…)`. 글꼴 스타일 `kfa/<크기> Regular|Bold` 34개. 견본 시트 노드 3:69 (페이지 3:2), 스크린샷 확인. 참고: ① tokens.css 에 간격(space) 토큰이 없어 `Space` 컬렉션은 만들지 않음(값 발명 금지) — tokens.json 에 생기면 추가. ② KFA고딕은 피그마 글꼴 목록에 없음(사이트 로컬 글꼴, Pro 플랜은 팀 글꼴 업로드 불가) → CSS 대체 순서의 `Noto Sans KR` 로 스타일을 만듦. 소유자가 데스크톱 앱에 KFA고딕을 설치하면 스타일 글꼴만 바꾸면 된다(총괄 확인 필요).
- 2026-11-09 디자인: 2단계 02 Components (사이트 부품) — 실제 사이트(eunpyeong-fs.com)를 Playwright 로 렌더한 DOM 을 html_to_figma 로 옮겨 1:1 재현, 컴포넌트로 변환. 색은 Color 변수에 자동 결합(채움/선 584 중 562, 나머지 22개는 코드 CSS 의 rgba 리터럴 오버레이로 토큰에 없음), 글자는 kfa 스타일, 라운드 6/10 은 radius 변수. 세트: Header(Active 없음/구단/구단소식/선수단/경기/스폰서/문의 × Device) 39:36, TopBar 39:35(휴대폰은 사이트에서 숨김), Hero 39:37, Footer 39:38, PageHeader(Default/Compact × Device) 39:39, MatchTable 39:40, MatchCard(Result/Upcoming) 39:41 외 단일 18종. 페이지 3:3, 스크린샷 확인.
- 2026-11-09 디자인: 3단계 03 Screens — Site — 공개 페이지 25개 × PC 1280 / Mobile 390 = 프레임 50개 (페이지 3:4, PC 47:2~71:2, Mobile 72:2~96:2). 사이트 캡처와 스크린샷 대조 확인. TopBar/Header/Footer 는 02 컴포넌트 인스턴스. 남은 차이: ① 영상 글의 인스타그램/유튜브 임베드와 오시는 길 네이버 지도는 iframe/스크립트라 빈 자리 상자 ② 글꼴은 Noto Sans KR 대체. 변환기 보정: 표 셀 max-width:0(말줄임) 폭, 휴대폰 홈 가로 스크롤 카드 폭을 사이트 값으로 맞춤.
- 2026-11-09 디자인: 5단계 05 Posters — 템플릿 컴포넌트 8개 (페이지 3:6): `MATCH DAY / 1080x1350` 98:2, `경기결과 / 1080x1350` 98:34, `WELCOME / 1080x1350` 98:64, `GOOD LUCK / 1080x1350` 98:81, 같은 이름의 `/ 1080x1080` 98:95, 98:127, 98:157, 98:174. 레이어 이름은 기능 세션이 확정한 B-2 필드 그대로(`#clubName` `#clubNameEn` `#clubEmblem` `#clubUrl` `#competition` `#round` `#matchLabel` `#homeTeam` `#awayTeam` `#homeAway` `#date` `#time` `#venue` `#score` `#resultLabel` `#scorers` `#playerName` `#playerNumber` `#positionLabel` `#playerPhoto` `#sponsorLogo`×5). 이미지 필드는 사각형(채우기 color/bg-soft). 색은 Color 변수만. 형식은 구단 인스타 WELCOME/GOOD LUCK 이미지를 참고. 스크린샷 확인. 참고: 경기결과 배지는 승(color/win) 색으로 만들어 둠 — 무/패 색 자동 전환은 플러그인 쪽 판단(기능 세션).
- 2026-11-09 디자인: 총괄 멈춤 지시 받음 (02:58 발송, 이 세션에는 03:40 도착 — 그 전에 03 Screens Site 와 05 Posters, 00 안내는 이미 만들어 둠). 지시에 따라 04 Screens Admin 은 시작 전에 중단(관리자 화면 구조 명세만 세션 임시 폴더에 있음, 파일에는 없음). 이미 만든 03/05/00 은 지우지 않고 그대로 둠 — 방향 확정 뒤 유지/삭제/수정은 총괄 판단. 01 Foundations, 02 Components 는 완료 상태. 다음 지시 대기.
- 2026-11-09 디자인: 글꼴 결정(KFA고딕 하나) 반영 — `listAvailableFontsAsync` 에 'KFAGothic TTF' 없음(피그마 클라우드는 이 컨테이너에서 글꼴을 설치할 수 없고, Pro 플랜은 팀 글꼴 업로드 불가). 그래서 Noto Sans KR Regular/Bold 두 굵기만 임시로 쓰고, 파일 안의 모든 글자(02 365, 03 2460, 05 76, 00, 01 구간)를 글꼴 스타일에 연결함(스타일 없는 글자 0, Black/Medium 굵기 제거). 사이트 줄간격/자간을 지키려고 스타일 이름에 `/lh 숫자`, `/ls 숫자` 꼬리를 붙인 변형 스타일이 있음(총 112개, 모두 kfa/ 로 시작). 이전 단계에서 줄간격을 덮어써 스타일 연결이 풀렸던 문제도 이것으로 바로잡음. 소유자 지시 "KFA고딕 받아서 진행": 저장소 src/fonts 의 woff2 를 TTF 로 바꿔(패밀리 'KFAGothic TTF') 소유자에게 전달 — 소유자 PC 에 설치하고 피그마 데스크톱 앱에서 이 파일을 연 뒤 알려 주면 112개 스타일의 글꼴을 한 번에 KFAGothic TTF 로 바꾼다(또는 플러그인 'KFA 글꼴 적용'). TTF 는 사용 조건 미확인(I-007)이라 저장소에 커밋하지 않음.
- 2026-11-09 디자인: 총괄 결정 반영 — 기존 결과물 모두 유지. 03 페이지의 50프레임을 섹션 `현재 사이트 (2026-11-09)`(104:3931, 기준선)로 묶고, 그 오른쪽에 빈 섹션 `리디자인 시안`(104:3932)을 만들어 둠. 02 부품 25종, 부품 지도, 05 포스터, 00 안내 유지. 04 Admin 보류. 리디자인 기준(FIGMA_SYNC.md) 대기.
- 2026-11-09 기능: 1단계 토큰 — `scripts/figma/tokens.ts`(변환/비교 순수 함수) + `build-tokens.ts`(`npm run figma:tokens`, `--check`) + `check-figma.ts`(`npm run figma:check <내보낸 JSON>`) → `design/tokens.json` 생성, 테스트 `tests/figma-tokens.test.ts`. tokens.css 에 `--space-*` 가 없어 `space` 그룹은 비어 있음(만들지 않음). 글꼴 이름은 파일 안 이름 `KFAGothic TTF`.
- 2026-11-09 기능: 2단계 포스터 데이터 — `GET /api/figma/feed`(`src/app/api/figma/feed/route.ts`, 변환 `src/lib/figma-feed.ts`, 테스트 `tests/figma-feed.test.ts`). 응답 모양/필드 이름/템플릿 규칙을 위 B-1~B-3 표로 확정. 로컬 정적 데이터 모드 빌드/응답 확인. **운영 배포 전이라 eunpyeong-fs.com 에는 아직 없음 — 총괄 배포 필요.**
- 2026-11-09 기능: 3단계 피그마 플러그인 — `figma-plugin/`(manifest, `src/code.ts`, `src/poster.ts`, `src/variables.ts`, `ui.html`, `README.md` 빌드/설치) + 이미지 중계 `/api/figma/image`. `npm run figma:plugin` 으로 `dist/` 생성, 테스트 `tests/figma-plugin.test.ts`. 가짜 피그마 API 로 dist/code.js 를 돌려 가져오기(26개)→다시 가져오기(그대로 26)→내보내기→`figma:check` 차이 0, 포스터 채우기(템플릿 그대로, 복제본 오른쪽) 확인. 실제 피그마 앱 실행은 소유자/총괄 몫(데스크톱 앱 필요).
- 2026-11-09 기능: 4단계 — 토큰 어긋남 검사는 1단계에 포함(`design/figma-variables.json` 이 생기면 `npm test` 가 비교, `npm run figma:check <파일>`). Code Connect 확인 결과는 위 'Code Connect 확인'. **멈춤/총괄 확인 필요: ① `/api/figma/feed`, `/api/figma/image` 운영 배포 ② 디자인 세션 템플릿 레이어 이름을 B-2 표에 맞춤 ③ 위 '기능 세션 결정' DECISION_LOG 반영.**
- 2026-11-09 총괄: 소유자 방향 변경 — 화면은 프로구단급 리디자인 시안 (D-067). 디자인 세션에 Foundations/Components 까지만 하고 대기하라고 전달. 레퍼런스 조사 시작.
- 2026-11-09 기능: 총괄 검토 9건 반영 — ① 루트 .gitignore 예외로 `figma-plugin/dist` 커밋 ② 동명이인: 작별엔 명단 정보 안 붙임, 영입은 제목 포지션 일치 시만, 열쇠는 소식 id (테스트 4개 추가) ③ 이미지 주소 잘못된 %-인코딩 → 400 ④ tokens.css 마지막 선언 세미콜론 없어도 읽음 ⑤ 토큰 가져오기 별칭 덮지 않음 ⑥ B-2 표에서 `isStaff` 빼고 불리언은 레이어용 아님 명시 ⑦ `npm run lint` 에 플러그인 타입 검사 ⑧ CORS `*` 예외를 SECURITY_GUIDELINES/기능 세션 결정에 기록 ⑨ 플러그인 'KFA 글꼴 적용' 버튼 + README 설치 안내.
- 2026-11-09 총괄: 기능 브랜치 검토(9건 수정) 후 합침(8be8d50). 운영 배포 dpl_B2SXftVcpb7RqwB9j51rzrjoLy9X 로 `/api/figma/feed`, `/api/figma/image` 공개(소유자 승인). 운영 피드 확인: 다음 경기 노원제너FS 11/15, 영입 10, 작별 5, 스폰서 10, 개인정보 없음.
- 2026-11-09 총괄: '리디자인 기준' 확정(위 섹션). 디자인 세션에 홈 PC 1280 / 휴대폰 390 시안 시작 지시 — 끝나면 보고하고 멈춤.
- 2026-11-09 디자인: 리디자인 기준 1차(홈) — 01: `Candidates` 컬렉션(Desktop/Mobile, 후보 표 값 그대로 27개: color/on-blue, overlay 4, win/draw/loss-strong, emblem 3, space 9, radius/l, pill, layout 4) + `Font` 컬렉션 font/family='KFAGothic TTF', 글자 단계 kfa/pc/*, kfa/m/* 각 10 + kfa/badge, body-s, caption, label, 견본 110:55. 02: 섹션 `리디자인 (D-067)` 111:2 에 새 부품 TeamCrest 111:15, ResultBadge 111:28, HomeAwayBadge 111:37, CompetitionTag 111:46, NextMatchHero 112:194(8변형), MatchStrip 114:602(8변형), MegaMenu 115:729, PlayersPreview 118:776, InstagramGrid 119:720, 기존 세트에 `버전=리디자인` 변형 추가: Header 39:36, Hero 39:37, Footer 39:38, MatchCard 113:141, SponsorMarquee 119:893, NewsTabs 119:894, NewsCard 116:736, StandingsWidget 119:895, PlayerCard 118:654, QuickLinks 119:896(03 현재 사이트 인스턴스 125개 연결 유지 확인). 03 섹션 `리디자인 시안` 104:3932: PC 1280 — 개막 전 121:3931, 시즌 중 (가득) 121:4619, 휴식기 121:5191, 일부 121:5837, 없음 122:6094, 메뉴 열림 122:6374, 최대 길이 122:6487 / Mobile 390 — 개막 전 124:6888, 시즌 중 (가득) 124:7524, 휴식기 124:8044, 일부 124:8638, 없음 124:9149, 메뉴 열림 124:9397, 최대 길이 124:9449. 데이터는 공개 피드와 사이트 화면(지난 경기 8/25 컵 3:3 다시보기만, 다음 11/15 1R, 11/21 2R 원정, 다음 홈 12/5 화성FS, 2025-26 5위 2승 3무 10패 9점). 주석 115개(프레임 오른쪽 노랑 바탕). 감사: 맨 색/간격/라운드 0, 스타일 없는 글자 0(최대 길이 히어로 4개만 예외), 글꼴 Noto Sans KR Regular/Bold 만, 중간점 0. get_screenshot 확인. 총괄 보고 후 멈춤.
- 2026-11-09 디자인: 총괄 검토 반영 — ① 초점 변형 18개(State 가 있는 세트는 State=초점, 없는 세트는 새 속성 상태=초점): NextMatchHero, Header, SponsorMarquee(멈춤 버튼), MatchCard(영상 버튼), NewsTabs, NewsCard, PlayerCard, QuickLinks. 2px 선, 바깥 2px 간격, 밝은 면 blue / 어두운 면 on-dark / 파랑 면 on-blue. 초점 예시 한 장 126:9950(PC 개막 전 프레임 아래). ② 순위 위젯 숫자 칸 축소(PC 22, 휴대폰 32), PC 는 넘치는 팀 이름을 낱말 경계에서 줄바꿈(서울은평 / 덴포스, 고양불스 / 풋살클럽, 전주시민 / 풋살구단), 휴대폰은 한 줄. 기본 프레임 12개의 여러 줄 글자 27곳과 부품 기본값을 낱말 경계로 줄바꿈(사이트 keep-all 과 같게). ③ 흰 섹션이 이어지는 곳(INSTAGRAM → 바로가기, 휴대폰 리그 순위 → 구단 소식)은 뒤 섹션 위 여백 0 으로 layout/section-gap 한 번만. 인스턴스 396개 연결 정상, 주석 위치 다시 맞춤, get_screenshot 확인.
- 2026-11-09 디자인: 소유자 "KFA고딕 설치됨, 반영" — 원격 use_figma 환경의 글꼴 목록(1,938 패밀리, 구글 글꼴만)에 'KFAGothic TTF' 없음, loadFontAsync 도 실패. 원격 작업은 소유자 PC 의 로컬 글꼴을 쓸 수 없다. 반영은 소유자 PC 피그마 데스크톱에서 플러그인 'KFA 글꼴 적용'으로 한다(figma-plugin/README.md). 모든 글자가 kfa/ 스타일에 연결돼 있어 버튼 한 번에 바뀐다. 적용 뒤 원격에서 스타일 글꼴 이름으로 결과를 확인할 수 있다(화면 렌더는 원격에서 대체 글꼴).
- 2026-11-09 총괄: 소유자 홈 1차 검토 — NextMatchHero 카운트다운 빼고 나머지(경기 3칸 띠, 스폰서 띠 위치, 소식 큰 카드+목록, 순위 7열, 선수단 검정 면, INSTAGRAM, 하위 페이지 머리 검정 면) **모두 승인**. 기준의 카운트다운 부분 삭제.
- 2026-11-09 디자인: 카운트다운 제거 — NextMatchHero 112:194 상태를 있음/없음(+초점)만 남김(남은 시간/당일/킥오프 지남 변형 삭제). 홈 14프레임의 인스턴스를 State=있음으로 바꾸고 히어로 안 위치 다시 맞춤, 관련 [변경] 주석 정리. 휴대폰 히어로 높이 안에 들어감 확인.
- 2026-11-09 디자인: 리디자인 2차(하위 페이지) — 02: PageHeader 39:39 에 버전=리디자인(검정 면 + 사선, Default/Compact × pc/m) 130:654, 130:668, 130:682, 130:696, Chip 130:716, TeamSwitcher 130:725(02 한 장만), MatchTable Row 131:813, PlayerHero 132:816, StandingsTable 리디자인 132:2062, PlayerCard 면=흰, Header 활성 메뉴 리디자인 변형 133:2~133:102. 03 섹션 `리디자인 시안 2차` 136:9513 (20프레임): 경기일정 PC 가득 136:9514, 없음 136:9977 / M 가득 136:10098, 없음 136:10528. 경기결과 PC 가득 136:10620, 없음 136:11324 / M 가득 136:11445, 없음 136:12108. 선수 목록 PC 가득(구분안 1) 137:11897, 동명이인 비교 137:12278 / M 137:12494, 137:12846. 선수 상세 PC 합류(임우성) 137:13033, 기록(김영록) 137:13176 / M 137:13313, 137:13427. 리그순위 PC 지금 시즌 138:13329, 지난 시즌 138:13604 / M 138:14414, 138:14661. 실제 데이터, [변경]/[관리자 칸 필요] 주석. 감사: 맨 색/간격/라운드 0, 스타일 없는 글자 0, 글꼴 Noto Sans KR Regular/Bold 만, 중간점 0, 인스턴스 578개 연결 정상. get_screenshot 확인. 총괄 보고 후 멈춤.
- 2026-11-09 디자인: 총괄 2차 검토 반영 — ① MatchTable Row 131:813 PC 3변형: 대진 칸을 홈팀 칸(이름 + 엠블럼, 오른쪽 정렬) / vs 칸(고정 48) / 원정팀 칸(엠블럼 + 이름, 왼쪽 정렬)으로 나눠 모든 행의 vs 가 같은 세로선, HOME 배지는 경기장소 칸 장소 이름 앞(휴대폰 그대로). ② PlayerHero 132:816 를 전폭 black-soft 면으로 다시 만듦(포지션 라벨 kfa/label yellow, 이름 display on-dark, 합류 줄 또는 기록 number-l on-dark '12경기 / 10골' + 출처 줄 on-dark-sub). 선수 상세 4프레임(137:13033, 137:13176, 137:13313, 137:13427)에서 PageHeader 바로 아래로 옮기고, 관련 소식 아래 '이전 선수 / 선수 목록 / 다음 선수' 줄 추가(목록 순서, 이름 + 포지션, 처음/끝은 빈 칸). ③ StandingsTable 리디자인 4변형 팀명 앞 TeamCrest 24(상대 initial, 우리 엠블럼), 휴대폰 긴 팀명 낱말 경계 줄바꿈. ④ 초점 속성 이름 State 로 통일(NewsCard, PlayerCard, NewsTabs, QuickLinks 의 '상태' → State). ⑤ 구분안 2 주석: 출전 1경기 이상만 출전 줄. [변경] 주석 추가. 감사: 맨 색/간격/라운드 0, 스타일 없는 글자 0, 글꼴 Noto Sans KR Regular/Bold 만, 중간점 0, 인스턴스 646개 연결 정상, 프레임 겹침 0. get_screenshot 확인(경기결과 PC, 선수 상세 PC/휴대폰, 순위 표 PC/휴대폰). 총괄 보고 후 멈춤.
- 2026-11-09 디자인: 총괄 답 반영 — PlayerHero 132:816 합류 줄을 '합류 2026-27 시즌'만으로(포지션은 위 라벨 하나), 선수 상세 합류 2프레임(137:13033, 137:13313) 반영. 기록 선수(김영록)는 라벨 + 이름 + 기록 숫자 + 출처로 포지션 중복 없음 확인. get_screenshot 확인. 멈춤(동명이인 구분안과 2차 승인은 소유자 답 대기).
- 2026-11-09 총괄: 소유자 2차 묶음(경기일정/결과, 선수 목록/상세, 리그순위, 하위 페이지 머리) **승인**, 동명이인 표시는 **구분안 2**. 디자인 세션에 3차 묶음 지시.
- 2026-11-09 디자인: 동명이인 구분안 2 적용 — PlayerCard 118:654 에 불린 '기록 줄'(기본 끔, 홈 카드 그대로). 선수 목록 PC 137:11897 / 휴대폰 137:12494 를 구분안 2로(카드 아래 '2025-26 출전 N경기' 출전 1경기 이상 7명, 나머지 같은 높이 빈 줄, 목록 아래 출처 줄), 프레임 이름 '(구분안 2)'. 비교 프레임 137:12278, 137:12846 은 '결정: 구분안 2' 주석만 달고 남김.
- 2026-11-09 디자인: 리디자인 3차(하위 페이지 4, 5번) — 02 새/변형 부품: NewsBanner 145:782(Count 여러 장/1장, 넘김 44 + 점 + 쪽수 + 멈춤), VideoCard 145:810(9:16), PostingCard 145:847, StaffCard 145:881(사진 없음 = black-soft + 엠블럼), SponsorTile 146:712, AchievementStrip 146:737, MoreButton 146:744, PageHeader 탭 4~6 불린. 03 섹션 `리디자인 시안 3차 (하위 페이지)` 148:15483 (33프레임): 구단소식 전체 PC 배너 여러 장 148:15484, 1장 148:15763 / M 148:16027, 148:16277. 구단영상 PC 149:16417 / M 149:16726. 포스팅 PC 150:16947 / M 150:17391. 기사 상세 PC 151:17695 / M 151:17850 / 사진 크게 보기 열림 151:17976. 구단소개 PC 152:17901 / M 152:18356. 연혁 PC 152:18164 / M 152:18590. 엠블럼/유니폼 PC 엠블럼 탭 154:18327, 유니폼 탭 154:18504 / M 154:18646, 154:18794. 오시는 길 PC 155:18731 / M 155:19053. 코칭스태프 PC 155:18888 / M 155:19181. 스폰서 PC 157:19165 / M 157:19509. 문의 PC 157:19356 / M 157:19671. 사이트맵 PC 158:19633 / M 158:20009. 404 없는 주소 PC 158:19785 / M 158:20132, 없는 글 PC 158:19896 / M 158:20214. 실제 데이터(사이트 캡처의 글과 사진, 유니폼 사진은 사이트 원본을 올림). [변경]/[확인] 주석. 감사: 맨 색/간격/라운드 0, 스타일 없는 글자 0, 글꼴 Noto Sans KR Regular/Bold 만, 중간점 0, 인스턴스 310개 연결 정상, 프레임 겹침 0, 낱말 경계 줄바꿈 68곳. get_screenshot 확인. 총괄 보고 후 멈춤.
- 2026-11-09 디자인: 3차 검토 답 반영 — 구단소식 격자 주석 [변경: 12개씩 → 16개씩], 'PARTNERSHIP' [소유자 확인], 사이트 안 404 '구단소식 목록' 버튼 [변경](총괄 승인) 주석 정리.
- 2026-11-09 디자인: 4차 — ① 05 Posters: 섹션 `포스터 (리디자인 D-067)` 에 새 템플릿 8개(MATCH DAY 161:18 / 161:38, 경기결과 161:58 / 161:82, WELCOME 162:2 / 162:22, GOOD LUCK 162:42 / 162:60, 각 1080x1350 / 1080x1080). black 바탕, 사선 blue 면 하나(일시/스코어/이름), 노랑은 라벨만, 아래 bg 띠 180 에 #sponsorLogo 4칸, #clubEmblem 은 bg 원 받침, #homeAway 없음, #playerNumber 빈 값 기본(이름과 같은 줄), WELCOME 은 #playerPhoto 2(흐림) + #newsImage + #playerPhoto(빈 템플릿). 글자 스타일 kfa/poster/* 14개 새로 만듦. 공개 피드 값 예시 5장(163:22 MATCH DAY 1R 노원제너FS, 163:66 FK CUP 3R 인천ZD스포츠 3:3, 163:110 WELCOME 김남석(사진 없음 → 소식 사진), 163:150 WELCOME 임우성(그래픽이 #playerPhoto), 163:188 GOOD LUCK 박영완). 옛 8개는 섹션 `이전 (1차 템플릿)` 으로 옮기고 이름 앞에 '이전 /'(플러그인이 템플릿으로 안 씀). ② 04 Screens Admin: 섹션 164:2 에 지금 관리자 화면 그대로 8프레임 — 대시보드 165:2 / 169:2, 구단소식 목록 166:2 / 170:2, 경기 수정 167:2 / 171:2, 인스타 자동 반영 168:2 / 172:2 (PC / 휴대폰). 로그인 없이 코드 마크업(admin 명세) + 실제 admin CSS 로 그려 html_to_figma 로 옮김. 공개 데이터는 실제 값, 알림과 인스타 기록 일부는 [예시 값] 주석. 코드에 있는 토큰 밖 값(휴대폰 메뉴 버튼 테두리 rgba(255,255,255,0.24), 라운드 4px, px 간격)은 지금 화면 그대로 둠. ③ 00 안내 새로 씀(175:2, 옛 안내는 옆에 '이전 안내'): 파일 구성, 승인 상태, 주석 읽는 법, KFA 글꼴 적용, 포스터 만들기, 코드 위치, 동기화 날짜. ④ Code Connect: Pro 플랜이라 거절(위 'Code Connect 확인'). 감사: 포스터와 안내는 맨 색/간격/라운드 0, 스타일 없는 글자 0, 중간점 0, 글꼴 Noto Sans KR Regular/Bold 만. get_screenshot 확인. 총괄 보고 후 멈춤.
- 2026-11-09 디자인: 총괄 4차 검토 반영 — 경기결과(FULL TIME) 템플릿 161:58 / 161:82 와 예시 163:66: 결과 글자를 대회 줄에서 빼서 스코어 바로 아래(득점 줄 위) '결과 배지'(yellow 바탕 + black 글자, radius/s, 파랑 면 위, 가운데 줄)로 옮김. 레이어 이름 #resultLabel 그대로, 템플릿 글자 '무승부'. **기능 세션 확인 필요**: 피드 resultLabel 은 '승/무/패' — 포스터에 '승리/무승부/패배'로 보이려면 피드에 새 필드를 더하거나 플러그인이 바꿔야 함. get_screenshot 확인. 멈춤.
- 2026-11-10 디자인: NextMatchHero 다시 그리기(총괄 전달, 소유자 피드백) — 02: 새 부품 MatchEmblem 190:734(원 받침 없음: 우리 팀 = emblem.png 원본 사각형, 자리표시 = 상대 원본 받기 전 [엠블럼 교체 예정] 점선 상자, 대체 = 엠블럼 없는 상대 방패 윤곽선 + 앞 2글자), 글자 스타일 kfa/pc/match-date 28 / kfa/m/match-date 22 Bold. 03 섹션 `NextMatchHero 다시 그리기 (2026-11-10)` 192:20163: 시안 A '사선 분할' PC 192:20165 / M 192:20268 / 대체 카드 192:20342, 시안 B '이중 테두리' PC 194:20239 / M 194:20347 / 대체 194:20426, 시안 C '와이드 매치데이 띠' PC 194:20464 / M 194:20577 / 대체 194:20650, MatchStrip 엠블럼 원 없음 PC 194:20766(40) / M 194:20932(32, 팀 이름 Bold). 3안 공통: 엠블럼 88 / 64(C 96), 팀 이름 24 / 16 Bold, 날짜 28 / 22 Bold, 파랑은 사선 면/띠 한 곳, 그라데이션 없음, 버튼 2개, 카운트다운 없음. 다음 홈경기 상대 화성FS 는 자리표시 [엠블럼 교체 예정]. 감사: 맨 색/간격/라운드 0, 스타일 없는 글자 0, Noto Sans KR Regular/Bold 만, 중간점 0. get_screenshot 확인. 총괄 보고 후 대기.
- 2026-11-10 디자인: NextMatchHero 시안에 엠블럼 있음/없음 두 상태 — MatchEmblem 190:734 에 Type=상대(받은 투명 원본, 비율 그대로) 5크기 추가(강원FS gangwon.png 256x264, 기능 a353898). 3안의 화성FS 는 '엠블럼 없음(대체 모양: 방패 윤곽선 + 앞 2글자 Bold)'으로 바꿈(A 192:20165 / 192:20268, B 194:20239 / 194:20347, C 194:20464 / 194:20577), 같은 3안을 '강원FS 엠블럼 있음(5R 12월 12일)' 예시로 복제(A 195:20475 / 195:20555, B 195:20606 / 195:20691, C 195:20747 / 195:20828). MatchStrip 194:20766 / 194:20932 상대도 대체 모양. get_screenshot 확인. 총괄 보고 후 대기.
- 2026-11-10 디자인: NextMatchHero C 확정(소유자 선택) 마무리 — 우리 엠블럼 흰 1px 바깥선(MatchEmblem 우리 팀), MatchEmblem Size=56 추가, MatchStrip 엠블럼 PC 56 / 휴대폰 40(194:20766 / 194:20932), A/B '[보관: 선택 안 됨]', C 상태 프레임 8개(PC 197:20635 / 197:20672 / 197:20709 / 197:20886, 휴대폰 197:20746 / 197:20772 / 197:20798 / 197:20960), 띠는 히어로 아래 끝에 붙임, 첫 화면 PC 765 ≤ 800 / 휴대폰 580 확인. 부품 지도에 C 띠 / MatchEmblem / MatchStrip 표 추가. get_screenshot 확인.
- 2026-11-10 디자인: MatchStrip 경기장 줄 가운데(소유자 피드백) — 194:20766 / 194:20932 의 '장소' 줄을 대진 바로 아래 가운데로(HOME 배지 이름 옆). 비교 프레임 198:17 / 198:117: 날짜, 득점 줄, 하이라이트/다시보기 버튼까지 가운데. NextMatchHero 히어로 배치(문구 위치, 띠 높이, 상태 프레임)는 총괄 지시로 소유자 확인까지 멈춤. get_screenshot 확인.
- 2026-11-10 디자인: NextMatchHero 가운데 정렬 확정(소유자, 인천/수원 레퍼런스) — 새 섹션 200:20880. 히어로 사진 위 카드(PC 오른쪽 아래, 휴대폰 문구 아래), 위→아래 가운데: 라벨 → 엠블럼 96/64 + VS → 팀 이름 24/16 Bold → 대회명 → 날짜 28/22 Bold → @경기장 + HOME → 버튼 2개. 검정 카드 + 우리 엠블럼 뒤 파랑 사선 면 + 큰 E 워터마크. 상태 프레임 8개(PC 200:20882 / 200:20985 / 200:21089 / 200:21193, 휴대폰 200:21267 / 200:21341 / 200:21416 / 200:21491). MatchStrip 칸마다 가운데(PC 200:21536, 휴대폰 200:21621). 이전 섹션 '[보관]'. 부품 지도에 표 추가, C 띠 표는 보관 표시. get_screenshot 확인.
- 2026-11-10 디자인: 가운데 정렬 NextMatchHero 카드에서 큰 E 워터마크 뺌(6장, 노드 ID 그대로). 은평 요소는 우리 엠블럼 뒤 파랑 사선 면 하나. get_screenshot 확인.
- 2026-11-10 디자인: 소유자 피드백 반영 — VS 를 크게(kfa/pc/vs 40 Bold, kfa/m/vs 28 Bold, color/on-dark, 새 스타일), 대진 줄 PC [160 | 56 | 160] 사이 8 로 다시 나눔('서울은평 덴포스' 24 Bold 폭 157 이 156 칸에서 2줄로 꺾이던 것 고침, PC 3장 + 비교 3장). 파랑 사선 면 질감 비교 3장(PC, 강원FS 엠블럼 있음): (가) 사선 핀스트라이프 202:363 — blue-hover 1px, 8 간격, 면 기울기 그대로, 면 모양으로 마스크 + 검정 쪽 black-soft 1px 14 간격 아주 약한 사선 줄(이 안에만) / (나) 깊이감 202:535 — 면을 blue → blue-hover 선형 그라데이션(양 끝 변수 연결, 면적 그대로) / (다) 구단 사진 듀오톤 202:607 — 히어로 사진 흑백 + 대비 0.2 를 면 모양으로 마스크해 파랑 위에 곱하기. 휴대폰 추천안 (가) 203:370(blue-hover 1px 6 간격, 검정 쪽 14 간격). 감사: 맨 색 0, 스타일 없는 글자 0, Noto Sans KR 만, 중간점 0. get_screenshot 확인. 소유자 선택 대기.
- 2026-11-10 디자인: 가운데 정렬 표 '팀 이름은 엠블럼 아래 8' 을 노드 값 12(space/s)로 고침(기능 지적, PC/휴대폰 모두 12).
- 2026-11-10 디자인: 우선순위 변경(총괄): 질감 3안은 나중에(그려 둔 202:363 / 202:535 / 202:607 / 203:370 은 그대로 둠). UX 상태 표를 부품 지도에 추가하고, 새 섹션 208:21342 에 빠진 상태 22프레임(불러오는 중, 오류, 선수/구단소식 분류/포스팅/코칭스태프/스폰서 없음, 기사 사진 없음 + 긴 제목, 경기결과 긴 팀 이름, 선수 긴 이름 + 사진 없음, 휴대폰 탭 넘침 전후)을 기존 부품만으로 그림. 찾아서 고친 것: PlayerCard 리디자인 9변형의 이름이 한 줄 고정이라 긴 이름이 옆 카드를 덮던 것을 카드 폭 줄바꿈으로 고침(다른 화면 64장 이름 높이 그대로 확인). 코드 확인 메모(고치지 않음): (site) 에 loading.tsx, error.tsx, 본문 바로가기 링크가 없음. 선수, 코칭스태프, 스폰서 목록은 빈 상태 글이 없음. 포스팅 분류 탭은 휴대폰 시안(한 줄 잘림)과 코드(줄바꿈 가운데)가 다른데, 코드가 맞음. 감사: 맨 색 0, 스타일 없는 글자 0, Noto Sans KR 만, 중간점 0, 깨진 인스턴스 0. get_screenshot 확인.
- 2026-11-10 디자인: 총괄 요청 2건. ① MatchEmblem Size=24 추가: 우리 팀 211:24754, 대체 211:24756, 상대 211:24759. 표의 흰 바탕용으로 바깥선 color/line, 방패 color/text-sub, 글자 color/text. 대체 글자는 24 에서 앞 1글자, kfa/10 Bold. MatchTable Row(8변형)와 StandingsTable 의 TeamCrest 24 를 MatchEmblem 24 로 바꾸고, 03 Screens 의 표 행마다 팀 이름에 맞춰 원본 엠블럼을 넣음(TeamCrest 24 남은 것 0). 상대 엠블럼 원본 6개(기능 863f54b)를 피그마에 올려 가운데 정렬 카드와 MatchStrip 의 대체 방패를 원본으로 바꿈. '엠블럼 없음' 상태는 인천ZD스포츠로 바꿔 대체 방패 예시를 남김. ② D-072 대회명: '2026-27 FK1리그' 를 '키움증권 2026-27 FK리그1' 로, 스폰서 줄을 '키움증권 2026-27 FK리그1(1부) 참가' 로 바꿈(부품, 리디자인 화면, 포스터 템플릿과 예시, 글자 38곳, 레이어 이름 2곳). '현재 사이트' 캡처, '[보관]', 포스터 '이전' 섹션은 그대로 둠. 지난 시즌 '2025-26 FK1리그' 표기는 그대로 둠. 대회 태그 폭이 162 로 늘었지만 넘치는 곳은 없음(카드, 띠, 표 제목, 홈 위젯 넓이 확인). MatchEmblem 56 글자 스타일 빠짐을 고치고, 직접 만든 벡터 38개에 남아 있던 기본 검정 선을 지움. 감사: 맨 색 0, 스타일 없는 글자 0, 중간점 0, 깨진 인스턴스 0. get_screenshot 확인(경기결과 PC, 휴대폰 카드, MatchStrip).
- 2026-11-10 디자인: TeamCrest 이니셜 원을 모두 없앰(총괄 요청). MatchCard 113:141 과 이전 NextMatchHero 112:194 부품 안의 TeamCrest 40/56 20개, 화면에서 덮어쓴 인스턴스까지 140개를 MatchEmblem 으로 바꿈. 우리 팀은 우리 팀, 상대는 팀 이름(카드의 홈팀/원정팀 속성 또는 같은 칸 글자)에 맞는 원본, 원본이 없는 팀(인천ZD스포츠, 제주서귀포)은 대체 방패. 부품 TeamCrest 111:15 는 지우지 않고 '[보관] TeamCrest' 로 이름과 설명을 바꿈. 남은 TeamCrest 인스턴스 0(전체 페이지). 감사: MatchCard, NextMatchHero, MatchStrip, 포스터 맨 색 0, 스타일 없는 글자 0, 깨진 인스턴스 0. get_screenshot 확인(MatchStrip 부품). 별도 메모: 리디자인 시안의 '최대 길이' Hero(떼어 낸 것) 글자 4개 123:6923, 123:6924, 124:9939, 124:9940 에 글자 스타일이 없음(이번 변경 전부터, 고치지 않음).
- 2026-11-09 총괄: 소유자 3차, 4차 묶음 **승인** — 시안 전체 승인. 코드 반영은 단계별 운영 배포(D-069). 기능 세션에 1단계(공통) 지시.
- 2026-11-09 기능: 리디자인 1단계(공통, D-069) — 토큰(on-blue, overlay 4, space 9단계, radius l/pill, topbar-h/hero-h/aside-w/match-hero-w) tokens.css 반영 + tokens.json 갱신, TopBar/Header(활성 노란 2px 밑줄)/PC MegaMenu/휴대폰 전체 화면 메뉴/Footer(사이트맵 6칸 + 정보 줄)/PageHeader(검정 면 + 사선 black-soft + blue 6px, 240/160, compact 120/96)/공통 초점 표시(공개 화면만)/Section 제목/버튼 기본형(Button.tsx). 운영 데이터(공개 키, 읽기만)로 빌드해 PC 1280/휴대폰 390 캡처 비교, 가로 넘침 0, 중간점 0. 판단 필요: container 폭(피그마 내용 1200 vs 사이트 1160), 721~960px 구간 기준.
- 2026-11-09 총괄: 소유자 결정 — 포스터는 구단 공식 그래픽을 쓰므로 피그마 포스터 템플릿과 '포스터 만들기'는 보관, 더 다듬지 않음(D-070). 기능 1단계(공통) 받음(ebb45aa), 미리보기 배포 dpl_7a6E4BtBsD2u8cRrLBzkqEYPSQsE, 총괄 검토 중.
- 2026-11-09 기능: 1단계 총괄 검토 9건 반영 — Hero/NewsBanner 어두운 면 초점, 메가메뉴 열림을 상태로(마우스는 헤더 바 + 메가 안, 200ms 닫힘 지연, 터치는 hover 로 안 열림, 페이지 바뀌면 닫힘, 키보드는 focus-visible 일 때), Esc 초점 복귀(PC 1차 / 휴대폰 메뉴 버튼), 메가 1차 라벨은 글자, 탭 초점 링 안쪽, 메가 '지금 페이지' 가장 긴 일치 하나, 휴대폰 메뉴 링크 44x44, 아이콘 선 간격 5, 움직임 줄이기. Playwright (a)~(f) 통과(공개 25페이지 x 1280/390 넘침 0, 중간점 0).
- 2026-11-09 기능: 1단계 재검증 10건 반영 — 주소가 바뀌면(뒤로/앞으로 포함) 메뉴/메가 닫힘, 초점이 헤더 안이면 포인터 이탈로 안 닫힘, 탭 좌우 padding + 안쪽 box-shadow 초점 링(밑줄 유지), 휴대폰 2차 간격 16 고르게(누르는 영역은 padding), 배너 링크 초점 안쪽, Esc 는 어디서든 메가 닫힘, ScrollRow 초점 항목 보이게, 로고 44, scroll-padding-top, 휴대폰 메뉴 아래 줄 줄바꿈.
- 2026-11-09 기능: 1단계 2차 재검증 7건 반영 — 메가 상태를 마우스 열림/키보드 열림/Esc 닫음 3가지로(초점 위치에 기대지 않음), ScrollRow 는 키보드 초점일 때만 옮김, 탭/배너 초점 링 투명 outline(강제 색 모드), 배너 링은 사진 위 ::after, scroll-padding 은 공개 레이아웃이 보일 때만(SiteRootMarker).
- 2026-11-10 총괄: 코드 1단계(공통) 운영 배포 dpl_rDRWRV69389ePaerpWMYrhzeWhGf (36b566c), 운영 확인 완료. 기능 세션에 2단계(홈) 지시.
- 2026-11-10 기능: 리디자인 2단계(홈, D-069) — Hero 그라데이션 + NextMatchHero(카드 전체 링크 아님, 버튼 둘), MatchStrip(지난/다음/그다음 3칸, 휴식기 최근 결과 3칸, 휴대폰 스와이프 + 점), 스폰서 띠를 경기 띠 아래로 + 44 멈춤 버튼(I-033 해결), 구단 소식 큰 카드 1 + 목록 행 4(휴대폰 목록 + 더 보기), 순위 위젯 7열, 선수단 검정 면(포지션 탭 + 4장 + 화살표/점), INSTAGRAM 6칸(구단 인스타그램 포스팅 표지, 새 창), 바로가기 글 타일. 새 부품: TeamCrest, HomeAwayBadge/CompetitionTag, ResultBadge, SwipeRow, Section band. 홈 탭/가로 카드 줄 초점 링 잘림 해결.
- 2026-11-10 기능: 상대팀 엠블럼 자료 모으기(모양 변경 없음) — `src/config/team-crests.ts`(이름, 별칭, 파일, 출처, 받은 날짜, 상태) + `crestFor`(띄어쓰기/대소문자 무시, 별칭) + 테스트. 강원FS 1팀만 공식 투명 원본(강원FC 홈페이지 256x264), 나머지 7팀 못 구함(이유 기록). 관리자 업로드 칸은 I-048.
- 2026-11-10 기능: C 결정 1단계 — TeamCrest 를 원 없는 엠블럼 부품으로(피그마 MatchEmblem 190:734): 우리 팀 emblem.png 원본, 상대 crestFor 원본, 없으면 대체 방패(선 2px + 앞 2글자). 크기 96/88/64/56/40/32(높이 기준, 가로는 원본 비율). 지금 쓰는 곳은 홈 MatchStrip, NextMatchHero 뿐. NextMatchHero 띠 재작성은 디자인 마무리 표 대기.
- 2026-11-10 기능: 디자인 부품 지도(77c14fb/46e19e7) 반영 — MatchEmblem 크기별 방패 선(64 이상 2px, 밑 1.5px)과 글자 스타일(96/88 pc/h3, 64 m/h4, 56/40 label, 32 caption), 우리 엠블럼 on-dark 1px 바깥선, MatchStrip 엠블럼 PC 56 / 휴대폰 40 + 팀 이름 16 Bold(낱말 경계 줄바꿈), 경기장 줄 대진 아래 가운데(소유자 피드백). MatchCard 는 홈 MatchStrip 에서만 쓰임(경기일정/결과는 표 MatchTable 의 경기장소 칸이라 해당 없음). NextMatchHero C 띠는 총괄 지시로 멈춤.
- 2026-11-10 기능: 소유자 확정(총괄 전달) MatchStrip 칸마다 가운데 정렬 — 날짜, 득점, 영상 버튼 가운데(피그마 198:17 / 198:117 구조, 위 줄 라벨/대회만 양 끝). NextMatchHero 는 '히어로 위 가운데 정렬 카드'로 확정, 디자인 표 대기.
- 2026-11-10 기능: NextMatchHero 가운데 정렬 카드(디자인 2bb7ab3, 피그마 200:20880) — 검정 카드 456/358, 라벨 → [엠블럼 96/64 | VS | 엠블럼] + 이름 24/16 Bold → 대회 → 날짜 28/22 Bold → @경기장 + HOME → 버튼 160x44(휴대폰 폭 나눔), 홈팀 엠블럼 뒤 파랑 사선 면(200x120 기울기 28 / 159x80 기울기 20), 큰 E 외곽선(꾸밈, 읽지 않음). match-hero-w 400 → 456(tokens.json, 플러그인 dist 다시 만듦). MatchStrip 순서 라벨 → 대회(간격 4) → 대진 → 날짜 → @경기장 + HOME → 득점 → 영상, 모두 가운데.
- 2026-11-10 기능: NextMatchHero 소유자 피드백 — 큰 E 워터마크 뺌(디자인 485fff7), VS 크게 40 / 28 Bold(대략값, 디자인 표 오면 맞춤). 띄어쓰기 없는 긴 팀 이름은 뒷말(풋살클럽, 풋살구단, 스포츠, FS, FC) 앞 <wbr> 로 낱말 경계 줄바꿈(teamNameSegments + TeamName, NextMatchHero/MatchStrip). 4상태 확인: 엠블럼 있음(강원 원본), 없음(방패), 긴 이름(고양불스 / 풋살클럽 2줄), 다음 홈경기 없음(카드 숨김).
- 2026-11-10 기능: 디자인 a2f9253 반영 — VS kfa/pc/vs 40 / kfa/m/vs 28 Bold(lh 1, on-dark), 대진 칸 PC [160 | 56 | 160] / 휴대폰 [128 | 48 | 128], 사이 8. 파랑 면 질감은 소유자 선택 대기(평면 blue).
- 2026-11-10 기능: 2단계 검토 12묶음(G1~G12) 반영 — 순위 위젯(긴 이름 줄바꿈, 순위 24 / 숫자 22, 휴대폰 32, 머리 34 + 링크 44), 경기 띠 721~900 은 2칸 + 스와이프(PC 901 이상 고정, 고정이면 점 없음), SwipeRow 점 개수/넘김 다시 계산(src/lib/swipe.ts + 테스트, 휴대폰 칸마다 점, PC 페이지), 점 버튼 44 / 8px / 켜진 점 20 길이, 꺼진 점 on-dark-sub / text-sub, 휴대폰 줄 화면 오른쪽 끝까지, 화살표 끝에서 aria-disabled(초점 유지), 스폰서 멈춤 이름 고정 + 링크 초점에만 펼침 + 560 이하 오른쪽 여백 + 움직임 줄이기에서 숨김, 위젯 DOM 먼저(order 지움, PC grid 자리), Section 머리 줄바꿈, homeMatchItems 예정 최대 2, 홈 탭 글자 제목 왼쪽 맞춤 + 밑줄 ::after + 휴대폰 간격 0, 휴대폰 소식 행 16 / 바로가기 8, 화살표 앞 gap. 덤: 320 에서 헤더 영문 줄 넘침(1단계 부품) — 휴대폰 로고와 버튼 사이 8 + 좁으면 영문 줄 두 줄.
- 2026-11-10 기능: 리디자인 3단계(경기일정/결과/순위, 2차 시안 136:9513 / 131:813 / 132:1618) — MatchTable PC 5칸(라운드 64, 일정 168 날짜 + 시각, 대진 [홈 이름 + 엠블럼 24 | vs 48 | 엠블럼 + 원정] 같은 세로선, 장소 200 HOME 배지 + 장소, 결과 96 상자 20 Bold D-013), 휴대폰 3칸(일시 84: 라운드/월-일/시각, 대진: 홈 줄/원정 줄/장소 + HOME/득점/영상, 결과 64), 다음 경기 행 blue-tint(+ 화면 읽기 '다음 경기'), 영상 버튼 44, 경기일정에도 출처 줄. StandingsTable 10열(순위 64, 팀 엠블럼 24 + 이름, 숫자 80), 우리 팀 blue-tint, 휴대폰 순위/팀 고정 + 가로 스크롤(키보드로 넘김, 표 caption). 리그순위 화면: 지난 리그 칩, 지난 시즌 화면 맨 위 '← 지금 시즌 순위', 경기 결과 대회 제목 h3. TeamCrest 24 추가, 대체 방패 색은 놓인 면 글자색.
- 2026-11-10 기능: 리디자인 4단계(선수 목록/상세, 2차 시안 137:11897 / 137:13033 / 137:13176 / 132:816, 구분안 2) — 목록: 포지션 칩(전체 + 포지션, aria-pressed, 선수 없는 포지션 숨김) + 포지션 묶음, 카드 아래 '2025-26 출전 N경기'(1경기 이상만, 없으면 높이만), 목록 아래 출처. 상세: PlayerHero 전폭 black-soft(사진 FitImage 3:4 폭 400, 포지션 라벨, h1 이름(번호 확정 때만 No.), '12경기 / 10골'(도움은 있을 때만) + 출처 또는 '합류 2026-27 시즌'), 관련 소식, 이전 선수 / 선수 목록 / 다음 선수(목록 순서). PageHeader flush(아래 여백 0). 함수 playerRecordLine / playerAppsLine / playerNeighbors + 테스트. 공용 Chip.module.css. 덤: 스폰서 띠 로고 링크 누름 영역 44, 리그순위/선수 목록 위 여백 두 번 들어가던 것 고침.
- 2026-11-10 기능: 리디자인 5단계(구단소식/기사/영상/포스팅, 3차 시안 148:15483~151:17976) — NewsBanner(PC 글 칸 400 + 사진 16:9 높이 450, 휴대폰 사진 위, 넘김 44 원 + 점(보기용) + '1 / 5' + 멈춤(이름 고정 + aria-pressed), 초점 링 I-047 해결), 구단소식 격자 16개씩, 더 보기 'N개 남음' 44. 기사 상세 가운데 800 칸(h1 40/24, 분류/날짜/공유, 사진 한 장은 16:9 FitImage + '크게 보기 ↗', 프로필 문단 상자(isProfileBlock + 테스트), 다음 글 → 이전 글('없습니다'), 목록 버튼 가운데). 포스팅 분류 탭 글자 + 밑줄, 출처 칩 알약 44 켜짐 black. 공유 버튼 44.
- 2026-11-10 기능: 리디자인 6단계(구단/스태프/스폰서/문의/사이트맵/404, 3차 시안 152:17901~158:20214) — 문의: 연락처 2 x 2 카드(링크는 카드 전체, 값 18 Bold blue) + 문의 분야 bg-soft 카드 '메일 쓰기 →'. 코칭스태프: 사진 없는 카드 black-soft + 엠블럼([변경 D-016]), 프런트 3열 격자(dl). 스폰서: 4열 칸(bg + line, 칸 전체 링크, 이름 ↗), 네이밍 두 칸 폭, 휴대폰 2열. 연혁: 성과 띠(achievementItems — 창단 연도 / 최근 리그 우승(연혁) / 국가대표 배출 수, 없는 칸 숨김 + 테스트). 404: 큰 404 + 제목 + 안내 + 버튼, 없는 구단소식 글은 [구단소식 목록] [메인으로](news/[category]/[id]/not-found.tsx). 그대로 둔 것: 구단소개/엠블럼/오시는 길/사이트맵은 기능 같고 시각 세부만 다름, 스폰서 PARTNERSHIP 검정 판은 [소유자 확인] 대기.
- 2026-11-10 기능: 디자인 UX 상태 표(a9f8c00) 중 확정 항목 반영 — 구단소식 분류 빈 상태에 '전체 보기 →', 선수 카드 긴 이름 카드 폭 안 줄바꿈. 나머지(불러오는 중/오류 상자, 선수/스태프/스폰서 없음 문구 제안)는 총괄 확인 대기.
- 2026-11-10 총괄: 기능 2단계(홈) 받음(7a4e8b9), 미리보기 dpl_EbiqJ97TgYQohujr2quJMyMkdi6c, 검토 워크플로 진행. 소유자 피드백(NextMatchHero) — 은평다움/고급스러움 없음(단색 파랑), 상대 로고 안 보임, 원 안 로고 어색, 로고 작고 팀 이름 글자 힘 부족. **2단계 배포 보류.** 디자인 세션: NextMatchHero 3안(엠블럼 요소에서 은평다움, 검정 바탕 + 파랑 일부, 원 없는 엠블럼 PC 88+/휴대폰 64+, 팀 이름 Bold 20+/16+, MatchStrip 엠블럼 원 없이 40). 기능 세션: 상대 8팀 엠블럼 공식 원본(투명, 256px+) 모아 public/crests + team-crests.ts + crestFor(), 관리자 업로드 칸은 다음 단계. 연맹 구단 소개 이미지는 92px 흰 원 박힘이라 쓰지 않음.
- 2026-11-10 총괄: 디자인 3안(A 사선 분할 / B 이중 테두리 / C 와이드 띠, 엠블럼 있음/없음) → 소유자 **C 선택**(D-071). 소유자 추가: MatchStrip 경기장 줄 가운데. 디자인 세션 C 마무리(우리 엠블럼 바깥선, MatchStrip 엠블럼 56/40, 히어로 문구 위치, 상태 4개, 부품 지도 표) → 기능 세션 코드. 상대 엠블럼은 기능 세션이 강원FS 1개(a353898), 나머지 7팀은 총괄이 연맹(KFL) 채널 포함 다시 찾는 중.
- 2026-11-10 총괄: 소유자가 인천유나이티드 NEXT MATCH, 수원삼성 NEXT/LAST MATCH를 레퍼런스로 "중앙에 최대한 정렬" → 확인 질문에 '히어로 사진 위 카드'. C 가로 띠는 보관, NextMatchHero는 지금 자리의 가운데 정렬 카드(C의 은평 요소), MatchStrip 3칸도 칸마다 가운데 정렬. 카운트다운/넘김 화살표 없음(D-071 갱신).
- 2026-11-10 기능: claude/tender-keller-fd45tu merge(D-072 대회명 '키움증권 2026-27 FK리그1', 상대 엠블럼 6개 863f54b). team-crests 7팀 연결(화성/고양/용인/노원/전주/경기LBFS + 강원, 별칭 포함), 인천ZD스포츠는 대체 방패. 긴 대회명 확인: 다음 홈경기 카드, 경기 띠 대회 태그, 순위 위젯 시즌 줄 모두 320~1280 한 줄, 넘침 0. 덤: 320 에서 다음 홈경기 카드 홈팀 이름이 잘리던 것(칸 128 x 2 + 48 고정) — 칸이 줄어들게, 파랑 사선 면 폭도 칸 따라(390 159, PC 200 그대로).
- 2026-11-10 기능: 총괄 기본값 반영 — (site)/error.tsx(머리/바닥 그대로, bg-soft 상자 + [다시 시도](reset) + [메인으로], loading.tsx 없음, not-found 와 따로), 선수/코칭스태프/스폰서 빈 상태 고정 문구(스폰서는 문의 상자 위, I-052 관리자 칸 후보(번호 겹쳐 049 → 052)), '본문 바로가기'(머리 맨 앞, 초점 때만 보임, main#main tabIndex -1, 루트 404 에도). 표 대진 721~1080 vs 칸 32 + 사이 8(새 엠블럼으로 721 에서 2px 넘침). 긴 대회명 홈/경기일정/결과/순위 320~1440 넘침 0.
- 2026-11-10 기능: MatchEmblem 24 스펙(디자인 a17af68) — 표 대체 방패 선 1px text-sub + 글자 1자(crestInitialShort, 영문은 첫 대문자) kfa/10 Bold text, 우리 팀 바깥선 line, 상대 원본 그대로. 실측 우리 17x24 / 대체 20x24.
- 2026-11-10 기능: 총괄 2~6단계 전체 검토 20묶음 반영(fa4a672 기준) — 태블릿 표(721~900 라운드 칸 숨김/장소 136/결과 80, 순위 1080 이하 숫자 56 + min-width 0, 팀 이름 글자 단위 끊김 없앰), 오류 화면 retry + h1 초점, SwipeRow 키보드 초점 칸 보이게, 포스팅 탭 휴대폰 왼쪽부터 + 누른 탭 보이게 + 더 보기 초점, 기사 사진 한 장 PC 4:3 / 휴대폰 358:430, 동명이인 영입(slug 주소), 지난 리그 칩 최종 성적, 출전 시즌 seasonYear, 성과 띠 조각 단위, 휴대폰 결과 상자 20, 순위 표 넘칠 때만 Tab/낭독(ScrollRegion), 인스타 수학 굵은 문자 NFKC(plainText), 기사 이전/다음 링크 방향, 배너 hover/focus 따로 + 카운터 live + 움직임 줄이기 멈춤 숨김, 스폰서 띠 펼침 초점 링, 홈 소식 721~900 쌓기 / 1081~1150 썸네일 96, 휴대폰 44(푸터/사이트맵/영상 링크/2차 탭/스폰서 링크/프로필 링크), 바닥 여백 한 번, 지난 시즌 대회 제목 18/16. 테스트 268.
- 2026-11-10 기능: claude/tender-keller-fd45tu 58ed10d merge(KNOWN_ISSUES 번호 겹침 정리, 내 I-049 → I-052). team-crests FK리그2 4팀 추가(구미FS gumi 262x303, 대구FS daegu 493x493, 드림허브군산FS gunsan 277x367 + 별칭 군산FS, 청주팔라시오FS cheongju 371x475 + 별칭 청주풋살클럽, 받은 날짜 2026-11-10, 총괄 반박 검증). 제천FS는 대체 방패(I-051). 청주는 출처 주소가 없어 설명으로 적음 — 테스트는 출처가 비어 있지 않고 http 로 시작하면 https 만 확인. crestFor 테스트 12팀 + 별칭.
- 2026-11-10 기능: 청주팔라시오FS 출처를 총괄이 준 https 이미지 주소(오송 팔라시오 축구 아카데미 네이버 플레이스)로 바꾸고, 엠블럼 출처 테스트를 원래대로(https 주소 필수) 되돌림.
- 2026-11-10 기능: 총괄 e100ac6 재검증 10건 — (1) plainText NFKC 를 수학 영숫자 블록에만('ㅣ' '③' '…' 그대로, 테스트), (2) 배너 초점 멈춤은 키보드 초점(:focus-visible)일 때만, (3) 휴대폰 푸터 SNS 링크 column-gap(↗ 띄어쓰기), (4) 푸터 문단 안 메일/전화 링크는 inline 그대로 + ::after 가운데 높이 44 누름 영역(줄 간격 27 고르게), (5) FitImage contain prop — 기사 사진 한 장 칸은 늘 전체, (6) FitImage 판정 로직을 lib/fit-image.ts(shouldFill, 테스트)로 빼고 ResizeObserver 로 칸이 바뀌면 다시 판정, (7) 포스팅 분류 탭을 ScrollRow(끝 흐림 + 키보드/누른 탭 보이기, aria-pressed 도 고른 탭) + 끝 여백 8, (8) 선수 상세 이전/다음 줄 아래 padding 없앰 → 푸터 margin 72/48 한 번, (9) 역사 성과 띠 dd margin 0(같은 원인인 코칭스태프 프런트 dd 도 40 → 0), (10) 경기 표 장소 VenueName(끝말 체육관/경기장/풋살장/트레이닝센터/센터 앞 <wbr>). Edge Function plainText 도 같은 문제라 I-053 기록(배포 필요). 테스트 270.
- 2026-11-11 기능: 총괄 b24a2d5 재검증 6건 — (1) ScrollRow fade prop, 포스팅 분류 끝 흐림 64(390 에서 '팬 포스팅 61' 끝이 흐림에 걸려 넘김 단서 보임, 캡처 확인), (2) 배너 hoverHold 는 pointerType mouse 일 때만(터치 탭으로 멈춘 채 남지 않음), (3) 배너 onKeyDown(배너 안 :focus-visible 이면 멈춤) + onPointerDown(초점 멈춤 풀기) — 마우스/키보드/터치 조합 7경우 확인, (4) 휴대폰 푸터 .sns a z-index 1 + 문단과 SNS 사이 16(Instagram 칸 elementFromPoint 겹침 0), (5) VenueName 띄어쓰기 있으면 나누지 않음(단양군 국민체육센터), (6) plainText 에 Letterlike 수학 빈자리 글자(ℎ ℂ 등) 더함, ℃ № ™ 그대로. I-053 저장소 코드(Edge Function plainText)도 같은 규칙으로 고침 — 재배포는 소유자 승인 대기.
- 2026-11-11 기능: 배포 전 3건 — (1) Edge Function plainText: NFC → 수학 글자(MATH_ALNUM) NFKC → 전각(U+FF01~FF5E) NFKC, 이모지 빼기에서 ™ ℹ 제외. parseWelcome 등번호 No/№. 테스트 '№10' 'No.１０' NFD 한글 'FUTSAL™' + I-053 경우. (2) 배너 focusHold 해제를 onPointerDown → onClick(detail > 0, 실제로 누른 경우만) — 키보드 초점 + 손가락 스크롤에도 멈춤 유지, A~E 그대로. (3) ScrollRow 주석 64. 테스트 271.
- 2026-11-11 기능: 운영 이미지 402 대응(D-073) — next.config.ts images.unoptimized true(원본 그대로). 운영 데이터 빌드에서 홈, /news, /news/posting, /team/players, 기사 상세, 선수 상세 1280/390: /_next/image 요청 0, 깨진 사진 0, FitImage 판정 어긋남 0, 가로 넘침 0. 22페이지 x 12폭 전수 ALL CLEAN.
- 2026-11-11 총괄: 2~6단계 + D-072 대회명 + D-073 이미지 운영 배포 — dpl_J1ZZ5urgzfJoLrEazDXXrVKtuXKy(커밋 34221cc), instagram-sync 버전 5. 운영 20쪽 x 1280/390 전부 정상(200, 넘침/중간점/깨진 사진/402 0). 디자인 다듬기는 I-050, I-054, 파랑 면 질감 후보 202:363/202:535/202:607 로 남김.
- 2026-11-11 디자인: tender-keller 17ddf61 merge(진행 기록 충돌은 양쪽 줄 모두 남김). Next Home Match v2 시안(소유자 '박스' 지적: 우리 쪽에만 붙은 파랑 사선 면 + 엠블럼 흰 1px 테두리). 새 섹션 223:24706, 기존 승인 프레임은 그대로. 공통: 우리 엠블럼은 emblem-mark.png(SINCE 줄 없음)를 테두리와 바탕 없이, 상대 원본도 같은 칸 높이(PC 112 / 휴대폰 72)로 같은 무게, 휴대폰 이름 kfa/m/h3 20 Bold(칸 [135 | 40 | 135]), 데이터 화성FS / 12월 5일 (토) 14:00 / 키움증권 2026-27 FK리그1 / 4R / 은평다목적체육관 / HOME, 대체 방패 예시는 제천FS. ① 무테 대칭(검정 카드, 장식 없음) PC 223:24707 / 제천 223:24784 / 휴대폰 223:24863. ② 좌우 분할(카드 왼쪽 반 color/blue 전체 높이, VS 를 지나는 사선) 223:24911 / 223:24989 / 223:25069. ③ 밝은 카드(color/bg, 라벨과 VS blue, 버튼 blue 면 + line 테두리) 223:25118 / 223:25198 / 223:25280. 캡처 docs/figma-captures/nmh-v2/*.jpg. PC 카드 아래 끝 733 ≤ 히어로 765, 휴대폰 카드와 버튼 580 안. 감사: 맨 색 0, 스타일 없는 글자 0, 중간점 0. get_screenshot 확인. 소유자 선택 대기.
- 2026-11-11 디자인: 소유자 ② 좌우 분할 확정, 'NEXT HOME MATCH 도 작게 두지 말고' 반영. MatchEmblem: 우리 팀 9크기를 emblem-mark.png, 테두리 없음으로 바꾸고 Size=112, 72(우리 팀, 상대, 대체) 추가. ② 프레임 3장의 엠블럼을 부품 인스턴스로 바꾸고 라벨을 PC 20 / 휴대폰 16 Bold 로 키움. 카드는 아래 맞춤(PC 아래 32, 휴대폰 아래 12). 긴 이름 PC 227:187 / 휴대폰 227:263, 휴대폰 제천FS 227:310 추가. ①, ③ 은 '[보관: 선택 안 됨]'. 부품 지도에 '### NextMatchHero v2 ② 좌우 분할' 표. 캡처 2-*.jpg 6장. 감사: ② 프레임과 MatchEmblem 맨 색 0, 스타일 없는 글자 0(보관 ①, ③ 의 크기 바꾼 대체 방패 글자 2개는 그대로), 중간점 0. get_screenshot 확인(PC, 휴대폰 긴 이름, 휴대폰 제천FS, 경기 3칸 띠).
- 2026-11-11 디자인: 기능 22c50c0 실측(320/360 에서 우리 이름 2줄) 답: 375 미만은 팀 이름 16 Bold, 엠블럼 칸 64. 320 의 두 줄은 받아들임. ② 표에 적음.
- 2026-11-11 디자인: 기능 0d88a4b 실측 답: 375(아이폰 SE/mini)에서도 20 이 두 줄이 되어 경계를 '390 미만'으로 올림.
- 2026-11-11 기능: NextMatchHero v2 ② 좌우 분할(소유자 'ㄱㄱ', 디자인 09ede90 merge) — 카드 ::before 왼쪽 반 blue 전체 높이, 사선 위 50%+16 / 아래 50%-40(휴대폰 +10 / -30), 카드 안 내용은 모두 위로(대회 태그가 가려지던 것 확인 후 고침). 라벨 20/16 Bold yellow, 엠블럼 칸 112/72(TeamCrest 112, 72, m72 추가), 대진 [160|56|160] / [135|40|135], 휴대폰 이름 20. 우리 엠블럼은 모든 곳 emblem-mark.png(600x766) 테두리와 바탕 없이 — 17ddf61 흰 바탕과 --crest-line 제거. 히어로 아래 맞춤: PC 카드 아래 32(문구는 48 그대로), 휴대폰 12. 실측: PC 456x439, 엠블럼 88x112 / 112x112, 아래 32, 390 358x331 아래 12(첫 화면 580 안), 320/360 은 이름 두 줄로 히어로 602. 22페이지 x 12폭 ALL CLEAN.
- 2026-11-11 기능: 카드 v2 좁은 휴대폰(디자인 d162b69) — 375 미만 팀 이름 16, 엠블럼 칸 64. 히어로: 360 580(한 줄), 374 580, 320 584(두 줄, 받아들임). 375 는 규칙 밖이라 20 그대로 두 줄, 히어로 602.
- 2026-11-11 기능: 카드 v2 좁은 휴대폰 경계 390 미만으로(디자인 768831c). 히어로: 389/375/360 580(한 줄), 390 580(20 한 줄), 320 584(두 줄, 받아들임).
- 2026-11-11 기능: 구단영상 원본 링크(D-074) — NewsLink(영상이면 원본 새 창, 아니면 상세)를 NewsCard, 홈 NewsTabs, NewsBanner 에 씀. 영상 표지 FitImage fit cover(contain prop 은 fit 으로 합침). 상세는 VideoEmbed(iframe) 를 지우고 VideoCover(표지 꽉 채움 + 원본 재생 버튼). lib/video externalPlay + 테스트, embedSrc 삭제. 실측 1280/390: 영상 카드 20/20 새 창 + noopener, 클릭/Enter 모두 instagram.com/p/… 새 창, 초점 링 blue 2px, 상세 iframe 0 / 표지 360x640, 358x636 cover / 버튼 44. 22페이지 x 12폭 ALL CLEAN. 테스트 272.
- 2026-11-11 기능: 총괄 검토 — 휴대폰(720 이하) 히어로 .inner gap space/xs(8). 상대 이름이 두 줄이어도 카드가 위로 올라가 580 안. 피그마 227:263 은 문구와 카드 사이 11 — 코드는 토큰 space/xs 8 을 씀(디자인 세션이 맞춰 주세요). 실측 390/375/360/320 x 화성FS/고양불스풋살클럽 8조합 모두 히어로 580, 카드 아래 568, 버튼 아래 552(320 도 580 으로 줄어듦).
- 2026-11-11 기능: 총괄 최종 확인 3건 — (1) PlayMark 부품(aria-hidden, 36 / 작은 칸 28)을 NewsCard, 홈 소식 탭(큰 카드 + 행), 배너에 같이 씀. 표지 맞춤은 홈/배너 auto 그대로. (2) lib/video videoCardPlay: 구단영상 분류만 원본 새 창, 공지/구단뉴스는 영상 주소가 있어도 상세(테스트). (3) 관리자 영상 주소 안내, actions.ts, types 주석을 '카드는 원본 새 창'으로. 실측 1280/390: 배너 영상 3장, 홈 탭 영상 3개 모두 재생 표시 + 새 창, 일반 글은 상세. 22페이지 x 12폭 ALL CLEAN. 테스트 273.
- 2026-11-11 총괄: 다음 홈경기 카드 v2 ② 좌우 분할 + 우리 엠블럼 emblem-mark 무테(모든 곳) + 구단영상 원본 링크 운영 배포 — dpl_E65BLFfMKfgoZAcQV8yRU9AqpXua(78e2fc4), D-075 / D-074. 운영 전수 통과.
- 2026-11-11 디자인: tender-keller 162f7d9 merge(진행 기록 충돌 양쪽 남김). 운영 배포(78e2fc4, D-074, D-075)에 맞춤: (1) 227:263 휴대폰 긴 이름 카드를 문구 아래 8(space/xs, 코드 720 이하 최소 간격)로, 카드 위 211 아래 565. (2) VideoCard 145:810 재생 표시를 코드 PlayMark 대로 36 원, 왼쪽 아래 12, color/black 70%, on-dark 세모(구단영상 목록 149:16417 / 149:16726 은 인스턴스라 같이 바뀜). 카드는 누르면 원본(인스타그램)을 새 창으로 연다(부품 설명에 적음). (3) 구단영상 상세 새 프레임 PC 233:585 / 휴대폰 233:767: iframe 없이 표지(세로 9:16, PC 폭 360, 휴대폰 칸 폭, radius/m, 검정 바탕, 꽉 채움) + 가운데 재생 64 + 아래 16 에 primary 버튼 '인스타그램에서 재생 ↗'(새 창). 감사: 맨 색 0, 스타일 없는 글자 0, 중간점 0. get_screenshot 확인.
- 2026-11-12 기능: tender-keller 6986a22 merge. (1) 인스타 제목 앞뒤 구분자 떼기 — Edge Function plan.ts trimTitleSeparators(| ｜ ㅣ / ／ · • ・ : - – — 와 공백, 맨 앞/끝만, 맨 앞 이모지는 남김), reelNews/postingDraft 제목에 적용, 테스트('| 2026/27 SQUAD NUMBERS', 'ㅣ제목ㅣ', 'GOALㅣflex', '2026/27'). 사이트(src)에는 캡션으로 제목을 만드는 곳이 없음. Edge Function 재배포 필요. (2) 인천ZD스포츠 엠블럼(소유자 지정 '仁川 無缺點') — team-crests fileOnLight, crestImageFor(name, surface), TeamCrest surface(기본 24 는 흰 면). 실측: 띠 68x56 / 49x40(흰 글씨), 결과표 29x24(검정 글씨), 카드 바꿔 끼우기 137x112(칸 160) / 88x72(칸 135) 넘침 없음. I-051 인천ZD 해결. 22페이지 x 12폭 ALL CLEAN. 테스트 275.
- 2026-11-12 기능: 총괄 확인 2건(Edge Function 재배포 전) — 맨 앞 ':' '-' 는 뒤에 공백/구분자/끝일 때만 뗌(':) 좋아요', '-5℃ 한파 속 훈련' 그대로, ': 경기 결과' → '경기 결과'), LEAD_SEP/TRAIL_SEP 를 정규식 리터럴로. 같은 이유로 240행 new RegExp 도 String.raw 로 바꿔 plan.ts 안 겹친 역슬래시 0. 테스트 275.
- 2026-11-12 기능: 저장소를 instagram-sync v6 배포본에 맞춤 — plan.ts FULLWIDTH 를 글자 그대로 /[！-～]/g(배포 도구가 \u 이스케이프를 풀기 때문). KNOWN_ISSUES I-055 해결, I-053 '배포 파일 = 저장소' 문구 정리. 테스트 275, 배포 없음.
- 2026-11-12 디자인: tender-keller 3a6a6d3 merge(진행 기록 충돌 양쪽 남김). ② 파란 면 질감 비교: 새 섹션 240:25342, 확정 프레임은 그대로. 운영 카드(223:24911 / 223:25069)를 복제해 파랑 반쪽 모양 마스크 안에만 질감. 평면 PC 240:25343 / 휴대폰 240:25416, (가) 사선 핀스트라이프(color/blue-hover 1px, PC 8 / 휴대폰 6 간격, 경계와 같은 기울기) 240:25461 / 240:25538, (다) 구단 사진 듀오톤(히어로 사진 흑백, 대비 0.2, 곱하기 28%) 240:25587 / 240:25664. (나) 그라데이션은 D-005 로 뺌. 대비(가장 밝은 바탕 = 평면 blue 기준): 노랑 6.39, 흰 10.49, 흰 64% 5.23. (가)는 blue-hover 줄 위에서 7.70 / 12.63 / 6.03. (다)는 곱하기라 blue 보다 밝아지지 않아 최저값이 평면과 같고 가장 어두운 곳은 8.38 / 13.76 / 6.44. 우리 엠블럼(emblem-mark 무테)은 세 안 모두 깃발 외곽선으로 또렷함. 캡처 docs/figma-captures/nmh-v2-texture/*.jpg(비교 compare-pc / compare-m 포함). get_screenshot 확인.
- 2026-11-12 디자인: 소유자 질감 (다) 구단 사진 듀오톤 선택(총괄 전달). 240:25587 / 240:25664 [확정], 평면과 (가) 4장은 '[보관: 선택 안 됨]'. ② 확정 프레임 6장(223:24911, 223:24989, 223:25069, 227:187, 227:263, 227:310)의 파랑 반쪽 위에 같은 질감(히어로 사진 흑백, 대비 0.2, 곱하기 28%, 반쪽 모양 마스크). get_screenshot 확인.
- 2026-11-12 디자인: 소유자 '박스 너무 큰거 아닌가' — 카드 크기 비교 새 섹션 242:25547(피그마만). 기준 456x439 PC 1280 242:25548 / 1720 242:25791. A 세로 압축 456x368(안쪽 여백 위아래 20, 줄 간격 12, 이름 간격 8, 대회명 + 장소 + HOME 한 줄, 날짜를 대진 바로 아래로, 글자와 엠블럼 크기 그대로) 242:25580 / 242:25914. B 전체 85% 400x390(여백 24, 줄 간격 12, 라벨 kfa/pc/h4 18, 엠블럼 96, 이름 kfa/m/match-date 22, VS 새 스타일 kfa/pc/vs-s 36, 날짜 kfa/m/h2 24, 칸 [146 | 44 | 146], 사선 +14/-34) 242:25660 / 242:26038. 공통: 아래 32 맞춤, 오른쪽 40(1720 은 container 1200 가운데라 오른쪽 260), (다) 질감, 대비 그대로. 카드 면적 A -16.2%, B -22.1%. 1720 프레임은 머리, 히어로를 떼어 1200 container 가운데로 맞춤. 캡처 docs/figma-captures/nmh-v2-size/compare-1280.jpg, compare-1720.jpg. 감사: 맨 색 0, 스타일 없는 글자 0, 중간점 0.
- 2026-11-12 디자인: 같은 비교 섹션 242:25547 에 C 한 줄 헤더와 D 넓은 내용 폭 추가. C + 카드 B: PC 1280 245:1414 / 1720 245:1546(윗줄 없앰, 인스타, MD스토어, 사이트맵을 메뉴 오른쪽에 구분선 1px line-on-dark 과 함께, 사이 24 / 16, 머리 125 → 80 으로 45(36%) 줄어 히어로가 45 위로). D 1720: 지금 홈 머리 + 히어로 + 경기 띠 245:2 / D 245:238, 지금 구단소식 245:444 / D 245:847(격자 4열 그대로, 카드 282 → 332), C + B + D 245:1640. D 제안 값: 1281 이상에서 --container 1480, --gutter 40(내용 최대 1400). 1280 이하는 그대로. 캡처 docs/figma-captures/nmh-v2-size/compare-1280.jpg, compare-1720.jpg(지금 / A / B / C+B), compare-width-home-1720.jpg(지금 / D / C+B+D), compare-width-news-1720.jpg(지금 / D). 피그마 1280 은 내용 1200(코드는 1160) 기준이라 1720 지금 프레임은 좌우 260(코드 280).

- 2026-11-13 디자인: 소유자 확정 A 세로 압축 + C 한 줄 헤더 + D 넓은 내용 폭 반영. 비교 섹션 242:25547 에 [확정: A / C / D] 와 '[보관: 선택 안 됨]' 표시. Header 39:36 버전=한 줄 (C) 9변형, TopBar 부품 설명에 '보관 예정'(기존 화면 프레임의 윗줄은 아직 그대로). 변수 layout/container-wide 1480, layout/gutter-wide 40. 확정 카드 PC 3장 A + C 반영(카드 456x368, 프레임 720). 새 섹션 '확정 기준 화면' PC 1280 247:3407 / 1440 247:3510 / 1720 247:3717. design/tokens.json 은 tokens.css 에서 만드는 파일이라 건드리지 않음(기능 세션 몫). get_screenshot 확인(227:187, 247:3510).
