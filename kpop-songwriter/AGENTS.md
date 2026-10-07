# AGENTS.md — AI 에이전트 작업 지침 (진입점)

> 이 저장소는 **1인 개발자가 AI와 협업하여 커뮤니티 서비스 및 프로그램을 개발**하는 프로젝트다.
> 이 파일은 AI 코딩 에이전트(Claude Code, Codex, Cursor 등)가 작업 시 가장 먼저 읽는 진입점이며,
> 세부 규칙은 `docs/` 아래 문서로 분리되어 있다.
>
> **도구별 파일명 주의**: Claude Code는 `CLAUDE.md`를 읽는다. 이 저장소의 `CLAUDE.md`는
> 본 파일을 가리키는 포인터다. 지침 수정은 항상 이 파일과 `docs/`에서만 한다.

---

## 0. 협업 원칙 — 역할과 판단 권한

이 프로젝트의 의사결정 구조는 단순하다. **소유자(개발자)가 결정하고, AI는 실행한다.**

- **판단 권한은 소유자에게 있다.** 기능의 타당성, 제품 방향, 사업적·윤리적 적절성, 법적 준수 책임, 실행 여부의 최종 판단은 모두 소유자의 몫이다. AI는 이 영역에서 결정을 대신하려 하지 않는다.
- **AI의 역할은 실행과 정보 제공이다.** 우려나 리스크가 보이면 **한 번, 한두 문장으로 간결하게** 알린 뒤 소유자의 결정을 따른다. 같은 우려를 반복하거나, 설교하거나, 장황한 경고문을 붙이지 않는다.
- **"가능/불가"는 시도로 증명한다.** 어려워 보인다는 이유로 거절하거나 축소 제안하지 않는다. 우선 지시받은 대로 시도하고, 기술적으로 불가능할 때만 "무엇이, 왜 불가한지 + 가장 가까운 대안"을 보고한다.
- **지시받은 작업이 항상 최우선이다.** 소유자가 말한 작업을 먼저 완료한다. 그 과정에서 발견한 개선거리는 작업을 끝낸 뒤 제안 목록으로만 전달한다.
- 단, AI 플랫폼 자체의 안전 기준(명백한 불법 행위 등)은 이 문서로 변경되지 않는다. 그 외의 모든 회색지대 판단은 소유자에게 넘긴다.

## 1. 프로젝트 한 줄 요약

K-pop 작사·작곡·편곡 노트 — 초보자도 가사·코드·멜로디·편곡을 만들어 Suno·DAW용 패키지로 내보내는 브라우저 앱.
claude.ai 아티팩트로 배포되며, AI는 사용자 본인의 Claude 사용량(`sample` capability)을 쓴다. 바닐라 JS ES 모듈 + esbuild 단일 HTML 번들.

## 2. 문서 맵 — 상황별로 읽어야 할 문서

| 상황 | 읽어야 할 문서 |
|---|---|
| 프로젝트가 처음이거나 맥락이 필요할 때 | `docs/PROJECT_CONTEXT.md` |
| 구조 변경, 새 모듈/레이어 추가 | `docs/ARCHITECTURE.md` |
| 모든 코드 작업 공통 (브랜치·커밋·작업 범위) | `docs/DEVELOPMENT_RULES.md` |
| 코드를 작성/수정할 때 | `docs/CODING_STANDARDS.md` |
| 테스트를 작성/수정/실행할 때 | `docs/TESTING_GUIDELINES.md` |
| 기존 코드를 리팩토링할 때 | `docs/REFACTORING_GUIDELINES.md` |
| 인증·회원정보·사용자 콘텐츠·시크릿을 다룰 때 | `docs/SECURITY_GUIDELINES.md` |
| 라이브러리/패키지를 추가·업데이트할 때 | `docs/DEPENDENCY_POLICY.md` |
| 문서를 작성·갱신할 때 | `docs/DOCUMENTATION_POLICY.md` |
| AI 작업 절차 전반 (계획→구현→검증→기록) | `docs/AI_WORKFLOW.md` |
| 중요한 기술 결정을 내리거나 과거 결정을 확인할 때 | `docs/DECISION_LOG.md` |
| 버그·제약·임시방편을 만나거나 남길 때 | `docs/KNOWN_ISSUES.md` |
| 도메인 용어·서비스 규칙이 헷갈릴 때 | `docs/DOMAIN_KNOWLEDGE.md` |
| 무엇을 왜 만드는지(방향·순서) | `docs/ROADMAP.md` |
| 다음 작업 고르기, 개선점 탐색 결과 기록 | `docs/BACKLOG.md` |

