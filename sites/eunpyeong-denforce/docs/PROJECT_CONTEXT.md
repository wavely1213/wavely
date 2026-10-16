# PROJECT_CONTEXT.md — 프로젝트 맥락

> **목적**: AI가 프로젝트의 배경·목표·기술 환경을 빠르게 파악하는 문서.
> 새 세션 시작 시, 또는 "왜 이렇게 되어 있지?"라는 의문이 들 때 읽는다.
> **갱신 시점**: 프로젝트 방향·스택·구조가 바뀔 때마다 즉시.

---

## 1. 프로젝트 개요

- **이름**: 서울은평 덴포스 구단 홈페이지 (`sites/eunpyeong-denforce`)
- **한 줄 설명**: FK리그 풋살팀 서울은평 덴포스의 공식 웹사이트
- **개발 형태**: 1인 개발 + AI 협업
- **현재 단계**: 운영 준비 — 공개 사이트 배포(https://eunpyeong-denforce.vercel.app) + Supabase 연결 완료. 선수단·경기 결과·순위·연혁은 실데이터(한국풋살연맹 + 구단 인스타그램), 선수 사진은 대기, 스폰서 로고는 6곳 중 5곳 등록(덴포스스포츠 대기). 관리자 대시보드 최종 점검 진행 중

## 2. 목표와 대상

- **해결하려는 문제**: 구단 공식 채널 부재(구 도메인 seouleunpyeongzdsports.com 만료). 경기·선수·소식·스폰서 정보를 한 곳에서 제공
- **대상 사용자**: 팬·지역 주민, 스폰서/제휴 담당자, 입단·아카데미 문의자, 언론
- **핵심 기능 (우선순위순)**:
  1. 경기 일정·결과·순위
  2. 구단 소식(공지·뉴스·사진·영상)
  3. 선수단·코칭스태프
  4. 구단소개·연혁·스폰서·문의
- **명시적으로 하지 않을 것 (Non-goals)**: 현재 단계에서 일반 회원가입·티켓 판매·쇼핑몰 (필요 시 별도 결정)

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript (strict) | |
| 프론트엔드 | Next.js 16.4 App Router + React 19, CSS Modules, KFA고딕(self-host) | `cacheComponents` 켜짐 |
| 백엔드 | Next 서버 액션 (관리자 쓰기) | 공개 읽기는 `src/lib/repo.ts` |
| 데이터베이스 | Supabase Postgres (전용 새 프로젝트) + Storage `media` | 미설정 시 `src/data` 정적 데이터로 동작 |
| 인증 | Supabase Auth 이메일+비밀번호, 관리자 허용 목록 | 공개 가입 없음 |
| 배포/호스팅 | Vercel 프로젝트 `eunpyeong-denforce` (서울 icn1), https://eunpyeong-denforce.vercel.app · 공식 도메인 https://eunpyeong-fs.com (D-024) | 사이트 전용 `vercel.json`. 와벨리 프로젝트와 별개 |
| 기타 | 없음 | |

> 스택 변경은 반드시 `DECISION_LOG.md`에 이유와 함께 기록한다.

## 4. 저장소 구조 (최상위)

```
/src/app/(site)  공개 페이지 (헤더·푸터 레이아웃)
/src/app/admin   관리자 (login, (panel)/<섹션>)
/src/proxy.ts    /admin 세션 쿠키 갱신
/src/components  UI 컴포넌트 (layout / ui / home / match / news / player)
/src/config      사이트 설정·메뉴 (site.ts)
/src/fonts       KFA고딕 woff2
/src/data        정적 데이터 (구단·선수·경기·소식·스폰서)
/src/lib         repo.ts(공개 조회), data/(소스·변환), admin/(권한·검증·이미지), supabase/(클라이언트)
/src/styles      디자인 토큰(tokens.css)·공용 본문 스타일
/src/types       도메인 타입
/public/brand    엠블럼
/public/photos   구단 사진
/supabase        migrations/(스키마·RLS), seed.sql, config.toml(로컬), tests/rls-check.mjs
/tests           단위 테스트 (npm test)
/docs            개발 지침·기록 문서 (+ SUPABASE_SETUP.md)
```

상세 모듈 구조와 의존 방향은 `ARCHITECTURE.md` 참고.

## 5. 실행 환경

- **로컬 개발 환경 준비**: `cd sites/eunpyeong-denforce && npm install && npm run dev`
- **필요한 환경변수**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (둘 다 없으면 정적 데이터 모드). service_role 키는 쓰지 않는다
- **실행 명령어**: `AGENTS.md` 5번 항목과 동일하게 유지
- **배포 방법**: Vercel 프로젝트 `eunpyeong-denforce` (Root Directory `sites/eunpyeong-denforce`). Git 자동 배포 미연결(KNOWN_ISSUES I-011) — 연결 전에는 Vercel 대시보드 Redeploy 또는 API 로 배포. DB 는 Supabase 프로젝트 `eunpyeong-denforce` (와벨리 DB 와 별개)

## 6. 외부 서비스·연동

| 서비스 | 용도 | 키 관리 위치 |
|---|---|---|
| Supabase | DB·로그인·이미지 저장소 | Vercel 환경변수 (`docs/SUPABASE_SETUP.md`) |
| Instagram (@eunpyeong_denforce) | 외부 링크, 26-27 선수단 변동·소식 출처 | 없음 |
| 한국풋살연맹 (futsal.or.kr, HTTP) | 경기 결과·순위·선수 명단·기록 출처 (수동 수집, 이용 허락 확인 필요 I-013) | 없음 |

## 7. 참고 링크

- 기획 문서: 서울은평 풋살팀 스폰서십 제안서(pptx, 구단 제공) — 연혁·조직·국가대표·사진·컬러 출처
- 디자인: 레퍼런스 https://gangwon-fc.com/ (정보구조만 참고, 디자인 복제 금지)
- 운영 대시보드: 사이트 `/admin` (관리자), Supabase 대시보드 (계정·백업)
