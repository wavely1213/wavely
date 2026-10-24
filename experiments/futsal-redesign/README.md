# 한국풋살연맹 홈페이지 리디자인 시안 (실험)

원본 http://www.futsal.or.kr/ 첫 화면의 **콘텐츠는 그대로** 두고, UI/UX만 접근성 중심으로 다시 구성한 비공식 시안이다.
와벨리 앱·웹과 무관한 독립 실험이며, 와벨리 코드·디자인 토큰·Supabase·배포(`public/futsal`, `vercel.json`)를 쓰지 않는다.

공유 링크(비공식 시안 배너 포함): https://claude.ai/artifact/LUytaoEKFtP9MQwfiVzaPS

## 구조
| 경로 | 내용 |
|---|---|
| `src/index.html` | 페이지 골격 |
| `src/css/` | `tokens`(색·크기·라이트/다크) · `base` · `layout` · `components` |
| `src/js/config.js` | 메뉴·후원사·푸터 등 고정 콘텐츠(원본 문구 그대로) |
| `src/js/util.js` · `tabs.js` · `menu.js` | 공용 헬퍼, ARIA 탭, 내비게이션 |
| `src/js/sections/` | 섹션별 렌더러(home · fkcup · players · footer) |
| `src/js/main.js` | 진입점 |
| `data/data.json` | 원본에서 수집한 데이터(2026-10-24) |
| `assets/img/` | 원본 뉴스·포토·후원사·연맹 로고 이미지 |
| `tools/fetch.sh` | 원본 응답을 `raw/`에 저장 |
| `tools/parse.py` | `raw/` → `data/data.json` |
| `tools/build.py` | 모듈을 한 파일로 묶음(`dist/index.html`, `--artifact` 시 `dist/artifact.html`) |
| `tools/e2e.js` | Playwright 점검 26항목(데스크톱 1280px·모바일 390px) |

`raw/`, `dist/`는 생성물이라 커밋하지 않는다.

## 사용
```bash
cd experiments/futsal-redesign
bash tools/fetch.sh            # 원본 최신 데이터 받기(선택)
python3 -I tools/parse.py      # data/data.json 갱신
python3 -I tools/build.py      # dist/index.html (로컬 미리보기)
python3 -I tools/build.py --artifact   # dist/artifact.html (공유 링크용)
node tools/e2e.js dist/index.html <스크린샷 폴더>
```

## 원본과 달라진 점 (UI/UX만)
- 기본 글자 17px, 터치 영역 44~48px, 키보드 포커스 표시, 본문 바로가기, 이미지 대체 텍스트, 라이트/다크
- 메뉴: hover 대신 클릭·키보드로 여닫기(Esc로 닫힘), 모바일은 전체 메뉴 + 아코디언
- 뉴스: 자동 슬라이드 → 3건 동시 노출
- FK CUP: 부문 선택 + 탭(경기일정·득점·경고·퇴장·경기순위), 경기일정은 날짜별 묶음·승리팀 강조
- 긴 표는 10줄 + "전체 보기", 선수기록에 이름·팀명 검색
- 새 UI 요소: 상단 "바로가기"(원본 메뉴 6개를 꺼낸 것), FK CUP 선수 표의 "팀명은 FK CUP 출전 기준 소속입니다." 안내

## 알려진 이슈
- **선수 소속 불일치(원본 데이터)**: FK CUP 강원FS 경기기록에 이한울·유경동·이주찬이 강원FS로 출전한 것으로 나오지만, FK리그 구단소개와 선수기록(누적)에서는 셋 다 경기LBFS 소속이다. 대회별 별도 등록인지 원본 입력 오류인지 원본만으로는 판단 불가 → 데이터는 원본 그대로 두고 FK CUP 표에 기준 라벨만 표시.
- 데이터는 수집 시점 고정이며 원본과 실시간 연동하지 않는다.
- 선수기록(누적)은 원본도 범위를 표기하지 않는다(요청명 `AllLeagueResultList`로 전체 리그 누적으로 추정).
