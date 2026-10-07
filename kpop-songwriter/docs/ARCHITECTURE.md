# ARCHITECTURE.md — 아키텍처

> **목적**: 코드가 어떻게 조직되어 있고, 무엇이 무엇에 의존해도 되는지 정의한다.
> 구조 변경·새 모듈 추가·데이터 흐름 관련 작업 전에 반드시 읽는다.
> **갱신 시점**: 레이어/모듈/데이터 흐름이 바뀔 때. 코드와 문서가 다르면 문서를 고친다.

---

## 1. 아키텍처 개요

단일 페이지 브라우저 앱. 상태(`state.js`)가 곡 목록을 들고, 화면(views)은 상태를 읽어 DOM을 다시 그린다.
변경은 항상 `mutate()`를 거치고, 자동 저장(1.2초 디바운스)으로 저장소에 쓴다.
음악은 곡 데이터 → 이벤트 타임라인 → (실시간 재생 | WAV 렌더 | MIDI) 순으로 흐른다.

```
[views/*] ──mutate()──▶ [state.js] ──save──▶ [store.js] ─▶ db capability / localStorage
    │                        ▲
    ├─▶ [ai.js, ai-music.js] ─┘ (결과 검사 후 mutate)   ─▶ sample capability (Claude)
    ├─▶ [music/player.js] ─▶ [music/timeline.js] ─▶ [music/synth.js] ─▶ Web Audio
    └─▶ [package.js] ─▶ midi.js · pack.js(wav, zip) · suno.js ─▶ downloads capability
```

## 2. 레이어와 책임

| 레이어 | 위치 | 책임 | 하면 안 되는 것 |
|---|---|---|---|
| 화면 | `src/js/views/`, `src/js/app.js` | DOM 생성, 입력 받기, `mutate()` 호출 | 저장소 직접 접근, 음악 계산 |
| 상태 | `src/js/state.js` | 곡 목록, 현재 곡, 자동 저장, 버전 | DOM 조작 |
| 저장 | `src/js/store.js` | db/localStorage 읽기·쓰기 | 데이터 가공 |
| 도메인(가사) | `structure.js`, `lyrictools.js`, `suno.js`, `constants.js` | 구조·분배·음절·라임·Suno 텍스트 | DOM, 저장 |
| 도메인(음악) | `src/js/music/` | 이론·패턴·편곡 데이터·타임라인·신스·재생·MIDI·분석·패키징 | DOM (예외: 없음), 저장 |
| AI | `ai.js`, `ai-music.js`, `aijob.js` | 프롬프트 작성, 응답 검사, 진행 중 작업 관리 | 검사 안 된 응답을 상태에 쓰기 |

## 3. 의존 방향 규칙

- views → state / ai / music / 도메인 → dom.js (공통 도우미)
- `music/`은 views·state를 import 하지 않는다. (`player.js`는 상태 대신 곡 객체를 인자로 받는다)
- `aijob.js`만 예외적으로 `state.refresh()`를 부른다 (진행 표시용).
- 순환 의존이 생기면 구현을 멈추고 구조를 먼저 보고한다.

## 4. 주요 모듈

