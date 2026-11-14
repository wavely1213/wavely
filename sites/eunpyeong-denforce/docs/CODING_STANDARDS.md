# CODING_STANDARDS.md — 코딩 표준

> **목적**: 코드를 작성·수정할 때의 스타일과 품질 기준.
> AI가 생성하는 코드가 사람이 짠 기존 코드와 구분되지 않게 하는 것이 목표다.
> **우선순위**: 기존 코드 컨벤션 > 이 문서 > 언어 커뮤니티 관례. 충돌 시 상위를 따르고 보고한다.

---

## 1. 공통 원칙

- **읽는 사람(=미래의 소유자) 기준으로 작성한다.** 영리한 코드보다 뻔한 코드.
- **YAGNI**: 지시받지 않은 확장 포인트·추상화·설정 옵션을 미리 만들지 않는다.
- **일관성 우선**: 같은 문제는 프로젝트 안에서 같은 방식으로 푼다. 기존 유사 코드를 먼저 찾아 패턴을 따른다.
- 함수는 한 가지 일만. 대략 40줄을 넘으면 분리를 검토한다 (기계적 강제는 아님).
- 매직 넘버·매직 문자열 금지 — 의미 있는 상수로 추출한다.

## 2. 네이밍

TypeScript / React 기준.

| 대상 | 규칙 | 예 |
|---|---|---|
| 변수·함수 | camelCase (Python은 snake_case) | `getUserPosts` / `get_user_posts` |
| 클래스·타입 | PascalCase | `PostRepository` |
| 상수 | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| 파일 | 컴포넌트 PascalCase(`MatchRow.tsx`), 그 외 camelCase/소문자(`repo.ts`), 스타일 `X.module.css` | `MatchRow.tsx` |
| 불리언 | is/has/can 접두 | `isPublished` |

- 이름은 축약하지 않는다 (`usr` ✗ → `user` ✓). 관례적 축약(`id`, `url`, `db`)은 허용.
- 한국어 도메인 용어의 영문 표기는 `DOMAIN_KNOWLEDGE.md` 용어집을 따른다 (같은 개념 = 같은 이름).

## 3. 포매팅·린트

- 포매터/린터 설정 파일이 진실의 원천이다: `eslint.config.mjs` (eslint-config-next). 포매터 미도입 — 2칸 들여쓰기·큰따옴표·세미콜론 유지
- 포맷 논쟁은 하지 않는다 — 도구가 정한 대로 따른다.
- 수정하지 않은 코드까지 재포맷해서 diff를 오염시키지 않는다.

## 4. 주석

- **"왜"를 설명하는 주석만 작성한다.** 코드를 한국어로 번역하는 주석 금지.
- 우회책·제약이 있는 코드에는 이유와 `KNOWN_ISSUES.md` 참조를 남긴다.
- 공개 API·복잡한 함수에는 문서화 주석(JSDoc/docstring)을 단다.
- 주석 처리된 죽은 코드는 남기지 않는다 (git이 기억한다).
- `TODO(이슈참조):` 형식만 허용. 막연한 `TODO: 나중에`는 금지 — `KNOWN_ISSUES.md`로 보낸다.

## 5. 에러 처리

- 에러를 조용히 삼키지 않는다 (`catch {}` 금지). 처리하거나, 로깅 후 재던지거나, 상위로 전파한다.
- 사용자에게 보이는 에러 메시지와 내부 로그를 구분한다. 내부 정보(스택, 쿼리)를 사용자에게 노출하지 않는다.
- 예상 가능한 실패(검증 실패, 404 등)와 예상 불가 버그를 구분해서 다룬다.
- 에러 처리 패턴: 없는 리소스는 `notFound()`; 그 외는 Next 기본 에러 경계

## 6. 로깅

- 로깅 도구: 없음
- 레벨 기준 — `error`: 즉시 조치 필요 / `warn`: 이상 징후 / `info`: 주요 이벤트 / `debug`: 개발용.
- **개인정보·시크릿·토큰은 절대 로그에 남기지 않는다** (`SECURITY_GUIDELINES.md`).
- 커밋 전 임시 디버그 출력(console.log, print)은 제거한다.

## 7. 언어별 세부 규칙

### TypeScript / Next.js
- strict 모드 유지, `any` 금지
- import 순서: 외부 → `@/` 절대경로 → 상대경로
- 기본은 서버 컴포넌트. 상태가 필요한 것만 `"use client"` (현재 Header, NewsTabs, PlayersPreview)
- 동적 라우트 params 는 Promise — `await params`. 타입은 `PageProps<"/route">`
- 색·간격은 `var(--토큰)` 만 사용. 컴포넌트 CSS 에 hex 금지 (`src/styles/tokens.css` 에만)
- 이미지는 `next/image`
