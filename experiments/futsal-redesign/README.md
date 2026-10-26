# 한국풋살연맹 홈페이지 리디자인 시안 (실험)

원본 http://www.futsal.or.kr/ 첫 화면의 **콘텐츠는 그대로** 두고, UI/UX만 접근성 중심으로 다시 구성한 비공식 시안이다.
와벨리 앱·웹과 무관한 독립 실험이며, 와벨리 코드·디자인 토큰·Supabase·배포(`public/futsal`, `vercel.json`)를 쓰지 않는다.

공유 링크(비공식 시안 배너 포함): https://claude.ai/artifact/LUytaoEKFtP9MQwfiVzaPS

## 구성
- **첫 화면**(`index.html`) + **메뉴 페이지 31개 + 구단 상세 14개**. 메뉴 페이지는 원본의 하위 탭을 모두 옮겼다.
- 게시판(공지사항·대회소식·심판공지사항·경기규칙·역대전적·대회 사진)과 NEWS는 **전체 목록과 글 본문**까지 들어 있다(검색·쪽 나눔).
- 포토 368장, 심판목록·전체클럽현황·전국풋살구장은 전체 표(검색·지역 필터).
- 이미지는 저장하지 않는다. 배포본은 `/o/…` 주소를 Vercel 이 원본(`http://www.futsal.or.kr/…`)에서 대신 받아 HTTPS로 내보낸다(`vercel.json` rewrites).
- 원본으로 연결만 하는 것: 첨부파일 내려받기, 동영상 재생, 대회 상세(leagueRead), 로그인·회원가입, 산하 시도연맹 사이트.

## Vercel 배포
- 정식 주소: https://futsal-redesign.vercel.app (누구나 공개, 상단 비공식 시안 배너·검색 노출 차단 유지)
- 별도 프로젝트 `futsal-redesign`(와벨리 `wavely` 프로젝트와 분리). 같은 GitHub 저장소를 쓰지만 Root Directory가 이 폴더다.
- 빌드: `python3 tools/build_web.py` → 출력 `dist/web`
- 설정은 이 폴더의 `vercel.json`(저장소 루트 `vercel.json`보다 우선). 이 폴더에 변경이 없는 커밋은 빌드를 건너뛴다(`ignoreCommand`).

## 구조
| 경로 | 내용 |
|---|---|
| `src/index.html` · `src/page.html` | 첫 화면 / 하위 페이지 골격 |
| `src/partials/` | 공용 헤더·푸터 |
| `src/css/` | `fonts`(KFA고딕) · `tokens`(코트 색 체계·글자 크기·아이콘·라이트/다크) · `base` · `header` · `layout` · `components` · `sidebar` · `footer` · `page`(하위 페이지) · `page-struct`(구조화 화면) |
| `src/js/config.js` | 후원사·푸터 등 고정 콘텐츠(원본 문구 그대로) |
| `src/js/util.js` · `tabs.js` · `menu.js` · `theme.js` | 공용 헬퍼(원본 경로 → 새 페이지 연결 포함), ARIA 탭, 내비게이션, 라이트/다크 |
| `src/js/sections/` | 첫 화면 섹션(hero · sidebar · content · players · footer) |
| `src/js/pages/` | 하위 페이지: `shell`(하위 탭·쪽 나눔·검색) · `views`(글·게시판·뉴스·포토·동영상·표) · `views-struct`(구단·대회·중계·풋살장·산하단체·후원사·규정) · `page-main` |
| `docs/UX_ANALYSIS.md` | 하위 페이지 UI/UX 분석과 페이지별 조치 |
| `data/menu.json` | 메뉴(원본 그대로) — JS·파이썬이 같이 쓴다 |
| `data/data.json` | 첫 화면 데이터 |
| `data/site/` | 하위 페이지 데이터(`<slug>.json`, `posts/<slug>/<id>.json`) |
| `assets/img/` | 첫 화면 이미지(뉴스·포토·후원사·로고) |
| `tools/fetch.sh` · `tools/parse.py` | 첫 화면 데이터 수집·변환 |
| `tools/crawl.py` · `tools/parse_site.py` · `tools/sitelib.py` | 하위 페이지 수집(목록 전 쪽·상세) → 정리(스크립트·인라인 스타일 제거, 링크 변환) |
| `tools/structure.py` | 원본 배치용 표를 페이지 종류별 구조 데이터로(구단·대회·중계·풋살장·산하단체·후원사·규정 등) |
| `tools/build.py` | 첫 화면 한 장짜리(`dist/index.html`, `--artifact`) — 메뉴는 원본으로 연결 |
| `tools/build_web.py` | 배포용 여러 페이지(`dist/web`) |
| `tools/serve.py` | `dist/web` 로컬 확인(이미지 `/o/` 대신 받기 포함) |
| `tools/e2e.js` · `tools/e2e_site.js` | 첫 화면 35항목 / 하위 페이지 전체 점검 |

`raw/`, `dist/`는 생성물이라 커밋하지 않는다.

## 사용
```bash
cd experiments/futsal-redesign
python3 -I tools/crawl.py all          # 원본 전체 다시 받기(선택, 약 30분 — 이미 받은 주소는 건너뜀)
python3 -I tools/parse_site.py         # data/site 갱신
python3 -I tools/build_web.py          # dist/web
python3 -I tools/serve.py 8765 &       # http://127.0.0.1:8765
node tools/e2e_site.js http://127.0.0.1:8765
python3 -I tools/build.py && node tools/e2e.js dist/index.html <스크린샷 폴더>
```

