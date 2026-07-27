# 와벨리 — 동네레벨(레벨·테두리·칭호·뱃지·배경) 스펙 → Claude Code / 개발 그룹

> 시각·상호작용 단일 근거: **`와벨리 동네레벨 v3.html`** (라이트/다크, 모바일 우선, 자체완결 — 외부 CDN 없음).
> 배경 아이템은 **v3에서 3레이어로 전면 재설계**됐습니다(§3-4). 링·칭호·뱃지·화면 A~G는 v2와 동일합니다.
> 이 문서는 그 목업을 앱(`wavely-frontend/app`)·웹(`wavely-frontend/web`)에 옮기기 위한 명세입니다.
> **최상위 원칙: cosmetic-only.** 레벨·테두리·칭호·배경은 검색 순위·광고 노출·매장 추천에 **어떤 가중치도 주지 않습니다.** 그렇게 "보여서도" 안 됩니다.

---

## 0. 화면 골격

| 코드 | 화면 | 위치 | 상태 |
|---|---|---|---|
| A | 아이템 도감 | 마이페이지 → "도감" 진입 (전체화면) | 확정 |
| B | 프로필 레벨 카드 | 마이페이지 최상단 | 확정 |
| C | 인라인 표시 | 글·댓글 헤더 (커뮤니티 전역) | 확정 |
| D | 레벨업 순간 | 전역 토스트 / 승급 모달 | 확정 |
| E | 동네 리그 | 마이페이지 → "동네 리그" (v2) | **v2 보류** |
| F | 앱(RN) 링 정본 | — (스펙 참조 화면) | 확정 |
| G | 앱 아이템 도감 | 앱 마이페이지 → 전체화면 푸시 | 확정 |
| — | 배경(프로필 패턴) | 도감 3번째 섹션 | **확정 — 9종 전량 채택** |
| H | 배경 레이어 대조표 | — (스펙 참조 화면) | 확정 |

> **배경 아이템 채택(2026-07-27).** 보류를 해제하고 9종 전량을 정본에 포함합니다 → §3-4. `unlocks[].kind`에 `background` 추가, `equip_background(key)` 활성화(§1·§11).
> **배경 v3 재설계(2026-07-27).** 단일 마스크 → **3레이어(워시·패턴·하이라이트)**, 등급 비례 화려도, 모션 3종. 키 9개·API·DB 계약은 **불변**.

---

## 1. 데이터 계약 (고정)

화면당 1콜.

```ts
get_level_card(user_id) -> {
  nickname: string,
  level: number,                    // 정수 Lv
  tier: 'bronze'|'silver'|'gold'|'platinum'|'diamond',
  xp: number,                       // 누적 총 XP
  xp_into_level: number,            // 현재 레벨 안에서 쌓은 XP
  xp_span: number,                  // 현재 레벨의 총 구간
  progress_pct: number,             // 0~100 (서버 계산값 그대로 사용)
  equipped_title: string | null,    // 칭호 key
  equipped_border: string | null,   // 테두리 key (null이면 tier로 폴백)
  unlocks: { kind: 'badge'|'title'|'border', key: string, earned_at: string }[]
}
```

- **착용 변경**: `equip_title(key)` / `equip_border(key)` — 서버에서 보유 여부 재검증 후 반영. 미보유 key는 403.
- `equipped_border`가 null이면 **클라이언트가 `tier`로 폴백**해서 그림 (예: tier=silver → `t-silver`).
- 잠긴 아이템은 목록에 내려주지 않아도 되며, **조건·진행률은 클라이언트 상수표(§5) + 별도 진행 필드**로 표시합니다. 진행률이 서버 계산이 필요한 항목(리뷰 수, 좋아요 수, 동 순위)은 아래를 함께 내려주세요:

```ts
get_level_progress(user_id) -> {
  review_verified: number,   // 맛집 헌터 (목표 30)
  likes_received: number,    // 사랑받는 글쟁이 (목표 500)
  comments: number,          // 수다쟁이 (목표 300)
  invites: number,           // 전도사 (목표 10)
  dong_rank: number,         // 터줏대감 (목표 상위 3)
  store_visits: { store_id: string, count: number, rank: number }[]  // 이달의 단골 / 스폰서 테두리
}
```

### 배경 (1차 포함으로 승격)
`unlocks[].kind`에 `'background'` 포함 + `equip_background(key)` API 활성. 스키마는 §11 참조. 미보유 키가 오면 서버가 `plain`으로 폴백합니다.

---

## 2. 레벨 · 등급

| tier | 라벨 | 레벨 구간 |
|---|---|---|
| bronze | 브론즈 | Lv 1–9 |
| silver | 실버 | Lv 10–19 |
| gold | 골드 | Lv 20–34 |
| platinum | 플래티넘 | Lv 35–49 |
| diamond | 다이아 | Lv 50+ |

**XP 곡선 (제안 — 백엔드 확정 필요)**
`xp_span(L) = 100 + 25 × L`, 50 단위 반올림. (Lv17 → 525 ≈ **500**, 목업 기준값)
`progress_pct = round(xp_into_level / xp_span × 100)` — **서버가 계산해서 내려주고 클라는 그대로 그립니다.**

**XP 획득 (제안 — 어뷰징 방어 필요)**
글 +10 / 댓글 +3 / 받은 좋아요 +1 / 매장 GPS 인증방문 +15 / 출석 +2.
일일 상한(예: 80 XP), 자기 글 좋아요·삭제된 글 회수·동일 매장 24h 1회 등 방어 규칙은 백엔드 소관.

