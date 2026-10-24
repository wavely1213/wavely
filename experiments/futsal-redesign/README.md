# 한국풋살연맹 홈페이지 리디자인 시안 (실험)

원본 http://www.futsal.or.kr/ 첫 화면의 **콘텐츠는 그대로** 두고, UI/UX만 접근성 중심으로 다시 구성한 비공식 시안이다.
와벨리 앱·웹과 무관한 독립 실험이며, 와벨리 코드·디자인 토큰·Supabase·배포(`public/futsal`, `vercel.json`)를 쓰지 않는다.

공유 링크(비공식 시안 배너 포함): https://claude.ai/artifact/LUytaoEKFtP9MQwfiVzaPS

## Vercel 배포
- 별도 프로젝트 `futsal-redesign`(와벨리 `wavely` 프로젝트와 분리). 같은 GitHub 저장소를 쓰지만 Root Directory가 이 폴더다.
- 빌드: `python3 tools/build.py --web` → 출력 `dist/web`
- 설정은 이 폴더의 `vercel.json`(저장소 루트 `vercel.json`보다 우선). 이 폴더에 변경이 없는 커밋은 빌드를 건너뛴다(`ignoreCommand`).

## 구조
| 경로 | 내용 |
|---|---|
| `src/index.html` | 페이지 골격 |
| `src/css/` | `tokens`(K리그 색 체계·라이트/다크) · `base` · `header` · `layout` · `components` · `sidebar` · `footer` |
| `src/js/config.js` | 메뉴·후원사·푸터 등 고정 콘텐츠(원본 문구 그대로) |
| `src/js/util.js` · `tabs.js` · `menu.js` · `theme.js` | 공용 헬퍼, ARIA 탭, 내비게이션, 라이트/다크 전환 |
| `src/js/sections/` | 섹션별 렌더러(hero · sidebar · content · players · footer) |
| `src/js/main.js` | 진입점 |
| `data/data.json` | 원본에서 수집한 데이터(2026-10-24) |
| `assets/img/` | 원본 뉴스·포토·후원사·연맹 로고 이미지 |
| `tools/fetch.sh` | 원본 응답을 `raw/`에 저장 |
| `tools/parse.py` | `raw/` → `data/data.json` |
| `tools/build.py` | 모듈을 한 파일로 묶음(`dist/index.html`, `--artifact` 시 `dist/artifact.html`, `--web` 시 `dist/web/index.html`) |
| `tools/e2e.js` | Playwright 점검 35항목(데스크톱 1280px·모바일 390px) |

`raw/`, `dist/`는 생성물이라 커밋하지 않는다.

## 사용
```bash
cd experiments/futsal-redesign
bash tools/fetch.sh            # 원본 최신 데이터 받기(선택)
python3 -I tools/parse.py      # data/data.json 갱신
python3 -I tools/build.py      # dist/index.html (로컬 미리보기)
python3 -I tools/build.py --artifact   # dist/artifact.html (공유 링크용)
python3 -I tools/build.py --web        # dist/web/index.html (Vercel 배포용: 배너 + noindex)
node tools/e2e.js dist/index.html <스크린샷 폴더>
```

## 원본과 달라진 점 (UI/UX만)
- **레이아웃은 K리그 홈페이지(kleague.com)를 기준으로 재구성**: 유틸리티 바 → 로고 줄 → 네이비 GNB → 히어로(원본 NEWS 3건) → 좌측 사이드바(FK CUP 최근 경기 결과·팀 순위·득점/경고 TOP5, 부문 탭) + 본문(소식·대회일정·선수기록·포토·바로가기) → 후원사 띠 → 사이트맵 푸터. 색은 네이비 #001C48 · 레드 #EE2529 · 바탕 #F2F3F6
- 화면 문구 중 원본에 없는 것: 섹션 제목 "최근 경기 결과", "팀 순위", "득점 TOP5", "경고 TOP5", "소식", "바로가기", 버튼 "경기기록", 배지 "경기종료"(점수가 기록된 경기)
- 기본 글자 17px, 터치 영역 44~48px, 키보드 포커스 표시, 본문 바로가기, 이미지 대체 텍스트
- 라이트/다크: 처음엔 시스템 설정을 따르고, 오른쪽 아래 버튼으로 전환(선택은 브라우저에 기억)
- 메뉴: hover 대신 클릭·키보드로 여닫기(Esc로 닫힘), 모바일은 전체 메뉴 + 아코디언
- 뉴스: 원본처럼 히어로 슬라이드로 두되 자동으로 넘기지 않음(이전/다음·점 버튼)
- FK CUP: 사이드바 카드마다 부문 탭, 최근 경기부터 날짜별 묶음·승리팀 강조
- 긴 표는 10줄 + "전체 보기", 선수기록에 이름·팀명 검색
- 새 UI 요소: 상단 "바로가기"(원본 메뉴 6개를 꺼낸 것), FK CUP 선수 표의 "팀명은 FK CUP 출전 기준 소속입니다." 안내

## 알려진 이슈
- **선수 소속 불일치(원본 데이터)**: FK CUP 강원FS 경기기록에 이한울·유경동·이주찬이 강원FS로 출전한 것으로 나오지만, FK리그 구단소개와 선수기록(누적)에서는 셋 다 경기LBFS 소속이다. 대회별 별도 등록인지 원본 입력 오류인지 원본만으로는 판단 불가 → 데이터는 원본 그대로 두고 FK CUP 표에 기준 라벨만 표시.
- 데이터는 수집 시점 고정이며 원본과 실시간 연동하지 않는다.
- 선수기록(누적)은 원본도 범위를 표기하지 않는다(요청명 `AllLeagueResultList`로 전체 리그 누적으로 추정).
