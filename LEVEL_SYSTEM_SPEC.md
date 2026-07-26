# 와벨리 동네레벨 시스템 — 설계 확정본 (v1 draft)

> 상태: **설계 확정 · DB 초안 작성됨 · 미배포**. 배포는 출시/심사 이후, 사장님 검토 후.
> 관련 파일: DB 초안 = `supabase/_DRAFT_level_system.sql`
> 디자인 토큰은 `src/constants/wavely.tokens.ts`에서만 가져온다(신규 hex 발명 금지, 앱 CLAUDE.md 준수).

---

## 0. 한 줄 요약 / 왜 와벨리에 맞나

당근은 **온도**(신뢰 하나). 와벨리는 세 겹으로 간다:
1. **레벨(성장)** — 활동할수록 오르는 Lv + 등급(브론즈~다이아)
2. **뱃지(정체성)** — 인증이웃·사장님·단골·오래된주민 등 **사실 기반**(조작 불가)
3. **치장템(테두리·칭호)** — 조건 달성 시 수령하는 **꾸미기 전용** 보상

핵심 전략: 레벨을 굴리는 신호(좋아요·댓글·인증방문)가 **매장 W지수와 같은 뿌리**라, 게임화가 곧 커뮤니티 활성화 = 광고 품질 상승의 선순환이 된다. **단, 레벨 자체는 광고 노출/검색 순위에 영향 없음**(pay-to-win 방지, W지수 오염 방지).

---

## 1. XP 획득 (남의 반응 중심 = 어뷰징 방지)

"내가 많이 쓴 것"이 아니라 "**남이 내 기여에 반응한 것**"을 크게 준다. 도배·품앗이 방지의 근간.

| 소스 | XP | 일일 캡(회) | 근거 |
|---|---:|---:|---|
| 받은 좋아요 | +2 | 30 | `likes` → `posts.author_id` (자기 좋아요 제외) |
| 받은 스크랩 | +4 | 20 | `scraps` → `posts.author_id` |
| 받은 댓글 | +3 | 20 | `comments` → `posts.author_id` (본인 댓글 제외) |
| 인증 방문(리뷰) | +15 | 3 | `reviews.verified=true` (GPS 인증) *스키마 확인 후 확정* |
| 글 작성 | +5 | 3 | `posts` insert |
| 댓글 작성 | +2 | 10 | `comments` insert |
| 출석(하루 첫 활동) | +5 | 1 | 일 1회 |

- **일일 총 XP 캡: 120 XP/일** (도배·품앗이 상한선)
- **품앗이 감쇠:** 같은 (반응자→작성자) 쌍은 하루 3회까지만 XP 인정 → 상호 좋아요 어뷰징 차단
- **소급 회수:** 글/댓글이 삭제·신고블라인드되면 해당 XP 원장 역분개로 회수

## 2. 레벨 곡선

누적 XP → 레벨. 공식:

```
Lv L 도달 누적XP = 100·(L−1) + 20·(L−1)²
```

| 레벨 | 누적 XP | 매일 상한(120)으로 걸리는 대략 기간 |
|---:|---:|---|
| Lv 2 | 120 | 1일 |
| Lv 5 | 720 | ~1주 |
| Lv 10 | 2,520 | ~3주 |
| Lv 20 | 9,120 | ~2.5개월 |
| Lv 35 | 24,020 | ~7개월 |
| Lv 50 | 51,960 | ~1년+ |

초반 빠르게(리텐션), 후반 완만(장기 목표). 숫자는 출시 후 실데이터로 튜닝.

## 3. 등급(테두리 티어) — 레벨 구간 매핑

| 등급 | 레벨 | 테두리(아바타/이니셜 링) |
|---|---|---|
| 브론즈 | 1–9 | 브론즈 링 |
| 실버 | 10–19 | 실버 링 |
| 골드 | 20–34 | 골드 링 |
| 플래티넘 | 35–49 | 플래티넘 링 |
| 다이아 | 50+ | 다이아 링(미세 애니메이션) |

색은 `wavely.tokens.ts` 배지/등급 팔레트에서 매핑(하드코딩 금지).

## 4. 뱃지 (사실 기반 · 자동 수령 · 조작 불가)

| 뱃지 | 조건 | 소스 |
|---|---|---|
| 인증이웃 | 동네 GPS 인증 1회+ | `reviews.verified` / gps-verify |
| 사장님 | 매장 보유 | `stores.owner_id` |
| 사업자인증 | biz_verified | `profiles/stores.biz_verified` |
| 단골 | 같은 매장 인증방문 3회+ | `reviews` |
| 오래된주민 | 가입 6개월+ | `profiles.created_at` |
| 새내기이웃 | 가입 30일 이내(환영) | `created_at` |
| 맛집헌터 | 인증리뷰 20곳+ | `reviews` |
| 인기글러 | 한 글 좋아요 50+ | `likes` |
| 동네반장 | Lv20 + 활동 상위 | level + 집계 |