## 원본과 달라진 점 (UI/UX만)
- **배치는 K리그 홈페이지(kleague.com) 구성을 따름**: 유틸리티 바 → 로고 줄 → GNB → 히어로(원본 NEWS 3건) → 좌측 사이드바(FK CUP 최근 경기 결과·팀 순위·득점/경고 TOP5, 부문 탭) + 본문(소식·대회일정·선수기록·포토·바로가기) → 후원사 띠 → 사이트맵 푸터.
- **색은 원본 사이트의 두 색만, 의미 있는 자리에**(2026-10-26 다시 정리):
  - KFL 로고 남색 #021A59: 제목·채운 면(주 버튼·현재 쪽·배번·조직도 회장)·푸터 / 연맹 주황 #C2410C(원본 조직도·단계 표시의 주황): "지금 위치" 밑줄과 순위·기록 강조 / 파랑 #1C4E9E: 본문 링크 / 노랑 #FFC72C: 경고 기록. 바탕 흰색, 옅은 면 #F1F4FA
  - 서체: KFA고딕(Regular·Bold, `assets/fonts`, 사이트 전체 — 소유자 지정). 제목·숫자는 Bold. 글자 크기는 13·14·16·18·21·24·30·40px 음계.
  - 기준선 하나: 로고·메뉴·위치·제목·탭·본문·표·푸터가 모두 같은 왼쪽 선에서 시작. 글은 최대 720px, 표·카드는 전체 폭
  - 히어로: 흰 바탕에 제목(왼쪽)과 사진(오른쪽), 사진을 글자로 덮지 않음
  - 나머지는 조용히: 그림자·그라데이션·장식 화살표·영문 머리표(NEWS)·분류 중복 표기 제거, 목록은 선으로만 나누고 카드는 대회일정·사이드바 기록만. 아이콘은 선 2px 한 벌(KFL.icon / --ico-*).
- 화면 문구 중 원본에 없는 것: TOP5 1위 표시 "1위", 섹션 제목 "최근 경기 결과", "팀 순위", "득점 TOP5", "경고 TOP5", "소식", "바로가기", 버튼 "경기기록", 배지 "경기종료"(점수가 기록된 경기)
- 기본 글자 16px(원본 14px), 터치 영역 44px 이상, 키보드 포커스 표시, 본문 바로가기, 이미지 대체 텍스트
- 라이트/다크: 처음엔 시스템 설정을 따르고, 상단 로그인 옆 "다크 모드 켜기"로 전환(선택은 브라우저에 기억). 떠 있는 버튼은 내용을 가려서 쓰지 않음
- 메뉴: hover 대신 클릭·키보드로 여닫기(Esc로 닫힘), 모바일은 전체 메뉴 + 아코디언
- 뉴스: 원본처럼 히어로 슬라이드로 두되 자동으로 넘기지 않음(이전/다음·점 버튼)
- FK CUP: 사이드바 카드마다 부문 탭, 최근 경기부터 날짜별 묶음·승리팀 강조
- 긴 표는 10줄 + "전체 보기", 선수기록에 이름·팀명 검색
- 하위 페이지: 위치 → 큰 제목 → 하위 메뉴 탭(색 띠 없음), 글은 폭 72자·줄 간격 1.8로 읽기 쉽게, 원본의 배치용 표·인라인 글꼴·빈 줄은 걷어냄
- 게시판·뉴스·포토·표는 검색과 쪽 번호, 표는 지역 필터와 모바일 카드 보기, 포토는 크게 보기(키보드 ←→·Esc)
- 첫 화면: 문서 순서를 소식 → 기록으로(모바일·화면낭독기에서 소식이 먼저), 기록 카드는 처음에 적게 보이고 ‘전체 보기’
- 하위 페이지: 원본 배치용 표를 풀어 같은 종류는 같은 크기 칸으로(자세한 내용 `docs/UX_ANALYSIS.md`). 새 문구: "연혁" "임원진" "선수단 N명", 대회 목록 안내 한 줄. 원본이 그림 한 장이던 조직도·연령대 분포도·기대효과는 그림 속 글자를 옮겨 적어 화면으로 다시 그림(`tools/structure.py` 의 `ORG`·`AGE_PYRAMIDS`·`EFFECTS`)
- 새 UI 요소: 상단 "바로가기"(원본 메뉴 6개를 꺼낸 것), FK CUP 선수 표의 "팀명은 FK CUP 출전 기준 소속입니다." 안내

## 알려진 이슈
- **KFA고딕 웹 사용 조건 미확인**: 폰트 메타데이터는 "Copyright KFA. All rights reserved. (Sandoll)". 은평 덴포스 사이트(`sites/eunpyeong-denforce`)에서 쓰던 파일을 그대로 가져옴. 웹폰트 사용·재배포 허용 여부는 명시 없음.
- **이미지는 원본 서버에 의존**: 배포본 이미지는 원본에서 그때그때 받아 온다(저장하지 않음). 원본이 내려가거나 파일을 지우면 그 이미지는 보이지 않는다.
- 하위 페이지 데이터도 수집 시점(2026-10-24) 기준이다. 원본에 새 글이 올라오면 `crawl.py` → `parse_site.py`를 다시 돌려야 한다.
- **선수 소속 불일치(원본 데이터)**: FK CUP 강원FS 경기기록에 이한울·유경동·이주찬이 강원FS로 출전한 것으로 나오지만, FK리그 구단소개와 선수기록(누적)에서는 셋 다 경기LBFS 소속이다. 대회별 별도 등록인지 원본 입력 오류인지 원본만으로는 판단 불가 → 데이터는 원본 그대로 두고 FK CUP 표에 기준 라벨만 표시.
- 데이터는 수집 시점 고정이며 원본과 실시간 연동하지 않는다.
- 선수기록(누적)은 원본도 범위를 표기하지 않는다(요청명 `AllLeagueResultList`로 전체 리그 누적으로 추정).
