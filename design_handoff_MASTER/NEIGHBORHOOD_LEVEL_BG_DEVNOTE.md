# 배경 아이템 v3 — 개발노트 (수정·보완용)

> 대상: `와벨리 동네레벨 v3.html` 배경 3레이어. 스펙 본문은 `NEIGHBORHOOD_LEVEL.md §3-4`, 이 문서는 **"나중에 손댈 때 뭘 어디서 어떻게 바꾸는가"**만 다룹니다.
> 원칙 하나: **손대는 순서는 항상 `--patop` → `--hiop` → 워시 스톱** 입니다. 타일 SVG는 마지막에 건드리세요.

---

## 1. 파일 안에서 어디를 보면 되는가

`와벨리 동네레벨 v3.html` `<style>` 안, `/* ══ 배경 아이템 v3 — 3레이어 ══ */` 블록. 네 덩어리로 순서 고정돼 있습니다.

| 순서 | 블록 | 내용 | 바꾸는 빈도 |
|---|---|---|---|
| 0 | `.bgfx`, `.bgfx .l1/.l2/.l3/.sp` | 레이어 엔진. **키별 값이 없습니다** | 거의 없음 |
| ① | `.bp-*{--patsz;--pat}` | 타일 SVG data-URI | 낮음 |
| ② | `.bp-*{--patc;--patc2}` + `[data-theme=dark] .bp-*` | 틴트 2색 | 중간 |
| ③ | `.bp-*{--patop;--wash;--hi;--hiop;--himode}` | **화려도 다이얼 (여기가 90%)** | 높음 |
| ④ | `@keyframes bgfall/bgfw/bgglow/bgsheen/bgsp` | 모션 3종 | 낮음 |

JS 쪽은 `BGSPEC`(표시용 스펙 문자열) · `RNSTOP`(앱 3스톱) · `BGDOT`(테이블 색점) 세 객체뿐. **CSS를 바꾸면 이 세 곳의 문자열도 같이 고쳐야 화면 H 표와 실물이 어긋나지 않습니다.**

---

## 2. 다이얼 6개 — 이것만 알면 조정 끝

```css
.bp-{key}{
  --patop: .26;                    /* ② 패턴 불투명도 — 무늬 선명도 */
  --wash:  linear-gradient(...);   /* ① 베이스 워시 — 전체 인상·색감 */
  --hi:    radial-gradient(...);   /* ③ 하이라이트 그림 */
  --hiop:  .30;                    /* ③ 세기 */
  --himode: overlay;               /* ③ 합성 — normal | overlay | screen */
  --patsz: 104px 44px;             /* ① 타일 크기 = 무늬 밀도 */
}
[data-theme=dark] .bp-{key}{--patop:.32;--hiop:.34}  /* 다크는 이 두 개만 재정의 */
```

**증상 → 손댈 다이얼**

| 증상 | 조치 |
|---|---|
| 밋밋하다 | `--hiop` +.06 → 그래도면 워시 첫 스톱 % +6 |
| 지저분하다 / 글자가 안 읽힌다 | `--patop` −.04 **먼저**. 워시는 마지막 |
| 다크에서 죽는다 | `[data-theme=dark]`의 `--patop`·`--hiop`만 올림. 라이트 값 건드리지 말 것 |
| 다크에서 뿌옇다 | `--himode:overlay` → `screen`, `--hiop` 하향 |
| 무늬가 너무 잘다 | `--patsz` 확대 (SVG `width/height`와 **반드시 같은 비율**) |
| 색이 브랜드에서 튄다 | `--patc2`만 조정. `--patc`는 §3-4 "장소의 색" 고정 |

**합성 모드 감각** — `normal`=덧칠(비네트), `overlay`=바탕 밝기에 반응하는 광택(lake·founder), `screen`=발광(firework). 다크 배경에서 `overlay`는 약해지고 `screen`은 세집니다.

---

## 3. 새 배경 추가 절차 (기존 키 재사용 금지)

1. **키 확정** — `snake_case`, 기존 9개와 겹치지 않게. 스폰서는 `sponsor_{store}` 예약.
2. **DB** — `_DRAFT_level_system.sql` unlock seed에 한 줄. `kind='background'`.
3. **CSS 4줄** — ①타일 ②틴트 ③다이얼 (+필요시 ④모션). 아래 템플릿:

```css
/* ① */ .bp-newkey{--patsz:80px 80px;--pat:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E … fill='%23000' … %3C/svg%3E")}
/* ② */ .bp-newkey{--patc:#XXXXXX;--patc2:#XXXXXX}
        [data-theme=dark] .bp-newkey{--patc:#XXXXXX;--patc2:#XXXXXX}
/* ③ */ .bp-newkey{--patop:.24;--wash:linear-gradient(160deg,color-mix(in srgb,var(--patc) 22%,var(--bg)),color-mix(in srgb,var(--patc) 8%,var(--bg)) 52%,var(--bg));--hi:…;--hiop:.28}
        [data-theme=dark] .bp-newkey{--patop:.30;--hiop:.32}
```