| 모듈 | 위치 | 역할 |
|---|---|---|
| 앱 셸 | src/js/app.js | 탭, 곡 목록, 재생 위치 표시 |
| 상태 | src/js/state.js | mutate/refresh, 자동 저장, 버전 저장·복원·이전 형식 이전 |
| 저장소 | src/js/store.js | 곡 문서 + 버전 하위 컬렉션 |
| 이론 | src/js/music/theory.js | 키·스케일·코드 이름·느낌별 코드 진행 |
| 악기/패턴 | music/instruments.js, patterns.js | 악기 목록·음색 종류, 드럼·베이스 프리셋 |
| 편곡 데이터 | music/arrangement.js | 섹션 기본값, 정규화, 빠른 바꾸기 |
| 타임라인 | music/timeline.js | 곡 → 음표 이벤트 (재생·WAV·MIDI 공통) |
| 신스 | music/synth.js | Web Audio 악기 음색, 악기별 공유 필터 |
| 재생/렌더 | music/player.js | 룩어헤드 실시간 재생, 2초 단위 오프라인 렌더 |
| MIDI | music/midi.js | Type 1 SMF, 악기별 트랙 |
| 패키징 | music/pack.js, package.js | WAV 인코딩, 무압축 zip, 제작 패키지 |
| 분석 | music/analyze.js | 레퍼런스 BPM·키·에너지·저음·밝기 |
| 샘플 | music/samples.js | samples/*.json 불러오기·디코딩, 악기·음색 → 묶음 매핑 |
| 음량 측정 | music/loudness.js | BS.1770 통합 LUFS, 4배 오버샘플링 트루 피크 |
| 마스터링 | music/master.js, music/dsp.js, music/dsp-worker.js, views/master.js | master.js: 디코딩·EQ·컴프(오디오 API) + 워커 호출. dsp.js: 리미터·음량 맞춤·앞뒤 정리(숫자만, 워커에서 실행) |
| 앨범 모델 | album/model.js | 앨범·트랙, 발매 일정표, 발매 전 점검표, 메타데이터 CSV |
| 커버 | album/cover.js | 3000×3000 템플릿 캔버스 → JPG |
| 발매 준비 | album/release.js, album/session.js | 마스터 규격 점검, 가사지·크레딧, 제출 zip, AI 홍보 문구 |
| 앨범 화면 | views/album/* | 수록곡·정보·커버·싱크 가사·일정·홍보·제출 탭 |
| 번안 가사 | translate/mora.js, translate/translate.js, views/translate.js | 일본어·영어 버전: 줄 수·음 수(음절·모라)를 원문에 맞춘 AI 번안, 원문 비교, Suno용 가사·스타일 |
| 맞춤법 점검 | optimize/spelling.js, views/spelling.js | AI가 확실히 틀린 맞춤법·띄어쓰기만(노래 말투 제외), 하나씩·모두 고치기, 가사 변경 감지 |
| 줄 점검 공통 | optimize/linecheck.js | AI가 짚은 줄을 실제 가사 줄에 맞추기, 상태(none/stale/flagged/clear), 줄 바꾸기 |
| 유사 표현 점검 | optimize/similarity.js, views/similarity.js | AI가 유명 곡과 비슷한 줄을 짚음(참고용), 제안으로 바꾸기·괜찮음 표시, 가사 변경 감지 |
| 트랙 순서 추천 | album/order.js, views/album/tracks.js | BPM·평균 에너지·키·길이로 순서 점수, 8곡까지 전수 탐색(그 이상은 두 곡 바꾸기 반복), 지금보다 나을 때만 제안 |
| 발매 후 성과 | album/stats.js, views/album/stats.js | 날짜별 트랙 누적 재생 기록, 늘어난 수·비중·그래프, 반응 좋은 곡을 취향 기록(편곡·코러스)으로 넣어 다음 곡에 반영 |
| 지분 시트 | album/splits.js, views/album/meta.js | 역할(작사·작곡·편곡)마다 여러 명이면 % 입력, 안 적으면 똑같이, 합 100% 점검, split_sheet.csv |
| 가사집 | album/booklet.js, views/album/submit.js | 커버·트랙 목록·곡마다 가사·크레딧을 인쇄용 HTML(A4, 쪽 나눔)로, 제출 패키지에 booklet.html |
| 캘린더 파일 | album/ics.js, views/album/plan.js | 발매 일정 → .ics (하루 종일 + 9시 알림, 끝낸 일정 제외, 75바이트 접기) |
| 싱크 가사 | album/lrc.js, album/lyrics.js, views/album/sync.js | 마스터를 들으며 줄마다 탭 → song.sync 저장, LRC 파일·제출 패키지 포함, 가사 변경 감지 |
| 웹 설치·오프라인 | src/web/(manifest·sw·icon), assets/web/(PNG 아이콘), build.mjs, app.js | 웹 빌드만: 홈 화면 추가, 서비스 워커(화면 네트워크 먼저·샘플 보관본 먼저), D-016 |
| 전체 백업·복원 | backup.js, views/backup.js, music/pack.js(unzip) | 곡(버전 포함)·앨범·취향을 파일 하나로, 덮어쓰지 않고 합치는 복원, 가져오기(json·zip) |
| 버전 비교 | textdiff.js, views/versions.js | 줄 단위 LCS 비교로 버전 → 지금 빠진 줄·새 줄 표시 |
| 되돌리기 | state.js (undo/redo), views/undo-buttons.js | 곡·앨범마다 최근 40단계, 타이핑은 2초 묶음. 머리말 ↶↷ + Ctrl+Z |
| 취향 학습 | learn/taste.js, learn/context.js | 반응 기록·통계·프롬프트 블록·JSONL, AI 모듈이 취향을 읽는 연결점 |
| 반응 UI | learn/feedback.js, learn/summarize.js, views/taste.js, music/melodytext.js | 👍/👎 막대, 줄 단위 ♥, 멜로디 고침 기록, 선호 쌍 내보내기(learn/taste.js preferencePairs), 고친 내용 추적, AI 취향 정리, 내 취향 화면 |
| 가사 최적화 | optimize/lyricscore.js, optimize/improve.js, optimize/calibrate.js | 섹션·곡 채점과 고칠 점, 오른 것만 반영하는 자동 개선, 내 가사로 줄 길이 기준 보정 |
| 보컬 음역 | music/range.js | 멤버 음역, 섹션 음역(겹침), 음역 밖 음 찾기·옮기기 |
| 레퍼런스 음색 맞추기 | music/tonematch.js, music/analyze.js(toneOf), views/master.js | 레퍼런스·원본의 저음(150Hz↓)·고음(2.5kHz↑) 비율 차이 → 마스터링 EQ('ref' 설정) |
| 소리 점검 | music/qc.js, music/master.js(masterWarnings), views/master.js | 원본 하드 클리핑 구간 수, 결과 스테레오 상관 |
| 숏폼 하이라이트 | music/highlight.js, views/master.js | 0.25초 음량으로 가장 신나는 15·30초(터지는 지점 가산), 시작은 직전 조용한 순간, 페이드 넣어 WAV |
| 테이크 비교 | music/takes.js | Suno 테이크의 BPM·키·길이를 편곡과 비교해 점수 매기기 |
| 스타일 변형 | variants.js, views/variants.js | Suno 스타일 A/B/C (BPM·키 고정) 만들기·복사·정하기, 테이크 파일 이름에서 변형 찾기 |
| 컨셉 아이디어 | ai-concept.js, views/concept.js | 아이디어가 없을 때 AI가 서로 다른 컨셉 3개(제목·주제·스토리·분위기·키워드·훅), 고르면 컨셉 칸 채움 |
| 앨범 진행 단계 | workflow/album-progress.js, views/album/index.js | 점검표 오류를 탭별 단계로, 다음 할 일 바로 가기 |
| 원클릭 초안 | workflow/draft.js | 컨셉 → 가사·편곡·멜로디·Suno 스타일을 차례로 AI로 채움 (단계마다 바로 반영) |
| 도움말 | help.js | 용어 설명 "?" (details 요소) |
| 진행 단계 | workflow/progress.js | 곡 하나의 발매까지 7단계 완료 판단·다음 할 일 |
| 플랫폼 | platform/download.js, platform/blobstore.js | 파일 저장 (아티팩트 downloads / 웹 일반 다운로드), 큰 파일 IndexedDB 보관 |
| AI 작사 | ai.js | 가사·스타일·훅·검토 |
| AI 작곡 | ai-music.js | 편곡·멜로디 (응답을 선택지 범위로 검사) |

## 5. 데이터 모델 요약

- Song: `{id, title, concept, members[], sections[], style, music, references[], versions[](메타만), createdAt, updatedAt}`
- Section: `{id, type, members[], text}`
- music: `{bpm, root(0-11), mode, sections{[sectionId]: {bars, chords[도수], seventh, energy 1-5, instruments[], drum, drumGrid, bass, melody[{s,l,d,syl}]}}, sounds{[inst]: {variant, tone, vol, mute}}}`
- 버전 본문: `data/users/<id>/<songId>/versions/<versionId>` (db) — 곡 문서 256KB 한도 때문에 분리
- 저장 경로: `data/users/<id>/<songId>` (본인만 읽기·쓰기)

## 6. 횡단 관심사 처리 방식

- **에러 처리**: capability 호출은 rejected `{code}`를 받아 화면 문구로 바꾼다 (`ai.js` `errorCopy`). 저장 실패는 상태 표시줄에 표시하고 다음 저장에 재시도.
- **로깅**: 없음 (콘솔 출력 금지가 기본)
- **설정**: 상수는 `constants.js`, `music/*.js` 상단에 모은다.
- **인증/인가**: 플랫폼이 처리 (`data/users/{self}` 비공개 규칙)

## 7. AI 작업 시 구조 관련 규칙

1. 새 파일은 기존 레이어 구조에 맞는 위치에 만든다. 새 최상위 디렉터리가 필요하면 먼저 제안한다.
2. 구조를 크게 바꾸는 리팩토링은 `REFACTORING_GUIDELINES.md` 절차를 따르고 사전에 계획을 보고한다.
3. 이 문서에 없는 패턴을 새로 도입할 때는 도입 이유를 `DECISION_LOG.md`에 남긴다.
4. 아티팩트 제약: 외부 스크립트는 허용된 CDN만, fetch·이미지·미디어 외부 로드 불가, `alert/confirm/prompt` 불가, 다운로드는 `downloads` capability로만 (허용 확장자에 .mid/.wav 없음 → zip).