---

## 3. 테두리 (아바타 원형 링) — 전량

| key | 이름 | 조건 | 종류 | 특수 이펙트 |
|---|---|---|---|---|
| `bronze` | 브론즈 | Lv 1 | 등급 | — |
| `silver` | 실버 | Lv 10 | 등급 | — |
| `gold` | 골드 | Lv 20 | 등급 | — (이중링) |
| `platinum` | 플래티넘 | Lv 35 | 등급 | — (이중링) |
| `diamond` | 다이아 | Lv 50 | 등급 | 홀로그램 회전 + 스파클 2 |
| `founder` | 창단 멤버 | 출시 첫 달 가입 | **재획득 불가** | 금빛 반짝이 2개 역방향 공전 |
| `season_sakura` | 벚꽃 시즌 | 봄(4–5월) 시즌 한정 | 기간 한정 | 꽃잎 4장 낙하 + 좌우 스웨이 |
| `streak_30` | 개근 이웃 | 연속 출석 30일 | 스트릭 | 불씨 3개 상승 |
| `sponsor_*` | 스폰서(매장) | 매장 방문 인증 이벤트 | 매장 한정 | 시그널 펄스 2겹 |

**역할 분리 (디자인 규칙):** 등급 테두리 = **재질(메탈릭)**, 특수 테두리 = **움직임(이펙트)**. 등급에는 이펙트를 붙이지 않습니다(다이아 제외 — 최상위 보상).

### 3-1. 링 구현 레시피
DOM 1개 + 두 개의 의사요소. `--s`(아바타 지름)만 주면 크기가 따라옵니다.

```
.ring        --s / --rw(링두께) / --gap / --rw2 / --gap2 / --rg(링 페인트) / --rg2(외곽링) / --tc(대표색)
.ring::after  외곽 디스크 (rg2)
.ring::before 내부 디스크 (rg)  + box-shadow 0 0 0 var(--gap2) var(--bg)
.ring .face   아바타          + box-shadow 0 0 0 var(--gap)  var(--bg)
```

메탈릭은 `conic-gradient`로 명/암 스톱을 교차시켜 만듭니다. 예 (골드):
```css
--rg: conic-gradient(from 210deg,#9A7518,#F2DA85,#C8991F,#FFF6CE,#A87F1C,#E8C463,#9A7518);
--rg2:#E8C463; --rw:3.5px; --rw2:1.5px; --gap2:1.5px;
```
정확한 값 9종은 목업 `<style>`의 `.t-*` 블록을 **그대로 복사**하세요.

- **호버**: 링이 5s로 1회전 → 재질감 노출. 다이아는 상시 10s 회전. *(이펙트 강도 70% 반영)*
- `--tc`는 카드 배경 틴트·모달 광선·활성 보더 색으로 재사용됩니다. 링을 추가하면 `--tc`를 반드시 함께 정의.

### 3-2. 이펙트 스펙

| 이펙트 | 클래스 | 파티클 | 주기 | 비고 |
|---|---|---|---|---|
| 꽃잎 낙하 | `.fxp` | 4 | 4.2s, delay 0/1.05/2.1/3.1s | `--dx`(좌우 흔들림) `--dy`(낙하거리), 320° 회전 · peak opacity **.66** |
| 불씨 상승 | `.fxe` | 3 | 3.2s, delay 0/.8/1.6s | -32px 상승, scale .5→.25, glow · peak **.66** |
| 금빛 공전 | `.fxo` | 2 | 7.5s / 11s(reverse) | 궤도 반경 다름(inset 1px / 5px) · glow 46% |
| 시그널 펄스 | `.fxs` | 2 | 3.6s, delay 0/1.8s | scale 1→1.8, opacity **.35→0** |
| 다이아 반짝 | `.spk` | 2 | 3.2s, delay 0/1.6s | peak opacity **.72** |
| 승급 컨페티 | `.cft` | 5 | 3.4s | peak opacity **.7** |
| 승급 광선 | `.lvup-rays` | — | 34s | conic 스톱 알파 **19%** |

**밀도 보호 규칙 (중요):**
- 이펙트는 **`--s ≥ 36px`에서만** 렌더. 피드·댓글의 30~34px 링에는 파티클을 붙이지 않습니다.
- 잠긴 아이템은 이펙트·회전 정지 (`.it.is-lock`).
- `prefers-reduced-motion: reduce` → 모든 파티클·회전 정지.
- 파티클은 부모(`.it` / `.eq` / `.lvup`)의 `overflow:hidden`으로 클리핑됩니다. 새 컨테이너에 링을 넣을 땐 클리핑 여부를 확인하세요.
- **이펙트 강도 = 70%로 확정**(2026-07-27). 위 표의 주기·피크 알파가 그 값입니다. 더 줄여야 하면 *주기를 늘리지 말고* 피크 알파부터 낮추세요(움직임의 리듬은 유지).

### 3-3. 앱(RN) 링 — 선형 3스톱 정본 ★

React Native는 `conic-gradient`를 렌더하지 못합니다. **아래 값이 앱의 유일한 근거**이며, conic 스톱에서 임의 발췌하지 마세요.
공통: 축 **135° 대각**(SVG `x1=0 y1=0 x2=1 y2=1`), 스톱 오프셋 **0 / 0.5 / 1**, `stroke-width` **3.5**, 링↔얼굴 간격 **2px**(원 반지름 `r = (s+11-3.5)/2`, 뷰박스 `s+11`).

