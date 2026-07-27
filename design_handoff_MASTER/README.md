# 와벨리 디자인 핸드오프 — 마스터

Claude Code가 4개 화면을 **변형 없이 그대로** 인식하도록 묶은 최상위 패키지입니다.

> **2026-07-27 갱신.** 개발 회신(보완 요청 A 3건 · B 4건)을 전부 반영했습니다. 무엇이 어떻게 결정됐는지는 **`DESIGN_REPLY_2026-07-27.md`를 먼저 읽으세요.** 브랜드색은 그레이프 → **스카이 #0EA5E9**로 전환 완료입니다.

## 왜 자꾸 변형되나 → 해결
1. 프로토타입이 실제 스택(RN/NativeWind)과 달라 Claude Code가 "번역"하며 드리프트 → **토큰을 단일 소스로 고정**(`wavely.tokens.ts/.json`).
2. 핸드오프가 "재현해줘"라 재해석 여지 → **충실도 규칙을 CLAUDE.md에 못 박음**(`CLAUDE_RULES.md`).
3. 4개가 따로 노는 느낌 → **아키텍처로 연결 명시**(`ARCHITECTURE.md`).

## 이 폴더
| 파일 | 용도 |
|---|---|
| `wavely.tokens.ts` | **단일 진실 소스**(TS). theme.ts와 동일. 코드에서 import. |
| `wavely.tokens.json` | 같은 토큰(JSON). ui-config·웹 주입용. |
| `CLAUDE_RULES.md` | repo `CLAUDE.md`에 붙여넣을 **변형 금지 규칙** + 세션 프롬프트. |
| `ARCHITECTURE.md` | ①②③ 공유 Supabase 연결 + 데이터 모델, ④ 별개. |
| `assets/wavely-logo.png` | 공식 로고(스카이 스퀘어클 + 2줄 웨이브). icon.svg(벡터)/logo.png(512²) · 4 surface 공통. |
| `DESIGN_REPLY_2026-07-27.md` | **개발 회신에 대한 답 + 변경 요약.** 이 폴더의 진입점. |
| `WEB_SHELL.md` + `와벨리 웹.html` | 소비자웹 셸 — 사이드바 2진입점 · 아바타 2상태 · 컴팩트 모드 |

## 기능별 스펙 (surface 교차)
| 파일 | 용도 |
|---|---|
| `ALBA_JOB_TAB.md` + `와벨리 알바탭.html` | 알바(구인구직) 탭 · §8 칩 다중선택 · §9 업종색 범위 |
| `FESTIVAL_TAB.md` + `와벨리 축제탭 v2.html` | 축제 이벤트 탭 — 오렌지 테마 + 상태 5종 |
| `NEIGHBORHOOD_LEVEL.md` + `와벨리 동네레벨 v3.html` | **동네레벨** — 레벨·테두리·칭호·뱃지·배경 (cosmetic-only) · 배경 3레이어 v3 · 앱 링/도감 포함 |
| └ `NEIGHBORHOOD_LEVEL_BG_DEVNOTE.md` | 배경 v3 **개발노트** — 값 조정 다이얼·신규 배경 추가·QA·롤백 경로 |

> 목업 파일명의 **가장 높은 버전 번호**가 현재 정본입니다(동네레벨은 `v3`, 나머지는 `v2`). 번호가 낮거나 없는 동명 파일은 이전 릴리스본이며 구현 대상이 아닙니다.

## 4개 surface 와 각 핸드오프(별도 폴더에 프로토타입 포함)
- **① 앱** (Expo RN) → `design_handoff_wavely/` (프로토타입 + Tag 컴포넌트 + 화면별 규칙 + 로고 적용)
- **② 소비자 웹** (Expo Web/반응형) → `design_handoff_wavely_web/`
- **③ 관리자 웹** (사장님·광고주, 광고 집행 + N지수) → `design_handoff_wavely_admin/`
- **④ 마케팅 사이트** (정적, 별개) → `design_handoff_wavely_landing/`

> ①②③ 은 같은 Supabase에 붙는 한 제품. ④ 만 별도 배포.

## 추천 작업 순서 (Claude Code)
0. `DESIGN_REPLY_2026-07-27.md` 로 이번 변경 범위를 먼저 파악.
1. `wavely.tokens.ts` 를 repo `src/constants/`에 두고 theme.ts가 이를 쓰도록 정렬.
2. `CLAUDE_RULES.md` 블록을 repo `CLAUDE.md`에 추가.
3. **한 번에 한 화면**: 해당 핸드오프 폴더의 프로토타입 HTML을 열어두고 1:1 재현.
4. 완료마다 프로토타입과 diff 보고 → 어긋나면 그 화면만 재작업.
5. ②③ 는 Supabase Realtime 구독으로 실시간 연결(ARCHITECTURE.md).