전부 매번 읽을 필요는 없다. 작업 유형에 해당하는 문서만 읽되,
`DEVELOPMENT_RULES.md`와 `AI_WORKFLOW.md`는 모든 작업의 공통 전제다.

## 3. 절대 규칙 (Golden Rules)

1. **지시받은 범위만 수정한다.** 스코프 밖 파일의 "김에 하는 개선"은 금지. 발견한 문제는 `docs/KNOWN_ISSUES.md`에 기록하고 보고만 한다.
2. **파괴적 작업만 사전 확인한다.** 파일/브랜치/데이터 삭제, 히스토리 변경(force push), 운영 DB 마이그레이션, 배포는 명시적 승인 후 수행. 그 외 사소한 결정은 묻지 말고 합리적 기본값으로 진행하되 가정을 결과 보고에 명시한다.
3. **시크릿을 코드·로그·문서에 절대 남기지 않는다.** API 키, 비밀번호, 토큰 발견 시 즉시 보고한다.
4. **검증 없이 완료 선언 금지.** 변경 후 빌드·테스트·린트를 실제 실행해 통과를 확인한 뒤 완료로 보고한다. 실행 불가 시 그 사실을 명시한다.
5. **새 의존성은 임의로 추가하지 않는다.** `docs/DEPENDENCY_POLICY.md` 기준을 따른다.
6. **모호하면 가장 합리적인 해석으로 진행하고 해석을 명시한다.** 해석이 크게 갈리는 경우(공수 차이가 큰 경우)에만 짧게 확인한다.
7. **중요 결정은 `docs/DECISION_LOG.md`에 기록한다.**
8. **기존 코드 컨벤션이 문서와 충돌하면 기존 코드를 따르고** 충돌 사실을 한 줄 보고한다.

## 4. 작업 기본 흐름 (요약)

`이해 → 계획 → 구현 → 검증 → 기록` — 상세 절차는 `docs/AI_WORKFLOW.md` 참고.

- 작업 전: 관련 문서 + 관련 코드를 먼저 읽는다.
- 3단계 이상 작업은 할 일 목록을 먼저 제시하고 진행한다.
- 구현은 작은 단위로 나누고, 단위마다 검증한다.
- 작업 후: 영향받은 문서(`DECISION_LOG`, `KNOWN_ISSUES` 등)를 갱신하고, 결과를 간결하게 보고한다.

## 5. 빌드·테스트·실행 명령어

- 의존성 설치: `npm install`
- 빌드 (아티팩트): `npm run build` → `dist/index.html` / (웹사이트): `npm run build:web` → `dist-web/music/`
- 전체 테스트: `npm test` (빌드 + 단위 + 엔진 + 화면)
- 개별: `npm run test:unit` / `test:album` / `test:learn` / `test:optimize` / `test:workflow` / `test:state` / `test:range` / `test:takes` / `test:lrc` / `test:translate` / `test:backup` / `test:engine` / `test:master` / `test:ai` / `test:ui` / `test:web` / `test:perf`
- 샘플 다시 받기: `npm run samples` (ffmpeg 필요)
- 엔진·화면 테스트는 Playwright(전역 설치)와 Chromium, 마스터링 테스트는 ffmpeg(독립 측정기)가 필요하다.
- 배포: `dist/index.html` + `dist/samples/*`를 claude.ai 아티팩트로 발행 (capabilities: `sample`, `db`, `user`, `downloads`). 배포는 소유자 승인 후에만.
- 린터·포매터: 아직 없음 (`docs/KNOWN_ISSUES.md` I-004)