## 5. 칭호 (닉네임 옆 텍스트 1개 장착)

- 뱃지/레벨 달성 시 **획득**, 보유한 것 중 **1개 선택 착용**.
- 예: `새내기 이웃`(Lv1) · `동네 지킴이`(Lv10) · `효자동 터줏대감`(특정 동 활동상위+Lv20) · `맛집 헌터`(맛집헌터 뱃지) · `동네 반장`(동네반장 뱃지)
- **지역 특화 칭호** = `○○동 터줏대감`: `post_regions`/동 기반 활동 집계 상위에게. 와벨리만의 시그니처.

## 6. 치장템(테두리·프레임) 획득 경로

1. **레벨 등급 자동** (브론즈~다이아) — 별도 수령 없이 등급 도달 시 사용 가능
2. **시즌·이벤트 한정** — 축제 참여 등(→ `festival-support` 연계). 기간 지나면 획득 불가 = 희소성
3. **특정 뱃지 부산물** — 예: 다이아 + 맛집헌터 → 특별 프레임

전부 **cosmetic**. 노출/순위/과금과 무관.

## 7. 어뷰징 방지 (요약)

1. XP는 남의 반응 중심, 자기 활동 가중 낮음
2. 소스별 일일 캡 + 총 일일 캡(120)
3. 품앗이 감쇠(같은 쌍 하루 3회)
4. 삭제/블라인드 콘텐츠 XP 소급 회수
5. 신규계정 쿨다운(이메일 인증 전 적립 보류)
6. 익명 글(`comments.anonymous`)은 작성 XP만, 정체성 비노출

## 8. DB 스키마 (초안 — `_DRAFT_level_system.sql`)

**profiles 추가 컬럼**
- `xp bigint default 0` (서버만 수정, authenticated revoke)
- `lvl int default 1` (denormalized, xp 변경 시 갱신)
- `equipped_title text` / `equipped_border text` (RPC로만 변경)

**신규 테이블**
- `xp_ledger(id, user_id[수령자], actor_id[유발자], source, delta, xp_after, ref, created_at)` — 원장 + 일일캡/품앗이 계산 소스
- `user_unlocks(user_id, kind['badge'|'title'|'border'], item_key, earned_at)` — 뱃지·칭호·테두리 보유

**함수 (SECURITY DEFINER)**
- `xp_to_level(xp) → int` (순수)
- `xp_for_level(L) → bigint` (다음 레벨 진행바)
- `tier_for_level(L) → text`
- `_add_xp(user, actor, source, ref)` — 캡·품앗이·자기제외·적립·레벨재계산·언락갱신 (내부/트리거 전용)
- `refresh_unlocks(user)` — 뱃지·레벨칭호 조건 재평가 upsert
- `get_level_card(user) → jsonb` — 레벨·등급·진행률·칭호·테두리·뱃지 (UI용, 1콜)
- `equip_title(key)` / `equip_border(key)` — 본인, 보유 검증
- `admin_grant_item(user, kind, key)` — 이벤트/시즌 한정 수여(관리자)

**트리거**
- `likes` after insert/delete → 수령자 +/− (자기 좋아요 제외)
- `scraps` after insert/delete → 동일
- `comments` after insert → 수령자 `comment_recv` + 작성자 `comment_write`
- `posts` after insert → 작성자 `post_write`
- `reviews` verified→true → 작성자 `visit_verified` (*스키마 확인 후*)

**권한**
- `xp_ledger`/`user_unlocks` = 본인 행 select만, 쓰기는 DEFINER 함수로만
- `profiles.xp/lvl/equipped_*` = authenticated 직접 update 회수(09 하드닝 패턴), 변경은 RPC 경유

## 9. 노출 지점 (UI, v1)

- **프로필/마이페이지**: 아바타 테두리 + Lv + 진행바 + 칭호 + 뱃지 줄
- **닉네임 옆(글/댓글)**: 칭호 + 작은 등급 점(선택 노출)
- **레벨업 순간**: 토스트/알림 "Lv10 달성 — 실버 테두리 획득"
- 앱은 `wavely.tokens.ts`/프로토타입 1:1, 웹은 `index.css` SSOT 준수. **재해석 금지.**

## 10. 로드맵

- **v1 (지금 초안)**: likes/scraps/comments/posts XP + 레벨 + 등급 테두리 + 사실기반 뱃지 + 칭호 착용
- **v1.1**: 인증방문 XP, 품앗이 감쇠, 삭제 소급회수, 레벨업 알림
- **v2**: 지역 특화 칭호(동별 랭킹), 시즌 한정 테두리(축제 연계), 이웃도움/러브콜 XP

**배포 순서 권고: 결제 방화벽(PHASE3) · 앱 심사 → 그 다음 레벨 시스템.** 지금은 설계·초안 확보까지.
