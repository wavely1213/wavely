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
- 2026-11-09 기능: 1단계 토큰 — `scripts/figma/tokens.ts`(변환/비교 순수 함수) + `build-tokens.ts`(`npm run figma:tokens`, `--check`) + `check-figma.ts`(`npm run figma:check <내보낸 JSON>`) → `design/tokens.json` 생성, 테스트 `tests/figma-tokens.test.ts`. tokens.css 에 `--space-*` 가 없어 `space` 그룹은 비어 있음(만들지 않음). 글꼴 이름은 파일 안 이름 `KFAGothic TTF`.
- 2026-11-09 기능: 2단계 포스터 데이터 — `GET /api/figma/feed`(`src/app/api/figma/feed/route.ts`, 변환 `src/lib/figma-feed.ts`, 테스트 `tests/figma-feed.test.ts`). 응답 모양/필드 이름/템플릿 규칙을 위 B-1~B-3 표로 확정. 로컬 정적 데이터 모드 빌드/응답 확인. **운영 배포 전이라 eunpyeong-fs.com 에는 아직 없음 — 총괄 배포 필요.**
- 2026-11-09 기능: 3단계 피그마 플러그인 — `figma-plugin/`(manifest, `src/code.ts`, `src/poster.ts`, `src/variables.ts`, `ui.html`, `README.md` 빌드/설치) + 이미지 중계 `/api/figma/image`. `npm run figma:plugin` 으로 `dist/` 생성, 테스트 `tests/figma-plugin.test.ts`. 가짜 피그마 API 로 dist/code.js 를 돌려 가져오기(26개)→다시 가져오기(그대로 26)→내보내기→`figma:check` 차이 0, 포스터 채우기(템플릿 그대로, 복제본 오른쪽) 확인. 실제 피그마 앱 실행은 소유자/총괄 몫(데스크톱 앱 필요).
- 2026-11-09 기능: 4단계 — 토큰 어긋남 검사는 1단계에 포함(`design/figma-variables.json` 이 생기면 `npm test` 가 비교, `npm run figma:check <파일>`). Code Connect 확인 결과는 위 'Code Connect 확인'. **멈춤/총괄 확인 필요: ① `/api/figma/feed`, `/api/figma/image` 운영 배포 ② 디자인 세션 템플릿 레이어 이름을 B-2 표에 맞춤 ③ 위 '기능 세션 결정' DECISION_LOG 반영.**
- 2026-11-09 총괄: 소유자 방향 변경 — 화면은 프로구단급 리디자인 시안 (D-067). 디자인 세션에 Foundations/Components 까지만 하고 대기하라고 전달. 레퍼런스 조사 시작.
- 2026-11-09 기능: 총괄 검토 9건 반영 — ① 루트 .gitignore 예외로 `figma-plugin/dist` 커밋 ② 동명이인: 작별엔 명단 정보 안 붙임, 영입은 제목 포지션 일치 시만, 열쇠는 소식 id (테스트 4개 추가) ③ 이미지 주소 잘못된 %-인코딩 → 400 ④ tokens.css 마지막 선언 세미콜론 없어도 읽음 ⑤ 토큰 가져오기 별칭 덮지 않음 ⑥ B-2 표에서 `isStaff` 빼고 불리언은 레이어용 아님 명시 ⑦ `npm run lint` 에 플러그인 타입 검사 ⑧ CORS `*` 예외를 SECURITY_GUIDELINES/기능 세션 결정에 기록 ⑨ 플러그인 'KFA 글꼴 적용' 버튼 + README 설치 안내.
- 2026-11-09 총괄: 기능 브랜치 검토(9건 수정) 후 합침(8be8d50). 운영 배포 dpl_B2SXftVcpb7RqwB9j51rzrjoLy9X 로 `/api/figma/feed`, `/api/figma/image` 공개(소유자 승인). 운영 피드 확인: 다음 경기 노원제너FS 11/15, 영입 10, 작별 5, 스폰서 10, 개인정보 없음.
- 2026-11-09 총괄: '리디자인 기준' 확정(위 섹션). 디자인 세션에 홈 PC 1280 / 휴대폰 390 시안 시작 지시 — 끝나면 보고하고 멈춤.
- 2026-11-09 총괄: 소유자 홈 1차 검토 — NextMatchHero 카운트다운 빼고 나머지(경기 3칸 띠, 스폰서 띠 위치, 소식 큰 카드+목록, 순위 7열, 선수단 검정 면, INSTAGRAM, 하위 페이지 머리 검정 면) **모두 승인**. 기준의 카운트다운 부분 삭제.
- 2026-11-09 총괄: 소유자 2차 묶음(경기일정/결과, 선수 목록/상세, 리그순위, 하위 페이지 머리) **승인**, 동명이인 표시는 **구분안 2**. 디자인 세션에 3차 묶음 지시.
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