| key | 시작 (0) | 중간 (0.5) | 끝 (1) | 비고 |
|---|---|---|---|---|
| `bronze` | #F0C9A3 | #B0764A | #8A5330 | 기본 등급 · 모션 없음 |
| `silver` | #F5F8FB | #8E9CB0 | #6E7A8C | 기본 등급 · 모션 없음 |
| `gold` | #FFF6CE | #C8991F | #9A7518 | 기본 등급 · 모션 없음 |
| `platinum` | #F4FCFE | #6FA5B4 | #47818F | 기본 등급 · 모션 없음 |
| `diamond` | #7DD3FC | #F5D0FE | #A7F3D0 | **앱에서 유일하게 회전(10s)** · 무지개색이라 중간값 고정 필수 |
| `founder` | #F2DA85 | #1E3A5F | #5D8FC7 | 웹은 2중 링 → 앱은 단일 링 + 금 메달 |
| `sakura` | #FFF5F8 | #F0A6C0 | #DB6E97 | 메달 병기 · 파티클 없음 |
| `streak` | #FDE9A8 | #E8752F | #B3350A | 메달 병기 · 파티클 없음 |
| `sponsor` | #EAF8FE | #0EA5E9 | #0369A1 | 메달 병기 · 파티클 없음 |

**앱 이펙트 범위 (성능 예산 확정)**

| 항목 | 웹 | 앱(RN) | 사유 |
|---|---|---|---|
| 등급 링 재질 | conic 7스톱 | 선형 3스톱 | RN conic 미지원 |
| 다이아 회전 | 10s | **10s 유지** | 단일 `Animated.loop` · 유일하게 살리는 모션 |
| 특수 파티클(꽃잎·불씨·공전·펄스) | 4종 | **미적용** | 리스트 재사용 셀에서 누적 비용이 큼 → 메달로 대체 |
| 특수 메달 | 적용 | **적용** | 정적 이미지 · 비용 0 |
| 배경 패턴 | CSS mask | `react-native-svg <Pattern>` | 불꽃만 정지 렌더 |
| 승급 모달 광선 | conic 레이 | 미적용 | 방사형 PNG 스프라이트 1장으로 대체 |

> 앱 링이 웹보다 평평해 보이는 것은 **정상**입니다. 억지로 맞추려 스톱을 늘리지 마세요 — 등급 구분만 되면 충분합니다.

### 3-4. 배경 (프로필 패턴) — 9종 전량 · **v3 3레이어** ★

v2의 "마스크 1장 + 틴트 1색" 공식은 폐기합니다. 9종 전부 **① 베이스 워시 · ② 패턴 · ③ 하이라이트** 3층 구조 위에 올리고, **등급이 올라갈수록 층과 모션을 더합니다**(하위는 절제 — 그래야 상위가 빛납니다). 키 9개·API·DB는 그대로입니다(§1·§11).

#### DOM · CSS 계약

배경을 까는 컨테이너에 `bp-{key}` 클래스를 붙이고, 그 안 **첫 자식으로** 레이어 노드를 넣습니다. 컨테이너는 `position:relative;overflow:hidden`, 실제 콘텐츠는 `position:relative;z-index:1`.

```html
<span class="bgfx"><i class="l1"></i><i class="l2"></i><i class="l3"></i>
  <span class="sp" style="left:13%;top:26%"></span>
  <span class="sp" style="left:61%;top:58%;animation-delay:1.15s"></span>
  <span class="sp" style="left:86%;top:19%;animation-delay:2.3s"></span></span>
```
```css
.bgfx{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.bgfx>i{position:absolute;inset:0;display:block}
.bgfx .l1{background:var(--wash,transparent)}                       /* ① 워시 */
.bgfx .l2{background:var(--patc,var(--primary));opacity:var(--patop);
          mask-image:var(--pat);mask-size:var(--patsz);mask-repeat:repeat}  /* ② 패턴 */
.bgfx .l3{background:var(--hi,transparent);background-repeat:no-repeat;background-size:cover;
          opacity:var(--hiop,0);mix-blend-mode:var(--himode,normal)}        /* ③ 하이라이트 */
.bgfx .sp{position:absolute;z-index:2;width:5px;height:5px;border-radius:50%;background:#FFFDF2;
          box-shadow:0 0 9px 2px color-mix(in srgb,var(--g2) 78%,transparent);opacity:0} /* founder 스파클 */
```

- 색은 **SVG 밖**(`--patc` 주색 / `--patc2` 심색)에 둡니다 → 다크모드 자동 대응. SVG 안에는 `%23000`만.
- 워시·하이라이트는 `color-mix(... , var(--bg))`로 배경색에 섞습니다 → 라이트/다크에서 스톱을 따로 쓰지 않아도 톤이 맞습니다.
- `-webkit-mask-*` 프리픽스 병기 필수(사파리).

#### 등급 비례 스케일

| 티어 | 키 | 레이어 | 모션 | 패턴 α (light / dark) |
|---|---|---|---|---|
| 기본 | `plain` | 0 | — | `--patop:0` |
| Lv 1 | `wave` | 1 (패턴만) | — | .18 / .24 |
| Lv 5·15 | `dots` `ripple` | 2 (워시+패턴) | — | .20/.28 · .22/.30 |
| Lv 25·40 | `mountain` `lake` | 3 | 없음(선택 없음) | .26 / .32 |
| 시즌·희소 | `sakura` `firework` `founder` | 3 | **있음** | .30/.36 · .32/.40 · .30/.36 |

