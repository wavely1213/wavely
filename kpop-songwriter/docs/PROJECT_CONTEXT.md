# PROJECT_CONTEXT.md — 프로젝트 맥락

> **목적**: AI가 프로젝트의 배경·목표·기술 환경을 빠르게 파악하는 문서.
> 새 세션 시작 시, 또는 "왜 이렇게 되어 있지?"라는 의문이 들 때 읽는다.
> **갱신 시점**: 프로젝트 방향·스택·구조가 바뀔 때마다 즉시.

---

## 1. 프로젝트 개요

- **이름**: kpop-songwriter (화면 이름: K-pop 작곡 노트)
- **한 줄 설명**: K-pop 곡의 컨셉·가사·편곡·멜로디·음색을 만들고 Suno·DAW용 제작 패키지로 내보내는 브라우저 앱
- **개발 형태**: 1인 개발 + AI 협업
- **현재 단계**: MVP 개발 (v0.2 — 작사 + 작곡·편곡·레퍼런스)

## 2. 목표와 대상

- **해결하려는 문제**: 작곡 프로그램(DAW)을 다루지 못하는 사람도 K-pop 곡을 원하는 대로 만들고, 실제 발매까지 이어 가게 한다.
- **대상 사용자**: 소유자 본인(Suno 유료 사용자), 이후 작곡 초보자
- **핵심 기능 (우선순위순)**:
  1. AI 작사 + 곡 구조·멤버 파트 분배 + 라임·음절 체크
  2. 편곡(코드·에너지·악기·드럼·베이스), 멜로디 피아노롤, 악기 음색, 재생
  3. 레퍼런스 곡 분석(BPM·키·에너지) + 메모, AI 편곡에 반영
  4. 내보내기: Suno 가사·스타일 복사, zip 패키지(가사·스타일·MIDI·WAV 데모·프로젝트·안내서)
  5. 곡·버전 관리 (계정 저장)
- **명시적으로 하지 않을 것 (Non-goals)**: 자체 AI 음원 생성 모델, 레퍼런스 곡의 멜로디·가사 복제, 별도 서버·DB

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | JavaScript (ES2020 모듈) | 타입스크립트 미사용 |
| 프론트엔드 | 바닐라 JS + DOM 도우미 `h()` | 프레임워크 없음 |
| 오디오 | Web Audio API (신디사이저 직접 구현) | 샘플 파일 없음 |
| 백엔드 | 없음 | claude.ai 아티팩트 런타임 사용 |
| 데이터베이스 | 아티팩트 `db` capability (사용자별 비공개 경로) | 실패 시 localStorage |
| 인증 | claude.ai 계정 (`user` capability) | |
| AI | 아티팩트 `sample` capability (보는 사람의 Claude 사용량) | API 키 없음 |
| 배포/호스팅 | claude.ai 아티팩트 (단일 HTML) | |
| 빌드 | esbuild (IIFE 번들 → HTML에 인라인) | |

> 스택 변경은 반드시 `DECISION_LOG.md`에 이유와 함께 기록한다.

## 4. 저장소 구조 (최상위)

```
/src/index.template.html  페이지 뼈대 (<title>, 폰트, STYLES/SCRIPT 자리)
/src/styles.css           전체 스타일 (토큰 → 컴포넌트)
/src/js                   앱 코드 (ARCHITECTURE.md 참고)
/build.mjs                src → dist/(아티팩트) 또는 dist-web/music/(웹, `web` 인자)
/src/web-head.html        웹 빌드 전용 <head> (base /music/, 설명, 아이콘)
/vercel.json              웹사이트 단독 배포 설정
/assets/samples           악기 샘플 묶음(JSON, base64 MP3)과 출처
/tools/fetch-samples.mjs  샘플 다시 받기 (ffmpeg 필요)
/tests                    단위·엔진·화면 테스트
/docs                     개발 지침·기록 문서
```

상세 모듈 구조와 의존 방향은 `ARCHITECTURE.md` 참고.

## 5. 실행 환경

- **로컬 개발 환경 준비**: `npm install` → `npm run build` → `dist/index.html`을 브라우저로 열기 (AI·계정 저장·다운로드는 claude.ai 안에서만 동작, 로컬에선 localStorage로 대체)
- **필요한 환경변수**: 없음
- **실행 명령어**: `AGENTS.md` 5번 항목과 동일하게 유지
- **배포 방법 (두 갈래)**:
  1. claude.ai 아티팩트: `npm run build` → `dist/index.html` + `dist/samples/*`를 Artifact 도구로 같은 URL에 재발행
  2. 웹사이트 mulgyeol.kr/music: `npm run build:web` → `dist-web/music/`. 소유자 작업:
     - Vercel에서 새 프로젝트를 만들고 Root Directory를 `kpop-songwriter`로 지정 (설정은 이 폴더의 `vercel.json`이 사용됨)
     - mulgyeol.kr을 서비스하는 `wavely-web` 저장소의 vercel.json `rewrites`에 추가:
       `{ "source": "/music/:path*", "destination": "https://<새 프로젝트>.vercel.app/music/:path*" }`
       그리고 `redirects`에 `{ "source": "/music", "destination": "/music/", "permanent": true }` — 끝 슬래시 없는 주소도 서비스 워커 범위(/music/) 안으로 보내야 오프라인에서 열린다
     - 웹에서는 AI 기능이 꺼져 있다 (서버 키 결정 전, ROADMAP 4번)
     - 설치형(PWA): `dist-web/music/`의 `manifest.webmanifest`·`sw.js`·아이콘이 같이 배포돼야 한다. 리라이트 뒤에서도 `/music/sw.js`가 mulgyeol.kr 같은 출처로 보이므로 동작한다. 배포 뒤 폰 브라우저에서 "홈 화면에 추가"로 확인 (D-016)

## 6. 외부 서비스·연동

| 서비스 | 용도 | 키 관리 위치 |
|---|---|---|
| claude.ai 아티팩트 런타임 | AI 호출·저장·사용자·다운로드 | 키 없음 (사용자 세션) |
| Google Fonts | Black Han Sans, IBM Plex Sans KR/Mono | 키 없음 |
| Suno (앱 밖) | 최종 음원 생성 — 앱은 붙여넣을 텍스트와 WAV 데모를 만든다 | 해당 없음 |

## 7. 참고 링크

- 배포된 앱: https://claude.ai/artifact/U99DZzp2sPA6eTteXfEeyQ (소유자 전용)
- 기획: 대화 기록 (2026-10-07) — 요구사항 요약은 DECISION_LOG D-001~D-006
