# 덴포스 피그마 플러그인 (D-066, docs/FIGMA_SYNC.md 약속 C)

피그마 파일 `d7A7Hc34KQ9jR2sDFkFaXI` 에서 쓰는 개발용(비공개) 플러그인. 비밀 키 없음, 네트워크는 `https://eunpyeong-fs.com` 만.

| 버튼 | 하는 일 |
|---|---|
| 데이터 불러오기 → 포스터 만들기 | `GET /api/figma/feed` 를 읽어 `05 Posters` 의 템플릿(MATCH DAY / 경기결과 / WELCOME / GOOD LUCK)을 복제해 `#필드` 레이어를 채운다. 복제본 이름은 `채움 …`, 템플릿 오른쪽에 놓인다. 이미지는 `/api/figma/image` 중계로 받는다 |
| 토큰 내보내기 | 로컬 변수(Color/Space/Radius/Layout/Font, 모드 Desktop/Mobile) → tokens.json 모양 JSON. 복사 또는 `figma-variables.json` 저장 |
| 토큰 가져오기 | tokens.json → 변수 (없으면 만들고, 다르면 고친다). 비워 두면 빌드 때 넣은 `design/tokens.json`. 다른 변수를 참조하는 별칭은 덮지 않고 알려만 준다 |
| KFA 글꼴 적용 | 파일 전체의 글꼴 스타일과 텍스트 레이어에서 Noto Sans KR 을 KFAGothic TTF 로 바꾼다 (Medium 이하 Regular, SemiBold 이상 Bold). 바꾼 스타일/레이어 수와 실패 목록을 보여 준다 |

필드/템플릿 이름 규칙은 `docs/FIGMA_SYNC.md` B-1 ~ B-3.

## 빌드 (sites/eunpyeong-denforce 에서)

```
npm run figma:tokens    # tokens.css → design/tokens.json (토큰을 바꿨을 때)
npm run figma:plugin    # → figma-plugin/dist/code.js, dist/ui.html
```

- 새 의존성 없이 저장소의 typescript 로만 묶는다 (`scripts/figma/plugin-bundle.ts`). `dist/` 는 커밋한다 — 받는 사람이 빌드 없이 바로 설치할 수 있게. `npm test` 가 dist 가 최신인지 확인한다.
- 피그마 API 타입은 `src/figma.d.ts` 에 쓰는 부분만 적었다. 타입 검사: `npx tsc --noEmit -p figma-plugin`.
- 화면 색은 빌드 때 `src/styles/tokens.css` 를 넣는다 (ui.html 에 색 하드코딩 금지).

## 설치 (피그마 데스크톱 앱 필요 — 웹에서는 개발 플러그인을 불러올 수 없다)

1. 이 저장소를 내려받는다 (또는 `figma-plugin/` 폴더만).
2. 피그마 데스크톱 › 파일 열기 › 메뉴 Plugins › Development › **Import plugin from manifest…** › `figma-plugin/manifest.json`.
3. 이후 Plugins › Development › **Eunpyeong Denforce Sync** 로 실행.
4. 코드가 바뀌면 다시 내려받기만 하면 된다 (같은 manifest 를 다시 불러올 필요 없음).

## KFA 글꼴 설치 ('KFA 글꼴 적용' 전에 한 번)

피그마 원격 작업에서는 KFA고딕을 쓸 수 없어 디자인 세션이 Noto Sans KR 로 임시 스타일을 만들었다. 소유자 컴퓨터에서 바꾼다.

1. 소유자가 가진 KFA고딕 글꼴 파일(Regular, Bold — 데스크톱용 TTF/OTF)을 컴퓨터에 설치한다 (Windows: 파일 오른쪽 클릭 › 설치, Mac: 더블 클릭 › 서체 설치).
   - 저장소의 `src/fonts/*.woff2` 는 웹용이라 컴퓨터 설치용이 아니다. 글꼴 파일은 이 저장소나 플러그인에 새로 넣지 않는다 — KFA 라이선스상 제3자 배포 금지 (KNOWN_ISSUES I-007).
2. 피그마 데스크톱 앱을 다시 연다. 글꼴 목록에 패밀리 이름 **KFAGothic TTF** (스타일 Regular, Bold)가 보이면 된다.
3. 플러그인 › 'KFA 글꼴 적용'. 두 스타일 중 하나라도 없으면 '글꼴이 설치되어 있지 않습니다'라고 알리고 아무것도 바꾸지 않는다.

## 주의

- 포스터 데이터/이미지는 운영 사이트에 `/api/figma/feed`, `/api/figma/image` 가 배포된 뒤부터 된다.
- 피그마는 PNG/JPEG/GIF 만 넣을 수 있다. WebP 로 올린 사진은 건너뛰고 화면에 알려 준다.
- 텍스트 레이어의 글꼴(KFAGothic TTF 등)이 컴퓨터에 없으면 그 레이어는 건너뛴다.