#### 배경 9종 정본

| key | 이름 / 조건 | 틴트 `--patc` · `--patc2` (light → dark) | ① 워시 | ② 패턴 타일 | ③ 하이라이트 |
|---|---|---|---|---|---|
| `plain` | 단색 · 기본 | — | — | — | — |
| `wave` | 물결 · Lv 1 | `--primary` · `--primary-deep` | — | 128×44 · stroke 4.6 + 1.7(α.55) | — |
| `dots` | 물방울 · Lv 5 | #38BDF8·#0284C7 (동일) | `linear 166°` patc 20% → patc 7% @56% → bg | 26×26 · **면 3 + 링 1** | — |
| `ripple` | 파문 · Lv 15 | #0EA5E9·#075985 (동일) | `radial 120%×90% at 22% 18%` patc 22% → 8% @46% → bg @78% | 72×72 · 코어 r3.4 + 링 3.4/2.2/1.4 | — |
| `mountain` | 봉의산 능선 · Lv 25 | #3F8F6B·#1F5E48 → #5FBE92·#2F7A5C | `linear 178°` patc2 24% → patc 14% @46% → bg | 180×64 · **능선 면 2겹** + 마루선 1.6 | 비네트 `radial 122%×104% at 50% 16%` transparent 44% → `rgba(6,20,15,.62)` · α .20 / .30 |
| `lake` | 의암호 윤슬 · Lv 40 | #2C7DA0·#14526E → #5AB0D4·#1D6A8C | `linear 200°` patc2 26% → patc 10% @52% → bg | 104×44 · **윤슬 면 6줄** | 광택 `linear 102°` 흰 76% 스트라이프 · `overlay` · α .30 / .34 |
| `sakura` | 벚꽃 흩날림 · 봄 시즌(4–5월) | #DB6E97·#B84B78 → #F5A3C0·#C25C8B | `linear 140°` patc 26% → patc2 12% @56% → bg | 78×78 · **꽃잎 5장 면**(ellipse 2.7×4.6 ×5 rotate 72°) | 블룸 `radial 80%×66% at 76% 10%` #FFF0F6 88% → transparent 70% · α .40 / .28 |
| `firework` | 축제 불꽃 · 마임축제 인증 | #F26D1F·#B3350A → #FF9A5A·#D9481A | **메시 3장** — `radial 72%×82% at 22% 108%` patc 30% + `radial 58%×70% at 84% 6%` patc2 22% + `linear 180°` patc2 10% → bg | 88×88 · 광선 14 + 불티 7 | 글로우 `radial 52%×52% at 50% 60%` #FFD3A1 78% · **`screen`** · α .45 / **.72** |
| `founder` | 창단 물결 · 출시 첫 달 | #C08D12·#7A5806 → #F2DA85·#A8790E | `linear 120°` patc 30% → patc2 14% @48% → bg | 56×56 · **셰브론 면 2겹**(α 1 / .55) | 금 광택 스윕 `linear 100°` #FFF6CE .92 → #FFF .55 · `overlay` · α .40 / .50 **+ 스파클 3** |

> `firework`의 글로우는 **어두울수록 강해집니다**(α .45 → .72). 다크에서 약해 보이면 워시가 아니라 `--hiop`를 조정하세요.

#### 모션 (시즌·희소 3종만)

| key | 대상 | 주기 · 이징 | 값 |
|---|---|---|---|
| `sakura` | ② 패턴 | 15s linear infinite | `mask-position: 0 0 → 26px 78px` (타일 정수배 = 이음매 없음) |
| `firework` | ② 패턴 | 6.5s ease-in-out | `opacity: --patop×.5 ↔ --patop` |
| `firework` | ③ 글로우 | 6.5s ease-in-out (동기) | `opacity: --hiop×.45 ↔ --hiop` · `scale .90 ↔ 1.08` |
| `founder` | ③ 광택 | 7s linear | `background-size:230% 100%` · `background-position 150% → -70%` |
| `founder` | 스파클 3 | 3.4s ease-in-out (delay 0 / 1.15 / 2.3s) | `opacity 0 → .95 @45% → 0` · `scale .4 → 1` |

```css
@media(prefers-reduced-motion:reduce){.bgfx>i,.bgfx .sp{animation:none!important}.bp-founder .sp{opacity:.8}}
```
**정지 상태에서도 완성형이어야 합니다** — reduced-motion에서 스파클은 정적 α .8로 남기고, 나머지는 각 레이어의 기본 α로 멈춥니다.

#### 앱(RN) 대체안 — **정적 2레이어 상한**

`react-native-svg <Pattern>` + 다중 레이어는 비쌉니다. 앱은 **워시 1장 + 패턴 1장**까지, 하이라이트·모션은 웹 전용입니다. ⚠️ `expo-linear-gradient` 미설치 → 그라디언트는 **`react-native-svg`의 `<LinearGradient>`/`<RadialGradient>`**로만 구현합니다(신규 네이티브 의존성 추가 금지).