4. **JS 3곳** — `BGS` 배열(이름·해금문구·소유·태그) → `BGSPEC` → `RNSTOP` → `BGDOT`. 하나라도 빠지면 화면 H에서 `undefined`가 뜹니다.
5. **티어 결정** — 레이어 수와 모션 유무는 §3-4 "등급 비례 스케일" 표를 따릅니다. Lv 20짜리를 3레이어+모션으로 만들면 상위 3종이 죽습니다.

### 타일 SVG 규칙 (어기면 다크가 깨집니다)
- 색은 **`%23000` 하나만**. 알파는 `opacity` 속성으로. 실색은 `--patc`가 칠합니다.
- `#`→`%23`, `<`→`%3C`, `>`→`%3E`, `"`는 `'`로. 줄바꿈 금지(한 줄).
- 타일 경계에서 **상하좌우가 이어져야** 합니다. sakura처럼 흩뿌리는 패턴은 가장자리 요소를 반대편에도 복제.
- `--patsz`는 SVG 고유 크기의 정수배·동일비율만. 비율을 깨면 stroke가 늘어납니다.

---

## 4. 모션 추가·수정

현재 3종. 새로 붙일 때 규칙:

- **`transform`/`opacity`/`background-position`/`mask-position`만** 애니메이션. `width`·`filter`·`box-shadow` 금지(리페인트).
- 반드시 `.bgfx` **안쪽 노드**(`.l2`,`.l3`,`.sp`)에만. 컨테이너에 걸면 콘텐츠가 같이 흔들립니다.
- 주기는 6s 이상. 배경은 시선을 끌면 실패입니다.
- 정지 경로 필수 — 아래 블록에 자동 포함되므로 **새 애니메이션도 `.bgfx` 안에 있으면 그냥 멈춥니다**:
```css
@media(prefers-reduced-motion:reduce){.bgfx>i,.bgfx .sp{animation:none!important}.bp-founder .sp{opacity:.8}}
```
- 잠금 카드(`.is-lock`)에서도 멈춰야 합니다(미보유가 움직이면 광고처럼 보임).
- **sakura 낙하값**: `mask-position 0 0 → 26px 78px`. 78 = 타일 높이. 타일 크기를 바꾸면 **이 값도 같이** 바꿔야 점프가 안 생깁니다.

---

## 5. 앱(RN) 이식 노트

- 상한 **정적 2레이어**. `<Svg>` 안에 `<Rect fill="url(#wash)">` + `<Rect fill="url(#pat)">` 두 장.
- 그라디언트는 `react-native-svg`의 `<LinearGradient>`/`<RadialGradient>`만. **`expo-linear-gradient` 도입 금지**(dev-client 재빌드 유발).
- 3스톱 hex는 §3-4 앱 표가 정본 — 웹 `color-mix`를 앱에서 다시 계산하지 말고 표 값을 그대로 박으세요. 라이트/다크 두 벌.
- `<Pattern>`은 히어로 1개소에서만 마운트. 리스트 셀 안에 들어가는 순간 스크롤이 끊깁니다.
- 앱이 웹보다 평평한 건 정상. 링(§3-3)과 같은 원칙입니다.

---

## 6. 손대기 전 확인 (QA 5줄)

1. 라이트/다크 각각에서 히어로 본문·보조텍스트 대비 **4.5:1**.
2. 도감 스와치(62px)·히어로(전폭) 양쪽에서 무늬가 식별되는가 — 스와치에서만 예쁜 패턴은 실패.
3. `prefers-reduced-motion: reduce`로 전환 → 모든 배경 정지, **정지 상태도 완성형**.
4. 잠금 카드에서 모션·채도가 죽는가(`.is-lock`).
5. 화면 H 표의 숫자와 실제 CSS 값이 일치하는가(BGSPEC 문자열 동기화).

---

## 7. 되돌리기 / 부분 채택

- **전체 롤백**: `와벨리 동네레벨 v2.html`의 `.pat` 블록으로 교체. 키·API·DB가 동일해 데이터 마이그레이션 없음.
- **부분 롤백(권장 안전판)**: 3레이어 구조는 두고 상위 3종의 모션만 끄기 —
  `.bp-sakura .l2,.bp-firework .l2,.bp-firework .l3,.bp-founder .l3,.bp-founder .sp{animation:none}`
- **화려도 일괄 하향**: 각 `.bp-*`의 `--patop`·`--hiop`을 비율로 −20%. 구조는 유지되고 인상만 차분해집니다.

---

## 8. 미결 (결정되면 이 문서부터 갱신)

1. `firework` 해금 인증 주체·방법 — §12-10
2. `sponsor_*` 배경 — 신규 키 + `--patc` 1색 주입 규칙 필요 · §12-11
3. 도감 배경 프리뷰 히어로 실사이즈 확대 여부 — §12-12