| key | 앱 / 웹 레이어 | RN 대체 표현 | 워시 3스톱 (light / dark) |
|---|---|---|---|
| `plain` | 0 / 0 | 단색 `var(--bg)` | — |
| `wave` | 1 / 1 | `<Pattern>` 타일 1장(정적) · 그라디언트 없음 | — |
| `dots` | 2 / 2 | `<LinearGradient x1=.12 y1=0 x2=.88 y2=1>` 3스톱 + `<Pattern>` | #E6F6FE / #0F2E42 · #F5FCFF / #0B1C28 · #FFFFFF / #0C0C0E |
| `ripple` | 2 / 2 | `<RadialGradient cx=.22 cy=.18 r=.95>` 3스톱 + `<Pattern>` | #E2F4FC / #0E2C3E · #F4FBFE / #0A1A24 · #FFFFFF / #0C0C0E |
| `mountain` | 2 / 3 | Linear + Pattern · **비네트 생략** | #DDEAE5 / #14332A · #E9F3EF / #0F241E · #FFFFFF / #0C0C0E |
| `lake` | 2 / 3 | Linear + Pattern · 정적 광택 `<Rect opacity=.18>` 1장 허용 | #DBE9F0 / #10303E · #E9F2F6 / #0D2230 · #FFFFFF / #0C0C0E |
| `sakura` | 2 / 3 + 모션 | Linear + 꽃잎 Pattern · **낙하 생략** | #F8DDE7 / #33161F · #F7E7EE / #1E1015 · #FFFFFF / #0C0C0E |
| `firework` | 2 / 3 + 모션 | `<RadialGradient>` 글로우 + Pattern **정지 렌더** · 다크 글로우 opacity .72 | #FBE2D2 / #3A1A0C · #F6E5DC / #1D1210 · #FFFFFF / #0C0C0E |
| `founder` | 2 / 3 + 모션 | 금 `<LinearGradient>` 3스톱 + 셰브론 Pattern · **스윕·스파클 생략** | #F2E7C8 / #3A2F14 · #EFE7D6 / #201B10 · #FFFFFF / #0C0C0E |

> 앱이 웹보다 얌전한 것은 **정상**입니다(링과 같은 원칙 — §3-3). 억지로 맞추려 레이어를 늘리지 마세요.

#### 가드레일 (v3에서도 불변)

> 값 조정·신규 배경 추가·롤백 절차는 **`NEIGHBORHOOD_LEVEL_BG_DEVNOTE.md`**(개발노트)를 먼저 보세요.

1. **가독성** — 워시·하이라이트는 전부 `--bg`에 섞인 값이라 히어로·카드 위 본문 대비는 WCAG AA를 유지합니다. 새 배경을 만들 때도 **콘텐츠가 놓이는 영역의 실효 대비 4.5:1**을 먼저 확인하세요.
2. **적용 범위** — 도감 장착 카드(`.eq`) · 프로필 히어로(`.pf-hero`) · 리그 헤더(`.lg-h`) **세 곳만**. 피드 행·댓글에는 절대 금지.
3. **모션 정지 경로** — 위 `prefers-reduced-motion` 블록 필수. 잠금 카드(`.is-lock`)에서도 모션 정지.
4. **cosmetic-only** — 화려해져도 검색순위·광고노출·매장추천 영향 0(§8 고정 문구 유지).
5. **틴트 원칙** — 틴트는 *장소의 색*(봉의산=녹, 의암호=청, 벚꽃=분홍, 축제=오렌지 #F26D1F로 축제 탭과 동일, 창단=금). 브랜드 스카이 일색 금지.
6. **도감 스와치** — `bp-*`를 **버튼 자신에게** 붙여 `--patc`가 스와치·보더까지 상속되게 합니다. 스와치는 62px 높이 미니 프리뷰(3레이어 그대로).

---

## 4. 칭호 (닉네임 옆 텍스트, 1개 착용)

| key | 칭호 | 조건 | 레어 |
|---|---|---|---|
| `rookie` | 새내기 이웃 | Lv 1 | |
| `guardian` | 동네 지킴이 | Lv 10 | |
| `chatter` | 수다쟁이 | 댓글 300개 | |
| `localboss` | ○○동 터줏대감 | 동 활동 상위 3명 | ★ |
| `hunter` | 맛집 헌터 | 인증 리뷰 30개 | ★ |
| `beloved` | 사랑받는 글쟁이 | 좋아요 500회 받음 | ★ |
| `evangelist` | 전도사 | 친구 초대 10명 | |
| `captain` | 동네 반장 | Lv 20 + 활동 조건 | ★ |
| `regular` | 이달의 단골 | 매장별 30일 방문 1위(**제로섬**) | ★ |

- `localboss`는 동 이름을 주입: `"효자동 터줏대감"`. 서버가 완성된 문자열을 내려주거나 `{dong}` 템플릿 + dong을 함께.
- **레어(★)는 금색 그라디언트 테두리 칩**(`.tchip.rare`), 일반은 소프트 블루(`.tchip`). 피드에서 상위 칭호가 즉시 구분됩니다.
- 칩은 **항상 1줄**. 넘치면 ellipsis. 피드 행 높이는 칭호 유무와 무관하게 동일해야 합니다.

---

## 5. 뱃지 (사실 기반, 자동 수령 · 착용 개념 없음)

인증이웃 · 사장님 · 사업자인증 · 단골 · 오래된주민 · 새내기이웃 · 맛집헌터 · 인기글러 · 동네반장

**뱃지에는 반드시 근거 문구를 붙입니다** (레벨 숫자가 신뢰로 오독되지 않게):

| 뱃지 | 근거 문구 예 |
|---|---|
| 인증이웃 | 휴대폰 · 동네 GPS 인증 완료 |
| 단골 | 검증방문 24곳 · 미트락 외 2곳 30일 연속 |
| 오래된주민 | 효자동 3년차 · 2023.04 가입 |
| 인기글러 | 받은 좋아요 312 · 인기글 4회 |

---

## 6. 아이템 상태 (pill)

| 상태 | 클래스 | 표기 |
|---|---|---|
| 착용중 | `.pill.on` | 블루 그라디언트 "착용중" |
| 보유 | `.pill.own` | 소프트 블루 "보유" |
| 잠김 | `.pill.lock` | 회색 + 진행 문구 ("3레벨 남음", "18 / 30개") |
| 재획득 불가 | `.pill.rare` | 금색 그라디언트 |
| 기간 한정 | `.pill.season` | 벚꽃 그라디언트 |
| 매장 한정 | `.pill.store` | promo 토큰 (warn) |

잠긴 아이템은 **흐리게(opacity .38 + grayscale) + 좌상단 자물쇠 + 진행바 + "무엇을 하면 얻는지"** 를 함께 노출합니다. 진행바만 있고 문구가 없으면 안 됩니다.

---

## 7. 화면별 스펙

### A. 아이템 도감
1. **장착 미리보기 카드** — 착용 테두리 링(58px) + 닉네임 + 착용 칭호 칩 + 등급·Lv 칩 + **수집률 원형 게이지**(`conic-gradient`). 카드 배경은 착용 테두리의 `--tc`로 틴트.
2. **테두리 섹션** — 그리드(모바일 2열 / ≥760px 4열). 카드 = 링 스와치(38px) + 이름 + 조건 + 상태 pill. 특수는 코너 메달리온(별/꽃/불꽃/매장).
3. **칭호 섹션** — 그리드(모바일 2열 / ≥760px 3열). 카드 = 칭호 칩 + 조건 + 상태 pill.
4. 카드 탭 = 즉시 착용(`equip_*` 호출 + 낙관적 업데이트). 칭호는 **같은 칭호 재탭 = 해제**.
5. 하단 **상태 범례** + **cosmetic-only 안내문**(§8, 문구 고정).
6. 착용 변경은 **B·C 화면에 즉시 반영**돼야 합니다(단일 상태 소스).

### B. 프로필 레벨 카드
- **히어로 영역**(테두리 `--tc` 틴트 + 물결 패턴): 링(66px) + 닉네임 + 칭호 칩 + 동/연차 칩 + **Lv·등급 + 진행바 + XP 수치 + 다음 해금 안내**.
- 진행바는 그라디언트 + 광택 스윕 + 발광. `width`는 `progress_pct`.
- **활동 신호 존**(파란 점): 글/댓글/받은 좋아요/인증방문/연속출석 칩. 부제 "모으는 재미 · 꾸미기 전용".
- **신뢰 신호 존**(초록 점): 뱃지 행 + 근거 문구 + 체크. 부제 "와벨리가 확인한 사실".
- 하단 안내문: "레벨은 **얼마나 활동했는지**, 뱃지는 **무엇이 확인됐는지**를 뜻해요. 높은 레벨이 신뢰를 보장하지는 않아요."

### C. 인라인 (글·댓글 헤더)
- `[링 30~34px] [닉네임 12.5px/800] [칭호 칩 sm] … [시간]`
- **익명 글에는 테두리·칭호를 붙이지 않습니다** (`.ring.anon`, 회색 무광 링).
- 이펙트 미적용(§3-2). 행 높이 불변.

### D. 레벨업 순간
- **일반 레벨업 → 토스트**: 링 + "Lv 18 달성" + 다음 등급까지 안내. 상단 중앙, 2.6s 후 자동 소멸.
- **등급 승급 → 모달** (브론즈→실버 등 **전체 5회뿐**): 방사 광선(26s 회전) + 등급 글로우 + 컨페티 5 + 새 테두리 링(76px) + "Lv 20 달성 — 골드 테두리 획득!" + 획득 아이템 2칸 미리보기 + [나중에] / [도감에서 착용].
- 광선·글로우 색은 새 등급의 `--tc`.

### E. 동네 리그 — **v2 보류**
주간 리더보드(동 코호트 24명), 승격존 상위 5 / 강등존 하위 4, 1·2·3위 금은동 메달, 내 행 강조, "종료까지 N일 N시간", 매주 월 0시 리셋. 순위가 노출·추천에 반영되지 않음을 명시.

### F. 앱(RN) 링 정본 — 스펙 참조 화면
목업 F 탭은 **개발용 대조표**입니다(제품 화면 아님). 등급 9종을 웹(conic) ↔ 앱(선형 3스톱) 나란히 44px로 보여주고, 그 아래 스톱 테이블과 앱 이펙트 범위표를 둡니다. 값은 §3-3.

### G. 앱 아이템 도감 — 전체화면 푸시
- 진입: 앱 마이페이지 레벨 카드 → "도감" → **전체화면 푸시**(모달 아님). 좌상단 back, 우상단 "수집 N / M".
- 상단 **장착 미리보기 바**(링 44px + 닉네임 + 칭호 칩 + 등급·Lv 칩). 배경은 착용 배경 패턴이 깔립니다.
- 그 아래 **세그먼트 3분할**(테두리 / 배경 / 칭호) — 각 라벨에 `보유/전체` 카운트 병기. 웹은 세 섹션을 세로로 쌓지만 앱은 세그먼트로 전환합니다(스크롤 길이 억제).
- 그리드 **3열**, 셀 최소 높이 112px. 셀 = 스와치(링 34px / 배경 스와치 44px / 칭호 칩) + 이름 + 상태(`착용중`/`보유`/`N%`).
- 상태 pill은 앱에서 **코너 도트 8px**로 축약합니다(레어=금, 시즌=분홍, 매장=주황, 일반=스카이). 잠김은 좌상단 자물쇠 + 40% 디밍 + 그레이스케일.
- 하단 **고정 확정 바**: 좌측 "변경한 착용 = 테두리 · 배경 · 칭호" 요약, 우측 `저장`. 웹은 즉시 반영이지만 앱은 **저장 시 커밋**합니다(실수 방지).
- 잠긴 셀 탭 → 해금 조건 토스트만. 링 34px이므로 §3-2에 따라 파티클·메달 미렌더.
- 웹 도감과 **데이터·해금 조건은 완전히 동일**해야 합니다. 다른 것은 레이아웃뿐.

---

## 8. 고정 문구 (변경 금지)

- 도감/리그: **"꾸미기 전용이에요. 레벨·테두리·칭호는 검색 순위, 광고 노출, 매장 추천에 어떤 영향도 주지 않아요."**
- 프로필: **"레벨은 얼마나 활동했는지, 뱃지는 무엇이 확인됐는지를 뜻해요. 높은 레벨이 신뢰를 보장하지는 않아요."**
- 리그(v2): **"리그는 순수한 재미예요. 순위는 글 노출이나 매장 추천에 반영되지 않고, 매주 월요일 0시에 초기화됩니다."**

레벨/등급을 매장 정렬·검색 랭킹·광고 입찰의 입력값으로 쓰지 마세요. 어드민 지표에도 노출 금지.

---

## 9. 토큰

- 베이스 색·라운드는 **`wavely-frontend/docs/wavely.tokens.json` 및 `index.css`에서만** 사용. 신규 hex 발명 금지.
- 예외(스펙 §7이 허용한 범위): **등급·특수 테두리의 재질 색**(`--t-*`, conic 스톱)은 신규 콘텐츠로 허용.
- 레어/시즌 pill 색은 **해당 아이템 링 팔레트에서 파생**(`--g1/--g2`, `--sk1/--sk2`). 별도 신규 hex 아님.
- 액센트는 스카이(`--primary #0EA5E9` / dark `#38BDF8`). **2026-07-27 전환 완료** — `wavely.tokens.json` 갱신됨(그레이프 폐기).
- 매핑: #7A2BC4→#0EA5E9 · #641FA6→#0E7490 · #F3EAFB→#EAF7FB · #E6D3F6→#C6E9F7 · (dark) #9D5FE6→#38BDF8 · #C2A2F2→#7DD3FC · #1E1335→#0C2A3F · #2C1E46→#123A52 · rgba(122,43,196,…)→rgba(14,165,233,…).
- **예외(바꾸지 말 것):** 알바 업종색 `사무·기타 #7A2BC4`는 브랜드색이 아니라 업종 구분색입니다(ALBA_JOB_TAB.md §1).
- 배경 틴트 9색(§3-4)과 축제 오렌지 #F26D1F는 목적이 분명한 신규 색으로 허용됩니다.
- 폰트: 앱 Pretendard / 웹 Noto Sans KR. 목업은 CDN 없이 로컬 폴백 스택 사용.

---

## 10. 반응형 · 접근성

- 모바일 우선. ≤760px 단일 컬럼, ≥760px 도감 그리드 확장(테두리 4열).
- 착용 카드는 `<button>`. 잠긴 카드는 `aria-disabled="true"` + 클릭 무시.
- `:focus-visible` 2px 아웃라인. 파티클·패턴은 `pointer-events:none`.
- 라이트/다크 모두 필수. 다크에서 패턴·링은 SVG mask + `currentColor` 방식이라 자동 대응.

---

## 11. DB 스키마 (schema.sql diff)

```sql
-- ── 동네레벨 ──────────────────────────────────────────────
create type unlock_kind as enum ('badge','title','border');   -- v2: ,'background'

alter table profiles
  add column if not exists xp int not null default 0,
  add column if not exists level int not null default 1,
  add column if not exists tier text not null default 'bronze',
  add column if not exists equipped_title text,
  add column if not exists equipped_border text;
  -- v2: add column if not exists equipped_background text;

create table if not exists user_unlocks (
  user_id uuid references profiles(id) on delete cascade,
  kind unlock_kind not null,
  key text not null,                 -- 'gold' | 'guardian' | 'sponsor_meatrak' …
  earned_at timestamptz default now(),
  meta jsonb,                        -- 시즌/스폰서 매장 등 부가정보
  primary key (user_id, kind, key)
);

create table if not exists xp_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  source text not null,              -- 'post'|'comment'|'like_received'|'visit'|'attendance'
  ref_id uuid,
  amount int not null,
  created_at timestamptz default now()
);
create index if not exists xp_events_user_time on xp_events(user_id, created_at desc);
create unique index if not exists xp_visit_daily
  on xp_events(user_id, ref_id, (created_at::date)) where source = 'visit';   -- 동일 매장 1일 1회

create table if not exists attendance (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

-- v2: 동네 리그
-- create table league_weeks (id, dong, starts_on, ends_on);
-- create table league_scores (week_id, user_id, xp, rank, primary key(week_id,user_id));

alter table user_unlocks enable row level security;
create policy "unlocks read all" on user_unlocks for select using (true);
-- 쓰기는 서버(service role) 전용. 클라이언트 insert 금지.
```

**착용 변경 RPC (보유 검증 서버측 필수)**
```sql
create or replace function equip_item(p_kind unlock_kind, p_key text)
returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from user_unlocks
                 where user_id = auth.uid() and kind = p_kind and key = p_key) then
    raise exception 'not owned';
  end if;
  if p_kind = 'title'  then update profiles set equipped_title  = p_key where id = auth.uid(); end if;
  if p_kind = 'border' then update profiles set equipped_border = p_key where id = auth.uid(); end if;
end; $$;
```

---

## 12. 열린 항목 (결정 필요)

1. **XP 곡선·획득량** (§2) — 제안값. 리텐션 목표에 맞춰 백엔드 확정.
2. **어뷰징 방어** — 자기 글 좋아요 제외, 삭제 시 XP 회수, 일일 상한, GPS 스푸핑 방어.
3. **`sponsor_*` 테두리 운영** — 매장이 직접 발행? 와벨리 승인제? 발행 비용/기간 정책. **광고 상품처럼 보이면 cosmetic-only 원칙과 충돌**하므로 문구·배치 주의.
4. **`regular`(이달의 단골) 제로섬** — 매장별 1명. 박탈 시 알림 문구 필요.
5. **시즌 테두리 캘린더** — 벚꽃 외 시즌(여름/축제/겨울) 로드맵.
6. ~~tokens.json 스카이 전환~~ — **완료(2026-07-27).**
7. ~~배경 아이템 보류~~ — **채택(2026-07-27), §3-4에 9종 전량 확정.**
8. **동네 리그**(E) — v2.
9. **앱 배경 타일** — `react-native-svg <Pattern>` 실측 성능 확인 필요(리스트 아닌 히어로 1개소라 문제 없을 전망).
10. **불꽃 배경 해금 판정** — "춘천 마임축제 참여 인증"의 인증 주체·방법 미정(축제 탭 QR? 매장 방문?).
11. **`sponsor_*` 배경** — 매장 스폰서 배경 신설 여부. 만든다면 **기존 키 재사용 금지**(`sponsor_store` 등 신규 키), 매장색 주입은 `--patc` 1색만 받고 워시·하이라이트는 시스템 고정값으로 계산하는 팔레트 규칙 필요.
12. **도감 배경 미리보기 크기** — 62px 스와치만으로는 화려도 판단이 어렵습니다. 탭 시 **히어로 실사이즈 프리뷰**(바텀시트)로 확대할지 결정 필요.

---

## 13. 파일

| 파일 | 용도 |
|---|---|
| `와벨리 동네레벨 v3.html` | **시각 SSOT.** 링 CSS·이펙트·**배경 3레이어**·앱 링/도감을 여기서 그대로 복사 |
| `NEIGHBORHOOD_LEVEL_BG_DEVNOTE.md` | **배경 v3 개발노트** — 다이얼 6개·신규 배경 추가 절차·모션 규칙·QA·롤백. 수정할 때 여기부터 |
| `와벨리 동네레벨 v2.html` | 이전 정본 — 배경 단일 마스크 시기. 구현 대상 아님 |
| `와벨리 동네레벨.html` | v1 릴리스본 — 배경 보류·그레이프 잔재 시기. 참고용 |
| `와벨리 동네레벨 v1.html` | 최초 안(플랫 링) — 참고용, 구현 대상 아님 |

### v3 변경 요약 (2026-07-27)
1. 배경 9종 **3레이어 재설계**(워시·패턴·하이라이트) — 등급 비례 화려도 (§3-4)
2. 패턴 타일 stroke 위주 → **면(fill)·볼륨 혼합** 재드로잉 (dots·mountain·lake·sakura·founder)
3. 모션 1종(firework) → **3종**(sakura 낙하 · firework 호흡+글로우 · founder 스윕+스파클)
4. 패턴 α 상한 .16/.24 → **.30~.32 / .36~.40**(상위 등급만) · 하위는 v2 수준 유지
5. 앱(RN) **정적 2레이어 상한** + `react-native-svg` 그라디언트 3스톱 정본 추가 (§3-4 앱 대체안)
6. 화면 H(배경 레이어 대조표) 신설 — 9종 라이트/다크 병렬 + 히어로·도감카드·리그헤더 3개소 적용 예시
7. **데이터 계약·키 9개·DB 스키마 변경 없음**

### v2 변경 요약 (2026-07-27)
1. 배경 아이템 9종 채택 — 틴트 토큰 `--patc` 도입, 불꽃 1종만 애니 (§3-4)
2. 앱(RN) 링 선형 3스톱 정본 + 앱 이펙트 범위 확정 (§3-3, 화면 F)
3. 앱 아이템 도감 화면 신설 — 세그먼트 3분할 + 하단 확정 바 (화면 G)
4. 이펙트 강도 70%로 하향 (§3-2)
5. 스카이 토큰 전환 완료 · `wavely.tokens.json` 갱신 (§9)
