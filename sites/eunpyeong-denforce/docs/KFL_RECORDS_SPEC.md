# 결과기록지 자동 수집, 홈페이지 기록, 나무위키 마크업: 구현 명세 (최종)

- **대상:** `/home/user/wavely/sites/eunpyeong-denforce` (Next.js 16 App Router + Supabase). 아래 경로는 모두 이 폴더 기준이다.
- **근거:** `docs/kfl-research/` — 연맹 사이트 조사 `federation-site.md`, 코드 지도 `code-map.md`, 나무마크 `namumark.md`, 초안 검토 33건 `spec-review.md`(부록 A 에 반영표), 소유자 결정(2026-11-13, 5.5). 연맹 HTML 원본 샘플은 저장소에 없다 — 테스트 자료는 1단계(C1)에서 futsal.or.kr(HTTP)에서 다시 받아 심판/경기 임원 이름을 지운 축약본으로 만든다.
- **사이트 규칙:** 이 사이트는 자체 규칙(AGENTS.md, docs/)을 따른다. 저장소 루트 CLAUDE.md 의 와벨리 토큰 규칙은 와벨리 앱 대상이다. "새 공개 화면은 시안 먼저, 모르는 값은 추측 말고 질문" 원칙은 이 사이트의 FIGMA_SYNC 절차와 같아서 그대로 지킨다. 관리자 화면은 리디자인 대상이 아니라(D-069) 피그마 없이 기존 부품으로 만든다(`/admin/instagram` 선례, D-065).

> **1R 안내 (2026-11-15 일 14:00, 원정, 노원제너FS, 파주NFC, 연맹 경기번호 1)**
> - 1R 에 손으로 할 일은 없다. 스코어와 득점자는 지금 돌고 있는 `instagram-sync` 가 구단 인스타 경기결과 글로 채운다.
> - `kfl-sync` 는 처음 실행될 때 지난 우리 경기를 모두 확인 대상(`next_check_at = now()`)으로 잡아 1R 결과기록지를 채운다(뒤늦게 배포해도 잃는 데이터 없음). 이때 1R 출전 줄은 전부 '확인 필요'로 들어가고, 관리자가 명단을 한 번 확인한 뒤 공개한다(1.6).

---

## 0. 요약

**하는 일**
1. Supabase Edge Function `kfl-sync` 가 30분마다 실행된다.
   - 연맹에 실제로 요청하는 것은 필요할 때뿐이다(하루 일정표 1번 + 경기 뒤 확인).
   - 읽는 페이지: futsal.or.kr 일정표(`game_leagueTab03`), 우리 경기 결과기록지(`gameLeagueRecord`), 우리 구단 페이지(`mng_EunPyeong.action`, 번호 비교 경고용).
   - DB 에 넣는 것: 리그 45경기 일정/스코어(`kfl_games`), 우리 경기 결과와 득점자(`matches`), 선수별 경기 출전 기록(`match_appearances`), 리그 순위(`standings`, 45경기 스코어로 계산).
2. 홈페이지는 같은 DB 를 읽는다.
   - 값만 바뀌는 기존 화면: 경기결과의 스코어/득점자 줄('상대 자책골' 포함), 리그순위, 선수 카드/상세의 '출전 N경기 / N골'.
   - 2026-27 선수 기록은 출전 기록에서 계산한다(뷰). 공개 전환은 관리자 칸 `kfl_leagues.stats_live` 로 한다. 그 전까지 사이트는 2025-26 고정값을 보인다.
   - 새 공개 화면 4개(N2 → N3 → N1 → N4)는 **피그마 시안 → 소유자 선택 → 코드**. 이 명세는 데이터만 정한다.
3. 나무위키는 **자동 편집하지 않는다.**
   - 관리자 › 나무위키 화면이 같은 DB 로 나무마크를 만들고, 관리자가 복사 버튼으로 붙여넣는다.
   - 새 라운드 자료가 준비되면 대시보드 알림이 뜬다(`kfl_leagues.namu_round_done` 한 칸).
   - 구단 문서가 없을 때의 새 문서 템플릿과, 있을 때 문단 이름을 맞추는 흐름을 둘 다 둔다.
   - 데이터는 DB → 나무위키 한 방향으로만 흐른다.
4. 선수 연결은 **(시즌, 등번호) 번호표**로만 한다. 이름만으로 연결하지 않고, 맞지 않는 줄은 '확인 필요'로 남긴다. 시즌 첫 경기는 모든 줄을 관리자가 확인한다.
5. 2025-26 기록은 `players.apps/goals/assists` 고정값을 그대로 둔다(원해연, 이준형 보충은 이미 운영 반영됨).

**범위 밖**
- 컵대회/플레이오프: 연맹 페이지가 다르고 조사하지 않았다.
- 도움: 연맹 기록지에 칸이 없다. 도움 열을 만들지 않는다.
- 교체 시각, 출전 시간, 선수별 GK 표시, GK 실점(I-036: 기록지에 선수별 GK 표시가 없어 계산 불가, 소유자 결정 8).
- 승부차기 칸(I-015). 기록지에 PK 값이 있으면 메모만 남긴다.
- 2025-26 시즌(league_seq 108) 수집. 2025-26 은 고정값이고, 테스트는 파생 자료 파일을 쓴다.
- 나무위키 로그인/편집 자동화.

**문서 기록 (C1 에 함께)**

| 항목 | 내용 |
|---|---|
| D-082 | 연맹 결과기록지 자동 수집 채택. D-010 의 '버린 대안: 실시간 크롤링'을 뒤집는다. 소유자가 2026-11-13 I-013(약관) 위험을 수용했다. instagram-sync 와의 우선순위(2.6), 순위 자동 계산(BR-034), 기록 공개 전환(`stats_live`)을 함께 적는다. |
| D-083 | 나무위키는 자동 편집하지 않고 관리자 화면에서 마크업을 만들어 복사한다(Cloudflare, 로그인/캡차, 편집 규범). 새 문서 템플릿과 기존 문서 맞추기 둘 다. 새 라운드 알림 필수. |
| BR-032 | 경기 기록 규칙. 출전 = 결과기록지 명단에 P 또는 S 로 오른 경기(연맹 집계와 같음). 득점 = 기록지 골 칸. 자책골은 상대 득점이며 득점자 줄과 나무위키에 '상대 자책골'로 적는다. 선수 연결은 (시즌, 등번호)로만 하고, 시즌 첫 경기는 관리자가 명단을 확인한 뒤 `stats_live` 를 켠다. 출전 줄 내용은 사이트에서 고치지 않는다(연맹이 공식). 연맹이 끝내 고치지 않는 수기 오류는 관리자 메모로만 남긴다. |
| BR-033 | 나무위키 내용은 DB 와 사이트 설정에서 만든다. 나무위키 본문을 홈페이지로 가져오지 않는다(CC BY-NC-SA). 붙여 넣은 문서 원문은 저장하지 않는다. 선수 이름 링크는 관리자가 문서명을 넣은 선수만. 중간점 없음(BR-024). 사이트 연혁 글(BR-019 로 걸러진 글)은 옮기지 않는다. 유스 팀 이름은 `src/config/youth.ts` 의 `YOUTH_TEAMS`('서울은평 아카데미컬 FC', 2026-11-13 소유자 "유스는 서울은평 아카데미컬")를 쓴다. |
| BR-034 | 활성 연맹 리그의 리그순위는 연맹 일정표 45경기 스코어(`kfl_games`)로 계산해 `standings` 에 쓴다(BR-001 정렬은 그대로). 관리자가 직접 고친 값은 다음 갱신 때 바뀐다. 감점 등 스코어 밖 규정은 반영하지 못한다(I-059). |
| I-013 | 상태를 '소유자 위험 수용(2026-11-13), 자동 수집 중(D-082)'으로 갱신한다. 허락 문의 연락처는 그대로 둔다. |
| I-059 (새) | 연맹 HTML 의존: 모양 변경, HTTP 전용, 수기 입력 오류(자책골 자유 글, P 표시 빠짐, 발표 뒤 정정), 라운드 표기 없음, 기록지 게시 지연 미측정, 구단 페이지가 시즌을 늦게 바꿈(2026-11-13 기준 2025-26 명단, 감독 장성호), 연장/PK 분 미검증, 감점 미반영, 컵/플레이오프 미지원. 1R 뒤 실제 게시 지연을 여기에 적는다. |
| I-056 | ① 완료(2026-11-13 총괄 운영 반영, `supabase/data/2026-11-13_roster_drive.sql:48-50`). ② `stats_live` 를 켜면 해결(C7). |
| I-018 | 기록 시즌 전환이 재배포 없이 관리자 칸으로 된다(C7). 진행으로 표시한다. |
| I-036 | "결과기록지에 선수별 GK 표시가 없어 자동 계산 불가, 이번 작업 범위 밖(소유자 2026-11-13)" 한 줄 추가. |
| D-072 영향 목록 | `kfl_leagues.competition` 을 추가한다. |
| SECURITY_GUIDELINES | 서버 키 예외 줄(D-065)에 `kfl-sync` 를 추가한다. |
| SUPABASE_SETUP | `kfl-sync` 멈추기/예약 보기/다시 켜기 메모를 instagram 메모 아래에 추가한다. |
| TESTING_GUIDELINES:14 | 문구를 실제 관행에 맞춘다: 금지는 '`@/` 별칭 값 import' 이고, 상대경로 `.ts` 값 import 는 허용(`src/lib/player-profile.ts:6`, `instagram-sync/plan.ts`). |

---

## 1. 데이터

### 1.1 새 표 한눈에

| 표 | 역할 | 키 |
|---|---|---|
| `kfl_clubs` | 연맹 club_id(소문자) ↔ 사이트 팀 이름(`matches.opponent`, `standings.team`), 연맹 표기, 나무위키 문서명, (우리 행만) 나무위키 문단 맞춤 | `club_id` |
| `kfl_leagues` | 연맹 league_seq ↔ 사이트 대회명(`matches.competition` = `standings.season`), 시즌, 활성, 기록 공개(`stats_live`), 나무위키 반영 라운드 | `league_seq` |
| `kfl_games` | 리그 45경기 일정/스코어, 우리 경기의 수집 상태, `matches` 연결 | `(league_seq, game_number)` |
| `kfl_sheet_snapshots` | 결과기록지 원본 HTML + 파싱 결과. 반영 대상 값이 바뀔 때만 저장, 경기당 최근 2개 | `(league_seq, game_number, hash)` |
| `player_season_numbers` | 시즌별 등번호표 (시즌, 번호) → 선수 | `(season, number)` |
| `match_appearances` | 우리 선수의 경기별 기록(선발/교체, 경고, 퇴장, 골, 자책골) | `id`, unique `(match_id, shirt_number)` |
| `kfl_sync_state` | 실행 상태 한 줄(잠금, 성공/오류, 요청 수, 멈춤, 구단 페이지 명단) | `id = 1` |
| `namu_player_docs` | (선택) 선수별 나무위키 문서명 | `player_id` |
| `player_season_stats` (뷰) | 대회별 선수 합계 | `(competition, player_id)` |

`matches` / `players` / `standings` 에는 **열을 추가하지 않는다.** 기존 폼과 `rows.ts` 를 바꿀 필요가 없다.

### 1.2 마이그레이션 `supabase/migrations/20261114100000_kfl_records.sql`

뒤 커밋(C4, C7, C8)에서 쓰는 칸(`stats_live`, `namu_round_done`, `namu_outline`, `namu_player_docs`)도 여기에 넣어 운영 마이그레이션 승인을 한 번으로 줄인다(스키마만 있고 쓰지 않으면 영향 없음).

```sql
create table public.kfl_clubs (
  club_id text primary key check (club_id ~ '^[a-z0-9_]{2,30}$'),     -- 소문자로 저장(연맹 표기: fsseoul / FSSeoul)
  fed_name text not null check (length(fed_name) between 1 and 60),   -- 연맹 표기 '서울은평덴포스'
  name text not null check (length(name) between 1 and 40),           -- 사이트 표기 '서울은평 덴포스', '용인지솔FS'
  is_us boolean not null default false,
  namu_doc text check (namu_doc is null or length(namu_doc) between 1 and 100),  -- 상대팀 나무위키 문서명(없으면 글자만)
  namu_outline jsonb check (namu_outline is null or (is_us and jsonb_typeof(namu_outline) = 'object'
                                                    and length(namu_outline::text) <= 2000)),  -- 기존 문서 문단 맞춤(4.3)
  updated_at timestamptz not null default now(), updated_by text
);
create unique index kfl_clubs_one_us on public.kfl_clubs (is_us) where is_us;

create table public.kfl_leagues (
  league_seq integer primary key check (league_seq > 0),
  league_type smallint not null default 10 check (league_type > 0),
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  competition text not null check (length(competition) between 1 and 60),
  active boolean not null default false,
  stats_live boolean not null default false,                          -- 관리자: 첫 경기 명단 확인 뒤 켬 (BR-032)
  namu_round_done smallint check (namu_round_done between 0 and 99),  -- 나무위키에 반영한 마지막 라운드 (D-083)
  updated_at timestamptz not null default now(), updated_by text
);

create table public.kfl_games (
  league_seq integer not null references public.kfl_leagues on delete cascade,
  game_number integer not null check (game_number between 1 and 999),
  home_club text not null check (home_club ~ '^[A-Za-z0-9_]{2,30}$'),  -- club1 = 홈. 연맹이 준 대소문자 그대로(기록지 주소용)
  away_club text not null check (away_club ~ '^[A-Za-z0-9_]{2,30}$'),
  kickoff timestamptz not null,
  venue text not null default '' check (length(venue) <= 60),
  list_page smallint not null check (list_page between 1 and 50),      -- 마지막으로 본 쪽(믿지 않음, 2.4)
  home_score smallint check (home_score between 0 and 99),             -- tab03 앵커. 빈칸이면 둘 다 null
  away_score smallint check (away_score between 0 and 99),
  is_ours boolean not null default false,
  match_id uuid unique references public.matches(id) on delete set null,
  state text not null default 'waiting' check (state in ('waiting','recorded','review','reviewed','error')),
  seen_hash text, applied_hash text,                                   -- 반영 대상 값의 해시(2.2)
  opp_own_goals smallint not null default 0 check (opp_own_goals between 0 and 99),  -- 상대 자책골(우리 득점)
  checked_at timestamptz, next_check_at timestamptz,
  rechecks_left smallint not null default 0 check (rechecks_left between 0 and 7),
  fails smallint not null default 0 check (fails between 0 and 99),
  note text check (note is null or length(note) <= 2000),
  updated_at timestamptz not null default now(), updated_by text,
  primary key (league_seq, game_number),
  check ((home_score is null) = (away_score is null))
);
create index kfl_games_due_idx on public.kfl_games (next_check_at) where is_ours and next_check_at is not null;

create table public.kfl_sheet_snapshots (
  league_seq integer not null, game_number integer not null,
  hash text not null, fetched_at timestamptz not null default now(),
  html text not null check (length(html) <= 400000),
  parsed jsonb not null,
  primary key (league_seq, game_number, hash),
  foreign key (league_seq, game_number) references public.kfl_games on delete cascade
);

create table public.player_season_numbers (
  season text not null check (season ~ '^\d{4}-\d{2}$'),
  number integer not null check (number between 0 and 99),
  player_id uuid not null references public.players(id) on delete cascade,
  updated_at timestamptz not null default now(), updated_by text,
  primary key (season, number)
);

create table public.match_appearances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  shirt_number integer not null check (shirt_number between 0 and 99),
  sheet_name text not null default '' check (length(sheet_name) <= 40),        -- 기록지 표기(빈칸 많음)
  link text not null check (link in ('auto','confirmed','review','ignored')),
  player_id uuid references public.players(id) on delete restrict,             -- 연결된 선수(auto/confirmed 만)
  suggested_player_id uuid references public.players(id) on delete set null,   -- review 줄의 제안
  started boolean not null default false,                                      -- P
  bench boolean not null default false,                                        -- S
  yellow_minutes smallint[] not null default '{}',   -- 원소 = 분, 읽을 수 없으면 null 원소
  red_minutes smallint[] not null default '{}',
  goal_minutes smallint[] not null default '{}',
  own_goal_minutes smallint[] not null default '{}',
  note text check (note is null or length(note) <= 300),
  updated_at timestamptz not null default now(), updated_by text,
  unique (match_id, shirt_number),
  check ((link in ('auto','confirmed')) = (player_id is not null)),
  check (started or bench),
  check (cardinality(yellow_minutes) <= 2 and cardinality(red_minutes) <= 1
         and cardinality(goal_minutes) <= 13 and cardinality(own_goal_minutes) <= 13),
  check (0 <= all(yellow_minutes || red_minutes || goal_minutes || own_goal_minutes)
         and 99 >= all(yellow_minutes || red_minutes || goal_minutes || own_goal_minutes))  -- null 원소는 통과
);
create unique index match_appearances_player_once on public.match_appearances (match_id, player_id) where player_id is not null;
create index match_appearances_player_idx on public.match_appearances (player_id) where player_id is not null;

create table public.kfl_sync_state (
  id smallint primary key default 1 check (id = 1),
  running_since timestamptz, last_run_at timestamptz, last_ok_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 500),
  last_warning text check (last_warning is null or length(last_warning) <= 500),
  last_list_at timestamptz,                         -- 일정표 전체를 마지막으로 다 읽은 때
  list_due boolean not null default false,          -- 저장된 쪽에 경기가 없어 다음 실행에서 전체 일정을 다시 읽음(2.4)
  shape_error_at timestamptz,                       -- KflShapeError 를 마지막으로 만난 때(정상 파싱되면 null)
  req_day date, req_count integer not null default 0,
  paused_until timestamptz,
  fail_streak smallint not null default 0 check (fail_streak between 0 and 20),
  club_roster jsonb, club_roster_hash text,         -- 연맹 구단 페이지 명단 [{no,name,position}]
  club_roster_changed_at timestamptz,               -- 이전 해시가 있었는데 바뀐 때
  club_roster_ack_at timestamptz                    -- 관리자 [비교 확인함]
);
insert into public.kfl_sync_state (id) values (1);

create table public.namu_player_docs (
  player_id uuid primary key references public.players(id) on delete cascade,
  doc text not null check (length(doc) between 1 and 100),
  updated_at timestamptz not null default now(), updated_by text
);

create view public.player_season_stats with (security_invoker = true) as
select l.competition, l.season, a.player_id,
       count(*)::int as apps,
       count(*) filter (where a.started)::int as starts,
       coalesce(sum(cardinality(a.goal_minutes)), 0)::int as goals,
       coalesce(sum(cardinality(a.yellow_minutes)), 0)::int as yellows,
       coalesce(sum(cardinality(a.red_minutes)), 0)::int as reds
from public.match_appearances a
join public.kfl_games g on g.match_id = a.match_id
join public.kfl_leagues l on l.league_seq = g.league_seq
where a.player_id is not null
group by l.competition, l.season, a.player_id;
```

**추가 사항**
- `set_audit()` 트리거(`<table>_audit`, before insert or update)를 `kfl_clubs`, `kfl_leagues`, `kfl_games`, `player_season_numbers`, `match_appearances`, `namu_player_docs` 에 단다. `kfl_sync_state` 와 `kfl_sheet_snapshots` 에는 달지 않는다(`updated_at/updated_by` 열이 없어 트리거가 실패함, `20261019150000_audit_user_ids.sql:15-16`).
- 서버 함수는 쓸 때 `updated_by: 'kfl-sync'` 를 보낸다. 서버 키에는 `auth.uid()` 가 없어 `coalesce` 가 이 값을 남긴다(I-042 흐름).
- Vault 비밀값 `kfl_sync_secret` 와 확인 함수 `kfl_sync_secret_ok(p_secret)` 를 instagram(`20261023100000_instagram_sync.sql:47-63`)과 똑같이 만든다. security definer, `search_path=''`, `service_role` 만 실행, 비밀값은 마이그레이션 안에서 `gen_random_bytes(32)`.
- 선수 삭제: `player_id on delete restrict` 라 출전 기록이 있는 선수는 지워지지 않는다. `players/actions.ts` 삭제 동작에서 오류 코드 `23503` 이면 "출전 기록이 있는 선수는 지우지 말고 '활동 중'을 끄세요." 를 보인다(하윤호처럼 `is_active=false` 로 두던 기존 방식).
  - 지금 `deletePlayer`(`actions.ts:115-128`)는 삭제 오류를 버리고 목록으로 돌아가며, `DeleteButton` 은 `() => Promise<void>` 동작이라 오류 상태를 받지 못한다. 그래서 23503 이면 `redirect("/admin/players?error=appearances")` 로 보내고 선수 목록 맨 위에 위 문구 한 줄을 보인다(기존 부품, 사진은 지우지 않음: 실패 시 `data` 가 null 이라 `removeImage` 는 할 일 없음). `dbErrorMessage` 에는 일반 문구 `23503` → "다른 기록이 이 항목을 쓰고 있어 지울 수 없습니다." 를 추가한다.

### 1.3 권한(RLS + grant)

먼저 `revoke all on <새 표 전부, 뷰> from anon, authenticated` 를 하고 필요한 것만 준다(instagram 마이그레이션 방식). 새 relation 은 기본으로 API 에 노출되므로(`supabase/config.toml:19-23`) 뷰도 명시해서 준다. `is_admin()` 은 owner/admin 만이다. 열 권한은 역할 단위라서, 관리자(authenticated)가 읽어야 하는 열은 미디어 계정(같은 authenticated)도 읽는다(운영에서 Auth 가입이 열려 있으면 아무 가입 계정도, I-042). 이 열(`note`, `suggested_player_id`, 해시, `namu_outline`, ID 로 된 `updated_by`)은 연맹 공개값에서 나온 메모라 받아들인다. 행 단위 비공개 표는 RLS `is_admin()` 으로 막는다.
- 새 표는 모두 RLS 를 켠다. anon 공개 4표(`kfl_clubs`, `kfl_leagues`, `kfl_games`, `match_appearances`)에는 anon/authenticated select 정책 `using (true)` 를 둔다. 뷰가 security_invoker 라서 이 정책이 없으면 anon 의 `player_season_stats` 가 빈 결과가 된다.

| 표 | anon | authenticated (미디어 포함) | owner/admin 쓰기 (RLS `is_admin()`) | service_role |
|---|---|---|---|---|
| `kfl_clubs` | select (`club_id, fed_name, name, is_us, namu_doc`) | select 전부 | insert/update/delete | 전부 |
| `kfl_leagues` | select (`league_seq, season, competition, active, stats_live`) | select 전부 | insert/update/delete | 전부 |
| `kfl_games` | select (`league_seq, game_number, home_club, away_club, kickoff, venue, home_score, away_score, is_ours, match_id`) | select 전부 | update(`state, next_check_at`) | 전부 |
| `match_appearances` | select (`id, match_id, shirt_number, sheet_name, link, player_id, started, bench, yellow_minutes, red_minutes, goal_minutes, own_goal_minutes`), 행 `using (true)` | select 전부 | update(`link, player_id, suggested_player_id`) | 전부 |
| `player_season_stats` (뷰) | select | select | 없음 | 전부 |
| `player_season_numbers` | 없음 | select, 행 `is_admin()` | insert/update/delete | 전부 |
| `namu_player_docs` | 없음 | select, 행 `is_admin()` | insert/update/delete | 전부 |
| `kfl_sheet_snapshots` | 없음 | select, 행 `is_admin()` | 없음 | 전부 |
| `kfl_sync_state` | 없음 | select, 행 `is_admin()` | update(`paused_until, fail_streak, club_roster_ack_at`) | 전부 |

- `match_appearances` 를 anon 에 모든 행으로 여는 이유: `player_id` 는 연결된 줄에만 있으므로 review/ignored 줄은 '번호와 기록지 이름'만 보인다(연맹이 공개한 값). N4 명단이 '확인 필요 줄이 남았는지'를 알아야 한다. `note`, `suggested_player_id`, `updated_*` 는 anon 열에서 뺀다.
- 모든 표의 `updated_by` 는 anon 열에서 뺀다(I-042 교훈).
- 뷰는 security_invoker 라서 anon 이 참조 열(`kfl_games.match_id/league_seq`, `kfl_leagues.league_seq/competition/season`, `match_appearances.player_id/match_id/started/goal_minutes/yellow_minutes/red_minutes`)을 모두 읽을 수 있어야 한다. 위 열 grant 가 이를 덮는다.
- `supabase/tests/rls-check.mjs` 에 위 표를 그대로 검사로 추가한다: anon 으로 뷰 select 성공, anon 으로 `note`/`suggested_player_id`/`updated_by` select 거부, 미디어 계정 쓰기 거부, 관리자 허용 열만 update 성공, `kfl_sync_state` 에 audit 트리거 없음, 출전 기록이 있는 선수 삭제 시 23503.

### 1.4 시드 `supabase/data/2026-11-14_kfl_seed.sql` (한 트랜잭션, 여러 번 실행해도 같음)

- **`kfl_clubs`** (`on conflict (club_id) do nothing`). 사이트 이름은 현재 `matches.opponent`/`standings.team` 값 그대로다.

  | club_id | fed_name | name (사이트) |
  |---|---|---|
  | `eunpyeongfs` | 서울은평덴포스 | 서울은평 덴포스 (is_us) |
  | `fsseoul` | 노원제너FS | 노원제너FS |
  | `gwfsclub` | 강원FS | 강원FS |
  | `goyangbulls` | 고양불스풋살클럽 | 고양불스풋살클럽 |
  | `hwaseongfs` | 화성FS | 화성FS |
  | `yongintmt` | 용인지솔FS | 용인지솔FS |

  - **용인 이름 (소유자 결정 10):** 연맹은 옛 용인대흥FS 를 용인지솔FS 로 바꿨다. 사이트 경기/순위는 이미 '용인지솔FS'다(BR-030, 2026-11-05 소유자 정정, `2026-27_fk1_schedule.sql:27-28`, `team-crests.ts` 별칭에 옛 이름). 그래서 매핑은 그대로 맞는다. 시드와 함수는 사이트 이름을 **절대 바꾸지 않는다.** 앞으로 연맹 표기가 다시 바뀌면 함수는 경고만 남긴다(2.4). 관리자/소유자 확인 항목: 지난 기록 SQL 주석과 문서에 남은 '용인대흥FS' 는 역사 표기로 둔다.
  - `namu_doc` 은 모두 null 로 시작한다(관리자가 4.3 화면에서 채움).
- **`kfl_leagues`**: `(116, 10, '2026-27', '키움증권 2026-27 FK리그1' (D-072), active = true, stats_live = false)`. 108 은 넣지 않는다(수집 안 함).
- **`player_season_numbers('2026-27')`** (소유자 결정 9, D-078 로 등번호 공개):
  - `insert ... select '2026-27', number, id from players where is_active and number is not null and not exists (select 1 from player_season_numbers where season = '2026-27')`.
  - `on conflict do nothing` 을 쓰지 않는다. 활동 선수끼리 번호가 겹치면 PK 오류로 시드 전체가 실패한다(의도한 검사). 다시 실행하면 이미 채워진 시즌은 건너뛴다.
- **검사 (`do $$ ... raise exception ... $$`, 실패하면 트랜잭션 전체 취소)**
  1. 우리 아닌 `kfl_clubs.name` 5개가 모두 `matches.opponent`(competition = D-072 이름)와 `standings.team`(season = D-072 이름)에 있다. 없으면 실패하고 관리자/소유자 확인 항목으로 보고한다(사이트 이름을 맞춰 바꾸지 않음).
  2. 우리 행 `name` = `standings` 의 `is_us` 행 team.
  3. 동명이인 4줄: 6 = `no-8` 김대현, 18 = `no-18` 김대현, 22 = `no-22` 김종호, 30 = `kim-jongho` 김종호 (`2026-11-13_roster_drive.sql:8,17,18,25` 와 같음).
  4. 116 의 competition 으로 된 `matches` 가 15경기다.
- **드리프트 주의:** `2026-27_fk1_schedule.sql` 과 `2026-27_fk1_standings.sql` 은 옛 대회명('2026-27 FK1리그')을 쓴다. 두 파일 머리에 "운영 DB 는 D-072 이름 '키움증권 2026-27 FK리그1'. 새 환경에서 이 파일 뒤에 D-072 이름 변경을 먼저 실행할 것" 한 줄을 추가한다(C2).

### 1.5 선수 연결 규칙 (`matchPlayers`, 순수 함수)

입력:
- 기록지 우리 팀 줄 `SheetPlayer[]`
- `live`: 리그의 `stats_live`
- 시즌 번호표 `numbers: Map<number, PlayerLite>`
- 전체 선수 `players` (비활동 포함. instagram 처럼 전부 읽는다. `dbSource.players()` 는 활동 선수만이라 쓰지 않음)
- `previous`: 이 경기의 기존 `match_appearances` 줄
- `correction`: 이 경기에 이미 반영한 기록지가 있었는지(`applied_hash` 가 있음)

이름 비교는 NFC, 공백 제거 후 같은지로 본다. 위에서부터 처음 맞는 규칙을 쓴다.

| # | 경우 | `link` | `player_id` | `suggested_player_id` | 메모 |
|---|---|---|---|---|---|
| 1 | `previous` 에 같은 번호 줄이 있고 기록지 이름이 같음(또는 이전 이름 빈칸 + 새 이름 = 연결 선수 이름) | 이전 값 유지(link 종류 무관) | 이전 | 이전 | 이전 |
| 2 | `live = false` (시즌 첫 경기 확인 전) | `review` | null | 번호표 선수(없으면 6번 규칙의 제안) | "명단 확인 전" |
| 3 | `correction = true` 이고 1번에 안 맞음(정정으로 새로 생기거나 바뀐 줄) | `review` | null | 번호표 선수 | "기록지 정정으로 바뀐 줄" |
| 4 | 번호표에 번호 있음, 기록지 이름 빈칸 또는 같음 | `auto` | 번호표 선수 | null | |
| 5 | 번호표에 번호 있음, 이름 다름 | `review` | null | 번호표 선수 | "기록지 N번 'A', 번호표 'B'" |
| 6 | 번호표에 번호 없음, 같은 이름 선수가 정확히 1명 | `review` | null | 그 선수 | "번호표에 없는 번호" |
| 7 | 번호표에 번호 없음, 그 밖 | `review` | null | null | "번호표에 없는 번호" |
| 8 | 4번 결과로 한 경기에서 두 줄이 같은 선수 | 두 줄 모두 `review` | null | 그 선수 | "같은 선수에 두 줄" |

**원칙**
- 이름만으로는 절대 연결하지 않는다.
- 동명이인(김대현 6/18, 김종호 22/30)은 번호로만 갈린다. 대책: 시드 검사(1.4), 시즌 첫 경기 전수 확인(2번 규칙), 번호표 화면에 주소(slug) 표시, 연맹 구단 페이지 비교 경고(2.4).
- 번호표를 시즌 중에 바꿔도 이미 연결된 줄은 그대로다(1번 규칙). 번호 재사용(떠난 선수 번호를 새 선수가 받음)은 키 `(season, number)` 로 표현하지 않는다. 대신 1번 + 3번 규칙으로 지난 경기가 새 번호표로 다시 연결되지 않게 하고, 번호표 화면에 "번호를 바꾸면 그 뒤에 읽는 기록지부터 적용" 한 줄을 둔다.

**사라진 줄**
- `previous` 의 줄이 새 기록지에 없으면 지우고, 경기 메모에 "N번 줄이 기록지에서 사라짐(이전: 연결 선수 또는 '확인 필요')" 을 남기고 경기를 `review` 로 둔다.

**저장 대상**
- P 또는 S 가 있는 줄만 저장한다(출전 정의). P 도 S 도 없는 줄은 저장하지 않는다. 그런 줄에 골이나 카드가 있으면 검산 실패다(2.2).

### 1.6 시즌 기록 규칙

- **2025-26:** `players.apps/goals/assists` 고정값을 그대로 둔다. `LEAGUE.statsSeason = "2025-26 FK1리그"` 는 "고정 칸의 시즌"이라는 뜻으로 유지한다.
  - 관리자 › 선수 폼 라벨을 '2025-26 출전/득점/도움 (고정 기록)'으로 바꾼다.
- **2026-27:** `player_season_stats` 뷰에서 계산한다. players 칸에 쓰지 않는다(쓰면 2025-26 값이 덮임).
- **공개 전환 (소유자 결정 3):** `kfl_leagues.stats_live` 관리자 칸.
  - 켤 수 있는 조건(서버 동작에서 검사): 그 리그에 기록지를 반영했고(`applied_hash is not null`) 사이트 경기에 연결된 우리 경기가 1개 이상, 그 리그 경기의 `link = 'review'` 줄이 0개.
  - 즉 1R 기록이 들어오고 관리자가 1R 명단(모든 줄 review)을 확인한 직후에 켠다. 끄기는 언제든 된다.
  - 켜기 전에는 새 기록지의 줄도 전부 `review` 다(1.5 2번 규칙). 그래서 확인 안 된 연결이 공개되지 않는다. 검토 22a 의 `numbers_verified` 는 이 칸에 합쳤다(명단 확인과 공개 전환이 같은 순간이라는 소유자 결정).
- **보이는 기록 시즌:** `resolveStatsSeason(leagues, LEAGUE.statsSeason)` (순수 함수)
  - `active and stats_live` 인 리그 중 season 이 가장 늦은 리그의 `competition`. 없으면 `LEAGUE.statsSeason`.
- **`playerStats(player, season, rows)`**
  - season 이 `LEAGUE.statsSeason` 이면 `player.stats` (고정값).
  - 아니면 뷰 행, 없으면 `{apps:0, goals:0, assists:0}`. 2026-27 도움은 늘 0 이라 BR-009 로 숨는다.
- **알고 받아들인 결과:** `stats_live` 를 켜면 N3(시즌별 기록)가 나오기 전까지 선수 상세에서 2025-26 숫자가 안 보인다. 그래서 N3 을 두 번째 새 화면으로 만든다(소유자 결정 4 의 순서).

---

## 2. 수집: Edge Function `kfl-sync`

### 2.1 파일 (instagram-sync 와 같은 나눔)

| 파일 | 종류 | 내용 |
|---|---|---|
| `supabase/functions/kfl-sync/html.ts` | 순수 | 의존성 없는 표 토크나이저 `parseTables(html)` 와 `cleanText` |
| `.../schedule.ts` | 순수 | `parseSchedulePage(html, page)`, `parseClubRoster(html)` |
| `.../sheet.ts` | 순수 | `parseSheet(html)`, `KflShapeError`, `isFinished(game, sheet)`, `checkSheet(sheet, ctx)`, `applySubset(sheet, usSide)` |
| `.../plan.ts` | 순수 | `linkMatch`, `matchPlayers`, `planResult`, `scorersText`, `nextCheckAt`, `standingsFromGames`, `diffClubRoster` |
| `.../index.ts` | I/O | 인증, 잠금, 요청 예산, fetch, sha256, DB 읽기/쓰기, 스냅샷, 상태 |
| `supabase/config.toml` | 설정 | `[functions.kfl-sync] verify_jwt = false` |

**`html.ts`**
- 스택으로 `table`/`tr`/`td`/`th` 를 센다. 중첩 표(tab03 의 `td[2]`)를 처리한다.
- 속성은 큰따옴표, 작은따옴표(`colspan='22'`, `rec116_g1.html:530`), 따옴표 없음을 모두 읽는다.
- 닫히지 않은 `tr`/`td` 는 샘플에서 나오지 않았다(열고 닫는 수가 같음). 다음 `tr`/`td`/`</table>` 에서 닫는 방어 코드로만 둔다.
- 셀마다 `attrs`(class, colspan, rowspan, width, height), `text`, 하위 `tables` 를 낸다.
- `cleanText`: 엔티티 해제, U+FEFF 제거, **NFC** 정규화(NFKC 아님, I-053 교훈), 공백 줄이기, trim.
- 응답은 모두 `charset=UTF-8` 이다. `TextDecoder('utf-8')` 만 쓴다. content-type 이 UTF-8 이 아니면 `KflShapeError`(euc-kr 분기 없음).

**의존성과 import**
- HTML 파서 라이브러리를 쓰지 않는다(DEPENDENCY_POLICY). `embed.ts` 처럼 직접 쓴다.
- 순수 모듈은 `@/` 별칭 값 import 를 쓰지 않는다. 형은 `import type`, 값은 상대경로 `.ts` import(TESTING_GUIDELINES, instagram `plan.ts` 와 같음).

**구현 원본:** `.../kfl/bin/parse_record.py`, `.../kfl/bin/sched.py` 를 TS 로 옮긴다. 정답 자료는 3.2 의 고정 자료(축약본)다.

**타입**
```ts
export type Minute = number | null;          // 분을 읽을 수 없으면 null (예: 골 칸에 'og' 만)
export type SheetPlayer = { no: number; name: string; starter: boolean; bench: boolean;
  yellows: Minute[]; reds: Minute[]; goals: Minute[]; ownGoals: Minute[] };
export type SheetTeam = { fedName: string; total: number; players: SheetPlayer[]; remark: string };
export type KflSheet = { title: string; gameNumber: number | null; date: string | null; time: string | null;
  periods: { first: [number, number]; second: [number, number]; extra: [number, number] | null; pk: [number, number] | null };
  home: SheetTeam; away: SheetTeam; forfeit: boolean; hasPlayers: boolean };
export type KflListGame = { gameNumber: number; kickoff: string /* ISO +09:00 */; venue: string;
  homeClub: string; awayClub: string;         /* 연맹 대소문자 그대로 */
  homeName: string; awayName: string;         /* 연맹 표기(저장 안 함, 이름 변경 경고용) */
  leagueSeq: number; leagueType: number; score: [number, number] | null; page: number };
export type ClubRosterRow = { no: number; name: string; position: string };
```
파울, 지도자, 관중수, 심판은 파싱하지 않는다(저장하지 않고 해시 소음만 만듦).

### 2.2 파싱 규칙

**일정(tab03)** `GET /game_leagueTab03.action?league_seq=116&league_type=10&divisionPage=mainPage&pageNum=N`
- 선택자: `div.tabScroll > table.table_type3 > tr`. 열 `td[0]` 경기번호, `td[1]` "YYYY-MM-DD HH:MM"(KST), `td[2]` 안쪽 표(홈 / vs / 원정), `td[3]` 장소, `td[4] a`.
- 링크 `getrecord('c1','c2','seq','type','no')` 를 정규식으로 뽑고, club_id 형식(`^[A-Za-z0-9_]{2,30}$`)을 검증한다.
- 앵커 글자가 `^\s*\d+\s*:\s*\d+\s*$` 면 결과 있음, 빈칸이면 결과 없음(`score = null`).
- 한 쪽에 10줄, 날짜순(경기번호순 아님). 마지막 쪽은 줄이 10개보다 적거나 다음 쪽 링크(`gameLeaguePlanListPaging`)가 없을 때다.
- `main_selectMainLeaguePlan` 위젯은 쓰지 않는다(경기 전에도 "0 : 0").
- 시각은 `…T…:00+09:00` 로 바꾼다.

**구단 페이지** `GET /mng_EunPyeong.action`
- '이 름 / 배 번 / 포지션' 머리를 가진 표에서 세 칸씩 묶어 `ClubRosterRow[]` 를 만든다. 이름은 NFC + 공백 제거, 배번은 숫자만.
- 이 페이지에는 시즌 표시가 없다(2026-11-13 기준 2025-26 명단, 감독 장성호). 그래서 내용을 믿지 않고 비교 경고에만 쓴다.

**결과기록지** `GET /gameLeagueRecord.action?club1_id=…&club2_id=…&league_seq=…&league_type=10&game_number=…` (club id 두 개는 반드시 넣는다. 빼면 선수 표가 없다)
- 머리: `td.record_title_bg` 다음 `td.record_text_bg`. 읽는 것: 대회명(안쪽 span 글자), 경기번호, 일자, 시간.
- 합계: `span.record_20` 2개(홈, 원정).
- 전후반/연장/PK: `td.record_title_bg2` 행의 왼쪽(홈)과 오른쪽(원정) 셀.
- 팀 이름: `td.record_text_bg[rowspan=2]`.
- 팀 표: `table[width=499]` 2개(첫째 홈).
- 선수 줄: 정확히 20칸, `td[1] colspan=3`. P/S 는 "O". 4~6번 칸: 1경고/2경고/퇴장. 7~19번 칸: 골.
  - `yellows` = 1경고, 2경고 칸 중 비어 있지 않은 것. `reds` = 퇴장 칸.
  - 두 번째 경고는 2경고와 퇴장 칸에 같은 분이 들어간다. 그대로 저장한다(경고 2, 퇴장 1). 예: 2025-26 #25 의 5번 14/25/25.
- 비고: `td.record_title_bg4` 다음 `td[colspan=21]`. 몰수 판정에만 쓴다.

**칸 안 값**
- 숫자가 있으면 첫 숫자를 분으로 읽는다. 비어 있지 않은데 숫자가 없으면 `null` 원소다.
- 골 칸 글자가 `/og|자책/i` 에 맞으면 `ownGoals` 에 넣는다(상대 득점). 실제 표기: `15(og`, `8(og`, `og(1)`, `og(19`. 숫자 없는 `og` 는 `null` 분.

**몰수:** 선수 줄 0, 비고에 `/몰수/` 가 있으면 `forfeit=true`. 점수는 합계/전반 칸 값(예: 0:3, 2025-26 #28 '홈팀 몰수패').

**미진행:** 합계 0:0, 선수 대신 `td colspan='22'` 한 줄이면 `hasPlayers=false`.

**모양 검사 (`KflShapeError`)**: `span.record_20` 이 2개가 아니거나, 팀 표가 2개가 아니거나, 선수 줄 칸 수가 20이 아니거나, content-type 이 UTF-8 이 아니면 예외로 멈춘다. **일부만 반영하지 않는다.**

**끝난 경기 판정 (`isFinished`)**: tab03 앵커에 스코어가 있다 **그리고** (`hasPlayers` 이거나 `forfeit`).

**검산 (`checkSheet`)**: 실패(failure)가 하나라도 있으면 반영하지 않고 경기를 `review` 로 둔다. 메모(note)는 반영하고 `review` 로 둔다.

| # | 내용 | 종류 |
|---|---|---|
| 1 | 머리 `경기번호` = 요청한 game_number | 실패 |
| 2 | 머리 `대회명` 에 리그 season(`2026-27`)과 `(FK1)` 이 있음 (예: '키움증권 2026-27 FK 리그(FK1) (일반(남))') | 실패 |
| 3 | 두 팀 이름 중 하나가 우리 `fed_name` | 실패 |
| 4 | 상대 팀 이름 = 상대 `kfl_clubs.fed_name` | 메모(이름 변경 경고, 사이트 이름 안 바꿈) |
| 5 | 홈 합계 = 홈 선수 골 수 + 원정 자책골 수. 원정도 같다(몰수 예외) | 실패 |
| 6 | 전반 + 후반 (+ 연장) = 합계 | 실패 |
| 7 | tab03 스코어 = 기록지 합계 | 실패 |
| 8 | 우리 팀 줄 5개 이상(몰수 예외) | 실패 |
| 9 | 우리 팀 등번호가 겹치지 않음 | 실패 |
| 10 | P/S 가 없는 줄에 골이나 카드가 없음 | 실패 |
| 11 | 우리 팀 P 표시 0개 | 메모 (근거: 2025-26 #1 상대팀 강원FS 기록지에서 실제로 있었음. 우리 14경기 기록지는 모두 P=5) |
| 12 | 골 분이 40 초과 | 메모 "연장 분 표기 확인" (연장/PK 분은 미검증) |
| 13 | PK 칸에 값이 있음 | 메모 "승부차기 기록 있음, 사이트에 칸 없음(I-015)" |
| 14 | 분을 읽지 못한 칸(null 원소)이 있음 | 메모 |

**해시 (`applySubset`)**
- 반영에 쓰는 값만 모아 정렬한 JSON 의 sha256 이다: 합계, 전후반/연장, 몰수, 우리 팀 줄(번호, 기록지 이름, P, S, 경고, 퇴장, 골, 자책골), 상대 자책골 수.
- 넣지 않는 것: 심판, 관중수, 파울, 지도자, 비고 글, 상대 선수 줄. 경기 뒤에 이런 칸이 채워져도 가짜 '정정'이 생기지 않는다(`rec116_g1` 은 경기 전에도 지도자가 있고 심판은 비어 있음).
- `seen_hash` = 마지막으로 읽은 값, `applied_hash` = 마지막으로 반영한 값. 검산에 실패한 해시는 `seen_hash` 에만 남고, 값이 다시 바뀌기 전까지 다시 반영하지 않는다.
- 원본 HTML 은 `seen_hash` 가 바뀔 때만 스냅샷으로 남기고, 경기당 최근 2개만 둔다(파서를 고친 뒤 다시 파싱, 정정 전후 비교용).

### 2.3 경기 연결

**`linkMatch(game, matches, clubs, league)`**
- 후보: `competition = league.competition` 이고 `opponent = kfl_clubs[상대].name` 인 사이트 경기.
- 연맹 kickoff 와 KST 날짜가 같은 후보가 정확히 1개면 연결. 0개면 메모 "사이트에 같은 날 이 상대 경기가 없음", 2개 이상이면 "같은 날 후보 여러 개" (둘 다 `review`).
- 지금 15경기는 날짜 + 상대로 15/15 연결된다(검토에서 확인). 라운드로 찾는 2순위는 두지 않는다.
- **`is_home` 으로는 찾지 않는다.** 연맹은 5번(파주)과 20번(단양)에서 은평을 홈(club1)으로 두지만, 사이트는 BR-030 에 따라 중립 경기장을 '원정'으로 둔다(소유자 결정 8: 사이트대로).
- 연결은 한 번 정해지면 유지된다(`kfl_games.match_id`). 연맹이 나중에 날짜를 바꿔도 연결은 그대로다.
- `is_home`, `venue`, `round`, `opponent`, `competition`, `kickoff` 는 덮어쓰지 않는다.
- 스코어 방향: `score_us` 는 우리 club_id 쪽 합계다. `is_home` 기준이 아니다.

**일정 변경 감지**
- 일정표를 읽을 때 `kfl_games.kickoff` 값이 바뀌었고 연결된 `matches.kickoff` 와 1분 넘게 다르면, 메모 "연맹 일정 변경: 사이트 X, 연맹 Y" + `review`.
- 자동으로 바꾸지 않는다. 관리자가 기존 관리자 › 경기 폼에서 고치고 [확인함]을 누른다.

### 2.4 실행 주기와 상태

- **예약:** pg_cron `'7,37 * * * *'`. instagram 의 :00/:15/:30/:45 와 겹치지 않는다.
- **한 번 실행할 때**
  1. POST 만 받는다. `x-sync-secret` 을 `kfl_sync_secret_ok` RPC 로 확인하고, 실패하면 401.
  2. 잠금: `running_since` 가 null 이거나 5분보다 오래됐을 때만 진행한다.
  3. `req_day` 가 오늘(KST)이 아니면 `req_count = 0`.
  4. `paused_until` 이 지나지 않았으면 요청 없이 상태만 쓰고 끝낸다.
  5. **하루 한 번 전체 갱신**: (`last_list_at` 이 null 이거나 20시간보다 오래됐고 KST 06시 이후) 또는 `list_due`. 다 읽으면 `list_due = false`.
     - 활성 리그의 tab03 1쪽부터 마지막 쪽까지(지금 5쪽), 그리고 구단 페이지 1쪽.
     - 45경기 `kfl_games` upsert(kickoff, venue, list_page, 스코어), `is_ours` 표시(club_id 소문자 비교).
     - 첫 실행(행이 새로 생김)이면 `kickoff + 2h <= now` 인 우리 경기의 `next_check_at = now()` (1R 채우기), 나머지는 `kickoff + 2h`.
     - 연결 안 된 우리 경기 `linkMatch`, 일정 변경 감지.
     - 팀 이름 비교: tab03 표기가 `kfl_clubs.fed_name` 과 다르면 경고 "연맹 팀 이름 변경: {club_id} '{fed_name}' → '{새 이름}' (사이트 이름은 그대로, 관리자 확인)". `fed_name` 도 바꾸지 않는다.
     - 순위 다시 계산(아래).
     - 구단 페이지: `parseClubRoster` → 해시. 이전 해시가 있었고 다르면 `club_roster_changed_at = now()`. 이전 해시가 없으면 기준값으로만 저장한다(지금 페이지는 2025-26 명단이라 첫 저장에서 경고하지 않음).
     - 쪽 하나라도 실패하면 `last_list_at` 을 바꾸지 않고 순위도 쓰지 않는다(다음 실행에서 다시).
  6. **우리 경기 확인**: `is_ours and next_check_at <= now()` 를 `next_check_at` 순서로, 예산 안에서.
     - 그 경기의 `list_page` 쪽을 읽는다(이번 실행에서 이미 읽었으면 생략). 그 쪽에 경기가 없으면 이번에는 건너뛰고 `list_due = true` 로 두어 다음 실행에서 전체 일정을 다시 읽는다(쪽은 날짜순이라 일정이 바뀌면 옮겨 감). `last_list_at` 은 비우지 않는다(비우면 2.7 '일정표를 하루 넘게 읽지 못함' 경고가 잘못 뜸).
     - 읽은 쪽의 다른 경기 스코어도 갱신한다. 스코어가 바뀐 경기가 있으면 순위를 다시 계산한다.
     - 앵커가 빈칸이면 `nextCheckAt` 만 정한다.
     - 앵커에 스코어가 있으면 기록지를 읽는다 → `parseSheet` → `isFinished` 아니면 대기 → `checkSheet` → `applySubset` 해시 → (`seen_hash` 가 바뀌면) 스냅샷 → (`applied_hash` 와 다르고 검산 통과면) `planResult` 반영.
     - 반영 순서: `match_appearances`(지울 줄, upsert) → `matches` → 마지막에 `kfl_games`(`applied_hash` 포함). 중간에 실패하면 `applied_hash` 가 그대로라 다음 실행에서 같은 계획을 다시 반영한다(모두 멱등).
  7. 상태: `last_run_at`, `last_ok_at`(예외 없이 끝났을 때), `req_day/req_count`, `last_warning`(이번 실행 경고를 이어 붙여 500자), 정상 파싱이 있었으면 `shape_error_at = null`.
  8. 예외: `last_error`. `KflShapeError` 면 그 경기를 `error` 로, `shape_error_at = now()`.
  9. `{ "dry": true }` 본문이면 읽기와 계획만 하고, 요청 수(`req_day/req_count`) 말고는 쓰지 않은 채 계획 JSON 을 돌려준다. 첫 배포 검증용이다.

**순위 계산 (`standingsFromGames`, BR-034)**
- 활성 리그의 `kfl_games` 중 스코어가 있는 경기로 팀별 승/무/패/득점/실점을 낸다(몰수 0:3 도 스코어대로). 팀 이름은 `kfl_clubs.name`.
- `standings` 의 `season = competition` 행과 팀 이름으로 맞춘다. 6팀이 각각 정확히 1행씩 있어야 한다. 하나라도 없거나 겹치면 아무것도 쓰지 않고 경고 "리그순위 팀 이름이 맞지 않음: …".
- 값이 다른 행만 update 한다(`win, draw, loss, goals_for, goals_against`, `updated_by: 'kfl-sync'`). `played`/`points` 는 DB 가 계산한다.
- 근거: 2025-26 순위 위젯 값이 tab03 스코어 합계와 같다(우리 34:89, 승점 9). 순위 위젯 POST 는 쓰지 않는다.
- 우리 경기 결과가 인스타로 먼저 들어와도 순위는 연맹 스코어가 올라온 뒤 바뀐다(공식 기준).

**`nextCheckAt(game, now)` (순수 함수, 세 상태)**

| 상태 | 다음 확인 |
|---|---|
| 대기 (`applied_hash` 가 null: 결과 없음, 검산 실패, 연결 실패, 일정 변경 메모. `state` 가 `review`/`reviewed` 여도 여기) | kickoff + 2h 전이면 kickoff + 2h. 그 뒤 3시간마다. kickoff + 7일이 지나면 하루 1번으로 바꾸고 메모 "결과기록지가 7일째 없음" + `review` (한 번만) |
| 반영 뒤 다시 확인 (`applied_hash` 있음) | 24시간마다, `rechecks_left` 7 → 0 이면 null. 처음 반영할 때 `rechecks_left = 7`. `seen_hash` 가 바뀌면 다시 반영하고 메모 "기록지가 바뀜(정정)", `rechecks_left = 7` |
| 오류 (이번 확인의 요청/모양 실패, `fails > 0`) | `min(24h, 1h × 2^(fails-1))` 뒤. `fails >= 5` 면 `review` 메모 "연맹 기록을 5번 연속 가져오지 못함", 그 뒤 하루 1번. 성공하면 `fails = 0` 이고 위 두 줄로 돌아간다 |

- 확인 주기는 `applied_hash` 와 `fails` 로만 정한다. `state`(`review`/`reviewed`)는 관리자 표시라서 주기를 바꾸지 않는다(그렇지 않으면 기록지 전에 `review` 가 된 경기가 `rechecks_left = 0` 으로 다시 확인되지 않음).
- `fails` 와 `fail_streak`(2.5)는 check 상한에서 멈춘다(`least(n + 1, 99)`, `least(n + 1, 20)`). 경기 `note` 는 새 메모를 앞에 붙이고 2000자(check 상한)에서 자른다.

관리자 [다시 확인] = `next_check_at = now()` (30분 안에 확인).

1R 기록지가 몇 시간 뒤 올라왔는지(첫 스냅샷 `fetched_at` − kickoff, 확인 간격 3시간 안의 정밀도)를 I-059 에 적고 상수를 조정한다. 배포가 1R 뒤면 2R 에서 잰다.

### 2.5 예의 있는 요청 예산

| 항목 | 값 |
|---|---|
| 호스트 | 상수 `http://www.futsal.or.kr` 하나 (HTTPS 는 연맹 쪽이 깨져 있음) |
| URL | 파싱한 값으로 조립. club_id 는 `^[A-Za-z0-9_]{2,30}$`, 나머지는 숫자만 |
| 요청 | GET 만(tab03, 기록지, 구단 페이지). `redirect: "manual"`, 쿠키/로그인 없음 |
| 헤더 | Referer `http://www.futsal.or.kr/`, Accept-Language `ko`, User-Agent `eunpyeong-fs.com record sync (+https://eunpyeong-fs.com/contact)` (소유자 결정 8) |
| 간격/제한 | 요청 사이 1.5초 이상, 요청마다 20초 제한, 실행당 최대 8건, 실행이 90초를 넘으면 새 요청 안 함(무료 플랜 150초 벽시계) |
| 하루 상한 | 60건 (`req_day`/`req_count`, KST 날짜) |
| 실패 | 403/429/5xx/네트워크 오류면 이번 실행의 요청을 바로 멈추고 `fail_streak = least(fail_streak + 1, 20)`, `paused_until = now + min(24h, 1h × 2^(fail_streak-1))`. 성공한 요청이 있으면 `fail_streak = 0` |
| 예상량 | 평일 하루 6건(일정표 5 + 구단 페이지 1). 경기 주말 15~25건 |
| pg_net | `timeout_milliseconds := 150000` |

### 2.6 자동 반영과 확인 필요

| 대상 | 자동 | 확인 필요 (반영 안 함, 또는 반영 후 메모 + `review`) |
|---|---|---|
| `kfl_games` 일정/스코어 | 자동 | 연맹 팀 이름이 `fed_name` 과 다름(경고만) |
| `matches.status/score_us/score_them` | 검산을 통과하고 `applied_hash` 가 바뀔 때만 | 검산 실패면 반영 안 함 |
| 이미 `finished` 이고 스코어가 다름 (instagram 이나 관리자가 넣음) | 연맹 값으로 덮어씀 | 메모 "기존 X:Y → 연맹 A:B" |
| `matches.scorers` | 우리 골이 있는 줄이 **모두** 연결(auto/confirmed)됐을 때만 `scorersText` 로 덮어씀. 결과가 비면 null (`matches_scorers_check` 는 1~300자) | 연결 안 된 골 줄이 있으면 그대로 두고 메모 "득점자 줄은 명단 확인 뒤 만듦". 관리자가 연결하면 그때 다시 만든다(4.1) |
| `match_appearances` | `stats_live` 인 리그에서 번호표와 맞는 줄은 `auto` | 1.5 의 review 규칙 |
| 몰수 경기 | 스코어만 반영, 출전 기록 없음 | 메모 "몰수: 연맹 기준 출전 기록 없음" |
| `matches.kickoff` 변경 | 안 함 | 메모, 관리자 › 경기 폼에서 고침 |
| `standings` (BR-034) | 45경기 스코어로 계산, 다른 행만 씀 | 팀 이름 매핑 실패면 아무것도 안 씀 + 경고 |
| 연맹 구단 페이지 명단 | 저장만 | 바뀌면 경고(4.2 에서 번호표와 비교), 번호표는 자동으로 안 바꿈(소유자 결정 9) |

**`scorersText(rows, oppOwnGoals, players)`** (소유자 결정 6)
- 형식은 instagram 과 같다: `"김영록 2, 부성인"`. 한 골이면 숫자 없음.
- 이름은 DB `players.name`. 같은 이름 선수가 DB 에 둘 이상이면 그 경기 등번호를 붙인다: `"김대현(6) 2"`.
- 순서: 첫 골 분 오름차순(분을 모르는 골은 뒤), 같으면 번호순.
- 상대 자책골은 맨 뒤에 `"상대 자책골"` 또는 `"상대 자책골 2"`.
- 300자에서 자른다. 빈 결과는 null.
- 이 함수는 관리자 확인 화면도 쓴다(`src/` 에서 상대경로 `.ts` import, `tsconfig` 의 `allowImportingTsExtensions`). `supabase/functions` 를 Node 에서 import 하는 선례는 `scripts/instagram/check.ts` 와 테스트뿐이고 `src/`(Next 빌드)에서는 처음이다. C4 의 정적/DB 모드 빌드로 확인하고, 안 되면 `scorersText`/`diffClubRoster` 를 의존성 없는 파일로 떼어 두 쪽이 같이 쓴다.

**instagram-sync 와의 우선순위 (D-082 에 적음)**
- instagram `planResult` 는 이미 `finished` 인 경기를 덮어쓰지 않고 메모만 남긴다(`instagram-sync/plan.ts:385-387`). 그래서 instagram 결과가 '빠른 잠정 결과'이고, 연맹 기록지가 '공식 결과'로 덮어쓴다.
- kfl-sync 는 **`applied_hash` 가 바뀔 때만** `matches` 에 쓴다. 관리자가 그 뒤 직접 고친 값은 기록지가 다시 바뀌기 전까지 유지된다.
- instagram 함수는 바꾸지 않는다(재배포 불필요).

### 2.7 실패 보고

- **실행 단위:** `kfl_sync_state.last_error` / `last_warning` / `shape_error_at` / `paused_until`.
- **경기 단위:** `kfl_games.state` (`error`/`review`) + `note`.
- **대시보드 알림:** `kflAlerts(input)` 를 `src/lib/admin/alerts.ts` 에 순수 함수로 만들고 `app/admin/(panel)/page.tsx` 에 연결한다(`instagramAlerts` 와 같은 자리, `:76-77,96`). 입력: 상태 행, 우리 경기 행, review 줄 수, 활성 리그 행, 지금 시각.

| 수준 | 조건 | 제목 |
|---|---|---|
| warn | `last_run_at` 이 있고 `last_ok_at` 이 2시간 넘음 | 연맹 기록 자동 수집이 2시간 넘게 성공하지 못했습니다 |
| warn | `last_list_at` 이 30시간 넘음(또는 null 이고 첫 실행 뒤) | 연맹 일정표를 하루 넘게 읽지 못했습니다 |
| warn | `shape_error_at` 이 null 아님 | 연맹 결과기록지 모양이 바뀐 것 같습니다 (자동 반영 멈춤) |
| warn | `paused_until > now` | 연맹 요청을 {시각}까지 멈췄습니다 |
| warn | `state = error` 인 경기 있음 | 연맹 기록을 가져오지 못한 경기 N개 |
| warn | `last_warning` 이 null 아님 | 연맹 수집 경고: {내용} |
| warn | `club_roster_changed_at > coalesce(club_roster_ack_at, 'epoch')` | 연맹 구단 페이지 명단이 바뀌었습니다. 번호표와 비교해 주세요 |
| check | `review` 인 경기 + `review` 인 출전 줄 | 연맹 기록에서 확인할 것 N개 |
| check | kickoff + 48h 지났는데 `waiting` | 결과기록지를 기다리는 경기 N개 |
| check | 기록된 우리 경기가 있고 review 줄 0개인데 `stats_live = false` | 명단 확인이 끝났습니다. 2026-27 기록 공개를 켜 주세요 |
| check | 나무위키 준비 라운드 > `coalesce(namu_round_done, 0)` (4.3, C8 부터) | 나무위키에 반영할 새 라운드가 있습니다 ({N}R) |
| check | 활성 리그의 `deriveRounds` 블록 검사 실패 (3.2, C9 부터) | 라운드 계산 확인 필요 |

### 2.8 보안

- 서버 키는 함수 안에서만 쓴다(Supabase 가 주입). Vercel 과 앱에는 비밀값이 없다(D-065 방식).
- `config.toml` 은 `verify_jwt = false` 이고, 호출은 Vault 비밀값 헤더로 확인한다.
- 연맹 응답은 HTTP 평문이라 **신뢰하지 않는 데이터**로 다룬다.
  - 길이와 범위 검사(DB check 와 같은 값)를 한다.
  - 화면에는 React 이스케이프로만 보인다. 스냅샷 HTML 은 화면에 렌더하지 않는다.
  - 나무마크로 내보낼 때는 항상 이스케이프한다(4.3).
- 마이그레이션, 함수 배포, cron 등록, 앱 배포는 승인 대상이다(DEVELOPMENT_RULES:49-56).
- **무료 플랜:** 함수 호출이 월 약 1,440회 늘어난다. 스냅샷은 경기당 약 60KB × 2개. 30분 실행이 DB 를 깨워 7일 일시정지도 막는다(instagram 과 중복).

### 2.9 수동 점검 스크립트

- `scripts/kfl/check.ts` (읽기 전용, DB 를 쓰지 않음, 키 없음)
  - `node --experimental-strip-types scripts/kfl/check.ts --league 116 --game 1`
  - tab03 쪽을 읽어 그 경기의 club id 를 찾고, 기록지를 읽어 파싱 결과, 검산 결과, 해시, 우리 팀 줄(번호만, 선수 연결 없음)을 출력한다.
  - 같은 예산 규칙(간격 1.5초, 같은 User-Agent)을 쓴다.
- 관리자 로그인 반영 스크립트(`apply.ts`)와 1R 수동 확인은 두지 않는다(1R 은 instagram 이 채우고, 함수 첫 실행이 기록지를 채움).

---

## 3. 홈페이지

### 3.1 바뀌는 기존 화면 (모양과 문구 형식은 그대로, 값만 바뀜)

| 화면 | 바뀌는 것 | 코드 |
|---|---|---|
| `/match/results`, 홈 `MatchStrip`, 피그마 피드 `lastResult` | 결과와 득점자 줄이 기록지 기준으로 바뀐다('상대 자책골' 포함). `/match/results` 표는 이미 라운드 열과 득점자 줄이 있어(`MatchTable.tsx:39`) 그대로 '라운드별 우리 결과'가 된다 | 없음 |
| `/match/schedule`, `Hero` 다음 홈경기 | 결과가 들어오면 예정 목록에서 빠진다(BR-003) | 없음 |
| `/match/standings`, `StandingsWidget` | 순위가 연맹 스코어로 자동(BR-034) | 없음 |
| `/team/players` 카드 '{시즌} 출전 N경기' | 기록 시즌이 `resolveStatsSeason` 으로 정해진다. `stats_live` 전에는 지금과 같음 | `repo.ts`, `team/players/page.tsx`, `player-profile.ts` |
| `/team/players/[slug]` 기록 줄, `profileRows`, `playerDescription`, 출처 줄 '출전/득점: {시즌} 기록 / 자료: 한국풋살연맹' | 같은 값. 출처 줄의 시즌 이름만 바뀐다 | 같음 |

**코드 변경 (C7)**
- `src/lib/data/db-source.ts`: `kflLeagues()` (`league_seq, season, competition, active, stats_live`), `seasonStats()` (`player_season_stats` 의 `competition, season, player_id, apps, starts, goals, yellows, reds`). 정적 모드 `static-source.ts` 는 둘 다 `[]`.
- `src/lib/data/rows.ts`: `KflLeagueRow`/`toKflLeague`, `SeasonStatRow`/`toSeasonStat`. `src/types/index.ts`: `KflLeague`, `PlayerSeasonStat`.
- `src/lib/repo.ts`: `getKflLeagues()`, `getSeasonStats()` 를 `'use cache'` + `cacheTag(TAGS.records)` + `cacheLife('minutes')` 로. 새 `getStatsSeason()` 은 `resolveStatsSeason` 을 쓴다. `cache-tags.ts` 의 `records: "records"` 는 C4 가 먼저 추가한다([공개 켜기]가 `updateTag(TAGS.records)` 를 부름).
- 순수 함수 `resolveStatsSeason`, `playerStats` 는 `src/lib/player-season.ts`.
- 갱신 지연: 함수는 `updateTag` 를 부를 수 없다. 화면 반영은 최대 약 1분(I-008, 기존과 같음). 관리자 저장 동작은 `updateTag(TAGS.matches)`, `updateTag(TAGS.records)` 를 부른다.
- '자료: 한국풋살연맹'은 지금처럼 `isLiveData()` 일 때만 붙인다(BR-008, BR-013).
- I-056 ② 가 함께 풀린다: 2026-27 로 넘어가면 새 선수의 '0경기 / 0골 + 2025-26 출처'가 사실대로 '2026-27 …'로 바뀐다.

### 3.2 새 공개 화면: 피그마 시안 먼저 (이 명세는 데이터만 정한다)

`docs/FIGMA_SYNC.md` 절차: 디자인 세션 시안 2~3개 → 소유자 선택 → 기능 세션 코드. 배치, 색, 배지, 위치는 여기서 정하지 않는다. 순서는 소유자 결정 4 그대로다. 데이터 함수는 시안 전에 C9 에서 만들고 테스트한다. 네 화면 모두 `stats_live` 인 리그의 경기만 보인다(그 전에는 섹션을 숨김).

| 순서 | # | 새 섹션 | 데이터 (순수 함수, `src/lib/kfl-views.ts`) | 읽기 |
|---|---|---|---|---|
| 1 | N2 | 선수 상세 '경기별 기록': 날짜, 라운드, 상대, 홈/원정, 스코어, 선발/교체, 골, 경고, 퇴장 | `playerMatchLog(playerId, appearances, matches)` → kickoff 순 행 | `db-source.appearancesOf(playerId)` (anon, 연결된 줄) + `getMatches` |
| 2 | N3 | 선수 상세 '시즌별 기록': 2026-27(뷰) + 2025-26(고정값) | `playerSeasons(player, statRows, leagues)` → 최근 시즌 먼저. 고정 시즌은 출전과 득점이 모두 0 이면 행을 뺀다 | `getSeasonStats`, `getKflLeagues` |
| 3 | N1 | 라운드별 순위: 라운드마다 순위표(BR-001 정렬) | `deriveRounds(games)`, `roundStandings(games, clubs)` (아래) | `db-source.kflGames(leagueSeq)` (anon 공개 열) + `kfl_clubs` |
| 4 | N4 | 경기결과 행의 출전 명단: 선발/교체, 번호, 이름, 골, 카드 | `matchLineup(matchId, appearances, players)` → `{ starters, bench }`. 그 경기에 `link='review'` 줄이 하나라도 있으면 null(반쪽 명단을 보이지 않음). `ignored` 줄은 뺀다 | `db-source.appearancesOfMatches(ids)` |

**N1 라운드 정의 (검토 16, 32)**
- `deriveRounds(games)`: 한 라운드 경기 수 = 리그 팀 수 / 2 (팀 수는 `kfl_games` 의 서로 다른 club 수, 116 은 6팀 → 3경기). `round = ceil(game_number / perRound)`.
- 블록마다 팀이 모두 다른지 확인한다. 116 은 15블록 모두 통과한다(테스트). 하나라도 깨지면 그 리그는 N1 을 숨기고 대시보드 check 알림 "라운드 계산 확인 필요"를 띄운다(라운드 고치기 칸은 만들지 않음. 필요해지면 그때 추가).
- **'N라운드 뒤 순위' = 라운드 번호가 N 이하인 경기 중 끝난 경기만으로 계산한다.** 연기된 경기(3R = 9번, 12/26, 4~6R 보다 늦음)는 열릴 때 그 라운드 순위에 들어간다. 그래서 각 라운드에 `unplayed`(라운드 N 이하 미진행 경기 수)를 함께 내고, 화면은 이를 표시할 수 있다. 날짜 기준은 라운드가 섞여서 쓰지 않는다.
- 새 페이지가 생기면 `sitemap.ts` 와 `generateStaticParams` 를 확인한다. N1 위치(경기결과 안 탭 또는 새 주소)는 시안에서 제안하고 소유자가 고른다.

주장단 표식은 진행 중인 별도 작업(#44)이 맡는다. 이 명세는 그 칸이 생기면 나무위키 선수단 표에서만 쓴다.

---

## 4. 관리자

관리자 화면은 리디자인에서 빠져 있다(D-069). 기존 부품(`AdminForm`, `FormReader`, `dbErrorMessage`)과 토큰(`var(--…)`)만 쓴다. 모든 서버 동작의 순서: `requireAdminAction()` → `FormReader` 검증 → DB 에서 현재 행 다시 읽기 → 쓰기 → `updateTag` → `redirect`. 라벨 문구는 `src/lib/admin/kfl.ts` 에 모은다(instagram 처럼). 문구에 중간점 없음(BR-024).

### 4.1 `/admin/kfl` '연맹 기록 수집' (메뉴 '경기' 묶음, `roles` 없음 = owner/admin)

**상태 상자**
- 마지막 실행/성공, 마지막 오류/경고, 일정표 읽은 시각, 오늘 요청 수/60, 멈춤 시각과 연속 실패 수.
- [멈춤 풀기]: `paused_until = null, fail_streak = 0` (멈춤 중일 때만 보임).

**기록 공개 상자 (활성 리그마다)**
- "2026-27 선수 기록 공개: 꺼짐/켜짐", 켤 수 있는 조건(1.6)과 지금 상태(기록된 경기 수, 확인 필요 줄 수).
- [공개 켜기] / [공개 끄기]: `kfl_leagues.stats_live`. 조건이 안 되면 켜기 버튼을 비활성으로 두고 이유를 한 줄로 보인다. 저장 뒤 `updateTag(TAGS.records)`.

**우리 경기 표 (활성 리그 15경기)**
- 열: 라운드(연결된 사이트 경기의 `round`), 경기번호, 연맹 일시, 상대, 상태(대기 / 반영 / 확인 필요 / 확인함 / 오류), 스코어, 연결된 사이트 경기, 연맹 기록지 링크(http, 새 창, `rel="noopener noreferrer"`), 마지막 확인, 메모.
- [다시 확인]: `next_check_at = now()`.
- [확인함]: `review → reviewed`. 그 경기에 `review` 줄이 남아 있으면 비활성. 줄 확인으로 경기의 마지막 review 줄이 풀리면 화면이 이 버튼을 바로 옆에 보인다(경기 메모를 읽고 누름, 자동으로 바꾸지 않음).

**확인할 출전 줄 (`link = 'review'`, 경기별로 묶음)**
- 표시: 경기, 번호, 기록지 이름, 이유(메모), 제안 선수("번호 이름 (주소)").
- 선수 고르기: 전체 선수(비활동 포함), 표시는 "번호 이름 (주소)", 제안 선수가 미리 선택됨.
  - [연결]: `link = 'confirmed'`, `player_id = 고른 선수`, `suggested_player_id = null`. 체크 '이 시즌 번호표에도 추가'(그 번호가 번호표에 없을 때 기본 켜짐): `player_season_numbers` 에 (시즌, 번호, 선수) insert. 시즌 중 영입 선수(D-078: 인스타 WELCOME 은 번호 없이 들어옴)가 매 경기 돌아오지 않게 한다.
  - [우리 선수 아님]: `link = 'ignored'`, `player_id = null`.
  - [제안대로 모두 연결] (경기마다): 그 경기의 review 줄 중 제안이 있는 줄을 모두 `confirmed` 로. 시즌 첫 경기 명단 확인용이다. 제안이 없는 줄은 그대로 남는다.
- 저장 뒤: 그 경기의 우리 골 줄이 모두 연결됐으면 `scorersText`(2.6, `kfl_games.opp_own_goals` 사용)로 `matches.scorers` 를 다시 쓰고, `updateTag(TAGS.records)`, `updateTag(TAGS.matches)`.
- 출전 줄의 경기 내용(골, 카드, P/S)은 고치지 않는다(BR-032).

### 4.2 `/admin/kfl/numbers` 시즌 번호표

- 시즌 선택. 표 열: 번호, 선수(이름 + 주소 + 활동 여부), 연맹 구단 페이지의 같은 번호 이름(있으면), 일치 여부.
- 동작: 추가, 수정, 삭제. 겹치는 번호는 PK 오류가 되고 `dbErrorMessage` 로 안내한다.
- 안내 한 줄: "번호를 바꿔도 이미 연결된 출전 기록은 그대로입니다. 그 뒤에 읽는 기록지부터 적용됩니다."
- **연맹 구단 페이지 비교 (소유자 결정 9, 검토 22b)**
  - `kfl_sync_state.club_roster` 와 번호표를 `diffClubRoster` 로 비교해 다른 번호를 위에 모아 보인다(연맹에만 있음 / 번호표에만 있음 / 이름 다름).
  - 안내: "연맹 구단 페이지는 시즌을 늦게 바꿉니다(지금은 2025-26 명단일 수 있음). 자동으로 반영하지 않습니다."
  - [비교 확인함]: `club_roster_ack_at = now()` (대시보드 경고를 끔).
- '현재 선수단 번호로 채우기' 버튼은 두지 않는다(시드가 같은 일을 함, 다음 시즌은 시드 SQL 을 시즌만 바꿔 실행).

### 4.3 `/admin/namuwiki` '나무위키' (메뉴 '경기' 묶음)

**생성기 `src/lib/namumark.ts`** (순수, `@/` 값 import 없음, 테스트 `tests/namumark.test.ts`)

```ts
namuEscape(text): string                   // 아래 이스케이프 규칙
namuDate(iso): string                      // '2026.11.15.(일)' (KST)
namuOutline(source): NamuHeading[]         // 붙여 넣은 원문의 제목 줄 {level, title, folded, line, childCount}
namuHeading(level, title, folded?): string // '== 선수단 ==' / '==# 역대 시즌 #=='
namuOverviewSection(i): string             // == 개요 == (새 문서 전용)
namuRosterSection(i): string               // 선수단 문단: 제목 + 표 (a)
namuSeasonSection(i): string               // 시즌 문단: 제목 + 요약 줄 + 접기(경기 결과) + 접기(선수별 기록, 출전 기록이 있는 시즌만)
namuHistorySection(i): string              // 역대 시즌 문단: 제목 + 끝난 시즌 표
namuArticle(i): string                     // 새 문서 전체 = 개요 + 선수단 + 시즌 기록(역대 시즌 + 시즌 문단들)
namuEditSummary(competition, round): string // '키움증권 2026-27 FK리그1 3R 결과 반영 (출처: 한국풋살연맹)'
```

**문단 구조**
- **새 문서 (구단 문서가 없을 때, 소유자 결정 5)**: `== 개요 ==`, `== 선수단 ==`, `== 시즌 기록 ==` 아래 `=== 역대 시즌 ===` 과 `=== {season} 시즌 ===` (최근 시즌 먼저). 역대 시즌 표를 하위 문단으로 따로 두는 이유: 나무위키 문단 편집은 하위 문단까지 열기 때문에, 시즌 문단과 역대 시즌 표를 따로 바꿀 수 있어야 한다.
- **기존 문서에 맞추기 (문서가 있을 때, 검토 19)**
  1. 관리자가 현재 문서 원문을 한 번 붙여 넣고 [제목 읽기] → `namuOutline` 이 제목 목록을 보인다.
  2. 고른다: 선수단 문단(제목), 시즌 기록 위치(부모 제목. 시즌 문단 단계 = 부모 + 1), 시즌 문단 제목 형식(기본 `{season} 시즌`, 부모 아래 하위 제목에 `\d{4}-\d{2}` 가 있으면 그 모양으로 미리 채움), 역대 시즌 문단(제목 또는 없음).
  3. [저장] → 우리 `kfl_clubs.namu_outline` 에 `{ roster: {level, title}, seasonLevel, seasonTitle, history: {level, title} | null }` 만 저장한다. **붙여 넣은 원문은 저장하지 않는다**(BR-033).
  4. 고른 문단에 하위 제목이 있으면 경고: "이 문단 아래 하위 문단 N개가 있어 통째로 바꾸면 지워집니다."
  - 맞춤이 저장돼 있으면 생성기는 그 제목/단계를 쓰고, 없으면 새 문서 구조를 쓴다.

**출력 규칙 (모두 테스트로 고정)**
- **형식**
  - 줄바꿈은 LF, 줄마다 trim. 표 줄은 `||` 로 시작하고 `||` 로 끝나며 끝 뒤 공백이 없다.
  - 빈 셀(`||||`) 대신 `-` 를 쓴다. 표와 표 사이에 빈 줄을 둔다. 표 안에 제목 줄을 넣지 않는다.
  - 세로 병합 `<|n>` 의 n 은 실제로 출력한 행 수로 계산한다.
- **이스케이프 (`namuEscape`, 검토 28)**
  - 맨 먼저 `\` → `\\`.
  - 그다음 아래 글자 앞에 `\` 를 붙인다: 모든 `[` `]` `{` `}` `|` (링크, 각주, 매크로 `[br]`/`[include(…)]`/`[목차]`, 접기, 표를 일반 규칙으로 막음), 그리고 두 글자 이상 이어진 `'` `-` `~` `_` `^` `,` 의 각 글자. 셀 맨 앞의 `<` 는 `\<`.
  - 이름을 포함해 DB/연맹에서 온 글자는 **항상** 이스케이프한다(이름 정규식 예외 없음, `--` 취소선 사고 방지). 생성기가 쓰는 문법 글자에는 적용하지 않는다.
- **글자**
  - **중간점(·) 금지(BR-024).** 접기 라벨 `[ 경기 결과 펼치기 / 접기 ]`, `[ 선수별 기록 펼치기 / 접기 ]`. 범례 `(C) 주장 / (VC) 부주장 / 2026년 11월 15일 기준`. 출력 전체에 '·'가 없음을 테스트한다.
- **링크**
  - 선수 이름은 `namu_player_docs` 에 문서명이 있는 선수만 `[[문서|이름]]`, 없으면 글자만(강제 링크 없음, 소유자 결정 5). `[[김대현]]` 같은 이름만 링크는 다른 사람 문서로 간다.
  - 상대팀은 `kfl_clubs.namu_doc` 이 있을 때만 `[[문서|표시]]`.
  - 문서명도 이스케이프 규칙을 거친 뒤 `|` 와 `]]` 가 없는지 검사한다(관리자 입력 검증: `^[^\[\]|#]{1,100}$`).
- **색 (검토 27: 새 색을 만들지 않음)**
  - 머리 행: 사이트 '팀 색상' 첫 값(content `emblem.colors`, 기본 `#2B4FA2`) 바탕 + `#ffffff` 글자(`--c-on-dark`).
  - 승/무/패 칸은 경기결과 표 배지(`MatchTable.module.css` `.W/.D/.L`)와 같은 토큰 값을 바탕과 글자 둘 다 적는다: 승 `<bgcolor=#17a34a><color=#ffffff>`(`--c-win`/`--c-on-dark`), 무 `<bgcolor=#eef0f3><color=#6b7080>`(`--c-draw-tint`/`--c-text-sub`), 패 `<bgcolor=#fdeded><color=#d63b3b>`(`--c-loss-tint`/`--c-loss`). 글자색을 함께 적으므로 다크모드 짝 값이 필요 없다. 칸 안에 '승/무/패' 글자를 함께 넣는다.
  - 값은 `src/config/namuwiki.ts` 상수이고, 테스트가 `src/styles/tokens.css` 를 읽어 같은지 확인한다(`LEAGUE_COMPETITION` 테스트 방식). TS 상수는 CODING_STANDARDS:67(컴포넌트 CSS 대상)의 위반이 아니다.
- **정렬**
  - 경기: kickoff 오름차순(라운드 표기는 `matches.round`).
  - 선수: 포지션 GK → FIXO → ALA → PIVO (라벨 `src/data/people.ts` `POSITION_LABEL`: 골레이로/픽소/아라/피보), 그 안에서 번호 오름차순, 번호 없으면 끝에 이름순.

**개요 (새 문서 전용, 검토 19 + BR-033)**
- 2열 표 한 개. 값이 사이트 설정/DB 에 있는 것만 행으로 낸다. 없는 사실은 만들지 않고 행을 뺀다.
  - 구단명 `SITE.name`, 다른 이름 `SITE.alternateNames`, 창단 `SITE.founded`, 리그 활성 `kfl_leagues.competition`, 홈 경기장 `SITE.homeVenue`, 감독 `staff` 의 role '감독', **유스 `YOUTH_TEAMS` 이름('서울은평 아카데미컬 FC')**, 공식 홈페이지 `[[https://eunpyeong-fs.com|공식 홈페이지]]`.
  - 옛 '팀 조직' 유스 글(U-18/U-15/U-12)은 쓰지 않는다(2026-11-13 소유자 "유스는 서울은평 아카데미컬", 운영 데이터도 이미 바뀜).
- 사이트 연혁 글은 옮기지 않는다(BR-019 로 걸러진 글이라 나무위키 서술 기준과 다름). 관리자가 직접 쓴다.

**선수단 문단**
- 활동 선수(`is_active`)만. 표 (a): 포지션 묶음(세로 병합), 번호, 이름(+ 주장단 표식은 #44 칸이 있을 때만).
- 범례와 기준일 줄은 주장단 칸이 있을 때 `(C) 주장 / (VC) 부주장 / {날짜} 기준`, 없으면 `{날짜} 기준`.
- 출처 각주: 구단 내부 정보라 `[* 출처: [[https://eunpyeong-fs.com/team/players|서울은평 덴포스 선수단]]]`.

**시즌 문단**
- 요약 줄: `'''{competition}''': {rank}위 ({played}경기 {w}승 {d}무 {l}패, 승점 {pts}, {gf}득점 {ga}실점, 득실차 {gd})[* {N}R 종료({날짜}) 기준. 출처: [[http://www.futsal.or.kr/mng_gameLeagueRead.action?league_seq={league_seq}|한국풋살연맹]]]` (지금 116). 시즌이 끝나면 '기준' 대신 '최종'. 값은 `standings` + `byRank`(BR-001). 득실차는 `+5`/`0`/`-3`.
- 접기 (b) 경기 결과: 라운드, 날짜, 구분(DB `is_home`: 홈/원정, 중립 경기장도 사이트대로 원정, 소유자 결정 8), 상대, 스코어(우리 : 상대, 경기 전 `-`), 결과 칸, 득점자(`matches.scorers` 그대로, 없으면 `-`). 그 시즌 득점자 값이 하나도 없으면 득점자 열을 뺀다. 아래 줄: '스코어는 서울은평 덴포스 득점 : 상대 득점 순. {N}R 종료({날짜}) 기준.' + 연맹 기록 링크 각주(링크만, 원문 안 옮김).
- 접기 (c) 선수별 기록: **출전 기록이 있는 시즌만**(2026-27 부터). 열: 번호, 이름, 포지션, 출전, 득점, 경고, 퇴장. **도움 열 없음**(연맹 기록 없음, 소유자 결정 8). 퇴장 열은 기본으로 넣는다(기록지에 있는 사실, 바꾸려면 상수 하나).
  - 행: 그 시즌 연결된 출전이 있는 모든 선수(비활동 포함, 검토 21). 떠난 선수에 표시를 붙이지 않는다(나무위키 관례상 '†' 등은 다른 뜻이고, 떠난 사유도 쓰지 않음). 선수단 문단에서만 빠진다.
  - 번호: 그 시즌 출전 줄에서 가장 많이 쓴 등번호(같으면 최근 경기).
  - 합계 행: 득점/경고/퇴장 합(출전 칸 `-`). 상대 자책골이 있으면 아래 줄에 '상대 자책골 N 별도'.
  - 아래 줄: '출전은 경기 결과기록지 출전 명단(선발/교체) 기준. {N}R 종료({날짜}) 기준.' + 출처 각주.
  - `stats_live` 가 꺼진 리그는 (c) 를 내지 않는다.
- **2025-26 (검토 20):** 요약 줄 + 경기 결과 표만. 선수별 표는 만들지 않는다. 고정 칸에는 지금 DB 에 있는 선수만 있어 백승하(#37, 11경기 7골), 김성국, 박종현, 김경모 등이 빠지고 사실과 다른 표가 되기 때문이다. 2025-26 리그명은 DB 값('2025-26 FK1리그').

**역대 시즌 문단**
- 끝난 시즌만(지금은 2025-26). 진행 중 시즌은 넣지 않아 시즌이 끝날 때 한 번만 바뀐다. 열: 시즌, 리그, 순위, 경기, 승, 무, 패, 득점, 실점, 득실차, 승점. 값은 `pastLeagues`.

**나무위키 준비 라운드와 알림 (소유자 결정 2, 검토 18)**
- 준비 라운드 = 활성 리그의 `stats_live` 가 켜져 있을 때, 우리 경기 중 `state in ('recorded','reviewed')` 이고 그 경기에 `review` 줄이 없는 경기들의 `matches.round`(`^(\d+)R$`) 최댓값.
- 준비 라운드 > `coalesce(namu_round_done, 0)` 이면 대시보드 check 알림(2.7)과 이 화면 맨 위 안내.
- [{N}R 까지 나무위키에 반영함] → `kfl_leagues.namu_round_done = N`.

**화면**
- 시즌 선택: `kfl_leagues` 와 지난 시즌(`pastLeagues`).
- 탭: [기존 문서에 맞추기] / [새 문서].
- 복사 블록 `CopyBlock` (클라이언트 컴포넌트): 제목, 읽기 전용 textarea, [복사] 버튼(`navigator.clipboard.writeText`), `aria-live` 로 '복사했습니다'. 클립보드를 못 쓰면 전체 선택으로 대신한다.
- 블록:
  1. 시즌 문단 (매 라운드)
  2. 선수단 문단 (선수단이 바뀔 때)
  3. 역대 시즌 문단 (시즌이 끝날 때)
  4. 편집 요약 한 줄 (매번)
  5. 새 문서 전체 ([새 문서] 탭에서만)
- 상대팀 문서명: 6팀 `kfl_clubs.namu_doc` 작은 폼(빈칸이면 링크 안 함).
- 선수 문서명(선택): 선수단/선수별 표에 나오는 선수의 `namu_player_docs` 작은 폼.
- 체크리스트(5줄, 나무마크 조사 3장 요약): 문단 편집으로 바꾼다 / 미리보기를 확인한 뒤 저장한다 / 생성 문단 아래에 사람이 쓰는 하위 문단을 두지 않는다 / 홍보 문구, 개인정보, 불리한 사실 삭제를 하지 않는다 / DB → 나무위키 한 방향이다.
- 읽기는 관리자 세션 클라이언트로 한다. 생성 결과는 저장하지 않는다.

### 4.4 기타 관리자 변경

- `src/config/admin-nav.ts` '경기' 묶음에 '연맹 기록 수집'(`/admin/kfl`)과 '나무위키'(`/admin/namuwiki`)를 추가한다.
- 관리자 › 리그순위: `kfl_sync_state.last_ok_at` 이 있으면 맨 위에 "활성 리그 순위는 연맹 일정표 스코어로 자동 계산됩니다(직접 고친 값은 다음 갱신 때 바뀝니다)." 한 줄.
- 관리자 › 경기 목록: `kfl_games.match_id` 로 연결된 경기에 '연맹 기록' 표시 글자(기존 배지 부품). 이 경기의 스코어/득점자는 기록지가 바뀌면 다시 쓰인다는 뜻.
- 관리자 › 선수: 폼 라벨 '2025-26 출전/득점/도움 (고정 기록)', 삭제 오류 문구(1.2).

---

## 5. 단계, 커밋, 검증, 배포, 위험, 결정

### 5.1 커밋 나눔 (초안과 번호가 다름. 각각 따로 배포해도 화면과 데이터가 깨지지 않음)

| # | 커밋 | 내용 | 앞선 커밋 | 운영 승인 | 검증 |
|---|---|---|---|---|---|
| C1 | 문서 + 순수 파서 | 0장 문서 기록 전부, `html.ts`/`schedule.ts`/`sheet.ts` + `tests/fixtures/kfl/` + 테스트 | 없음 | 없음 (앱이 쓰지 않는 코드) | `npm test`: 축약 기록지 7장 정답 일치, 함정 사례, tab03 45경기 |
| C2 | 스키마 + 시드 | `20261114100000_kfl_records.sql`, `2026-11-14_kfl_seed.sql`, `rls-check.mjs` 추가, 일정/순위 SQL 머리 주석, `dbErrorMessage` 23503 + 선수 삭제 문구 | C1 | **운영 DB 마이그레이션 + 시드 실행** (+ 앱 배포: 오류 문구) | 로컬 `supabase db reset` → 시드 → `rls-check` → advisors 보안 경고 0. 운영 시드 검사 4개 통과 |
| C3 | 계획 + 점검 스크립트 | `plan.ts` + 테스트, `scripts/kfl/check.ts` | C1 | 없음 | 2025-26 합계 재현, 순위 재현, `check.ts --league 116 --game 1` 출력(미진행) |
| C4 | 관리자 화면 | `/admin/kfl`, `/admin/kfl/numbers`, `kflAlerts`, 메뉴, 리그순위 안내 줄, 경기 목록 표시, 선수 폼 라벨, `TAGS.records` | C2, C3 (`scorersText`, `diffClubRoster`) | 앱 배포(통상) | 390px 가로 넘침 없음, 중간점 없음, 미디어 계정 접근 불가, 빈 상태 표시 |
| C5 | 서버 함수 | `index.ts`, `config.toml` (비밀값과 상태 행은 C2) | C2, C3 | **Edge Function 배포** + dry 호출 1회 | SQL `net.http_post(... body {"dry":true})` → 45경기, 우리 15경기 연결 계획, 1R 계획 확인(Edge 런타임 HTTP 80 아웃바운드 확인 포함). 쓰기 없음 확인 |
| C6 | 예약 실행 | `20261114110000_kfl_sync_cron.sql` (instagram cron 과 같은 모양, 주소 고정, Vault 헤더, `'7,37 * * * *'`, timeout 150000) | C5 | **cron 등록(마이그레이션)** | `cron.job_run_details` 성공, `last_ok_at`, `req_count`, 45경기, 1R `review` 줄, 순위 행 |
| C7 | 공개 읽기 경로 | `kflLeagues`/`seasonStats` 읽기, `resolveStatsSeason`/`playerStats`, `TAGS.records` 캐시, 선수 카드/상세 | C2, C4 (`TAGS.records`) | 앱 배포(통상) | 정적 모드 빌드 + DB 모드 빌드. `stats_live` 꺼짐에서 화면 변화 없음, 로컬에서 켰을 때 값 = 뷰 |
| C8 | 나무위키 | `namumark.ts` + 테스트, `src/config/namuwiki.ts`, `/admin/namuwiki`, `CopyBlock`, 준비 라운드 알림 | C2, C4 | 앱 배포(통상) | 생성 텍스트를 나무위키 편집창 **미리보기**에 붙여 확인(관리자, 저장 안 해도 됨) |
| C9 | 새 화면 데이터 | `src/lib/kfl-views.ts` (`playerMatchLog`, `playerSeasons`, `deriveRounds`, `roundStandings`, `matchLineup`), db-source 읽기 함수(정적 모드는 `[]`) + 테스트 | C2, C7 | 없음 (화면에서 아직 안 씀) | 116 라운드 15블록 통과, 108 블록 1/2/3/6 실패 |
| C10 | N2 경기별 기록 | 피그마 시안 → 소유자 선택 → 코드 | C9 | 앱 배포(통상) | 시안 1:1 |
| C11 | N3 시즌별 기록 | 같음 | C9 | 앱 배포(통상) | 시안 1:1, 2025-26 행이 다시 보임 |
| C12 | N1 라운드별 순위 | 같음 (+ 새 주소면 sitemap) | C9 | 앱 배포(통상) | 시안 1:1 |
| C13 | N4 경기 출전 명단 | 같음 | C9 | 앱 배포(통상) | 시안 1:1, review 줄 있으면 숨김 |

- 초안의 C9(순위 위젯)는 C5 함수 안의 `standingsFromGames` 로 대신했고, 초안의 C10(2025-26 보충)은 이미 운영 반영돼 뺐다.
- 모든 커밋에서: `npm run lint`, `npm test`, `npm run build`(정적 모드와 DB 모드), 해당하면 `node supabase/tests/rls-check.mjs`.

### 5.2 테스트와 고정 자료

| 파일 | 내용 |
|---|---|
| `tests/kfl-html.test.ts` | 중첩 표, 작은따옴표 속성(`colspan='22'`), 엔티티, U+FEFF, NFC (NFKC 아님), 닫히지 않은 `tr`/`td`(방어) |
| `tests/kfl-schedule.test.ts` | tab03 116 다섯 쪽 → 45경기, 우리 15경기(1,5,9,10,13,16,20,24,27,28,32,34,39,42,43), 앵커 빈칸/스코어, club id 대소문자 보존 + 소문자 매핑(`fsseoul`/`FSSeoul`), 9번이 2쪽에 있음(날짜순). 구단 페이지 명단 파싱 |
| `tests/kfl-sheet.test.ts` | 축약 기록지 7장 = 정답 JSON. 자책골(23/25/40), 숫자 없는 `og` → null 분(합성 사례), 몰수(28), 두 번째 경고(25, 5번 14/25/25), club id 없는 페이지(43_min) → `hasPlayers=false`, 미진행(116_g1) → `isFinished=false`, 잘린 HTML → `KflShapeError`. `checkSheet` 14개 규칙 각각(경기번호 다름, 대회명 다름, 등번호 겹침 포함). `applySubset` 이 심판/관중/파울/지도자/비고 변경에 해시가 안 바뀜 |
| `tests/kfl-plan.test.ts` | `matchPlayers` 8개 규칙과 동명이인 4줄, `live=false` → 전부 review + 제안, 정정 줄 → review, 기존 auto 유지(번호표가 바뀌어도). `linkMatch` (날짜 + 상대, `is_home` 무시, 5번/20번). `planResult` (대기 → 반영, 이미 finished 다른 값 → 덮어씀 + 메모, 같은 해시 → 할 일 없음, 몰수, 득점자는 골 줄 모두 연결일 때만, 빈 결과 null). `scorersText` 형식(한 골 숫자 없음, `김대현(6) 2`, `상대 자책골 2`, 300자). `nextCheckAt` 세 상태 전부. `standingsFromGames` (108 파생 경기 → `2025-26_kfl.sql` 순위와 같음, 우리 2/3/10 34:89). `diffClubRoster`. **2025-26 합계가 `2025-26_kfl.sql` 과 같음**(#5 13/0, #7 13/1, #8 9/1, #18 12/1, #21 2/1, #25 7/0, #77 12/10, #3 8/4) 그리고 운영 보충값과 같음(#11 13/3, #23 14/0, `2026-11-13_roster_drive.sql:49-50`) |
| `tests/player-season.test.ts` | `resolveStatsSeason` (`stats_live` 꺼짐/켜짐/여러 리그), `playerStats` (고정 / 뷰 / 기록 없음 0) |
| `tests/namumark.test.ts` | 표 줄 규칙, 빈 셀 없음, `<|n>` 수, 이스케이프(`\` 먼저, `--`, `[[`, `[br]`, `||`, 셀 앞 `<`), '·' 없음, 링크는 문서명 있을 때만, 정렬, 색 상수 = `tokens.css`, `namuOutline`(단계, 접힌 제목, 하위 수), 맞춤 저장값의 제목/단계 사용, 개요 유스 = `YOUTH_TEAMS`, 2025-26 선수별 표 없음, 득점자 없는 시즌 열 빠짐, 채운 예 스냅샷 |
| `tests/kfl-views.test.ts` (C9) | `deriveRounds`, `roundStandings`(미진행 수, BR-001), `playerMatchLog`, `playerSeasons`, `matchLineup`(review 있으면 null, ignored 제외) |
| `tests/alerts.test.ts` (추가) | `kflAlerts` 각 조건 |
| `tests/rows.test.ts` (추가) | `toKflLeague`, `toSeasonStat` |
| 상수 테스트 | 시드 SQL 의 116 competition = `LEAGUE.currentCompetition` (파일 읽기) |

**고정 자료 `tests/fixtures/kfl/` (소유자 결정 8)**
- 연맹 HTML 은 테스트에 필요한 부분만 남긴 축약본이다: `<script>`/`<style>`/머리/메뉴 제거, 기록 표만 유지, 심판/경기감독/심판감독/기록원/계시원 칸과 지도자 칸은 빈칸, 비고 글은 사람 이름을 지우고 `몰수` 등 판정에 필요한 말만 남긴다. 파일 머리 주석에 원래 주소, 받은 날짜, 축약 규칙을 적는다.
- 기록지 7장: 108 의 1, 23, 25, 28, 40, 43_min 과 116_g1.
- tab03 116 다섯 쪽(표만), 구단 페이지(명단 표만).
- 파생 자료(JSON, 이름 없음): `sheets.expected.json`(7장 파싱 결과, 새 타입 모양으로 다시 만듦. 조사의 jsonl 에는 심판 이름이 있어 그대로 쓰지 않음), `our-2025-26.json`(우리 15경기의 번호/P/S/골/카드/자책골), `games-108.json`, `games-116.json`(경기번호, club id, kickoff, 스코어, 108 은 사이트 팀 이름 매핑 포함).
- 15장 HTML 을 다 넣지 않는다(검토 7): 파서 정확성은 7장으로, 합계 재현은 파생 자료로 검사한다.

### 5.3 배포 순서 (오늘 2026-11-13 금, 1R 11-15 일 14:00, 2R 11-21 토 14:00)

1. **11-13 ~ 14:** C1 → C2 (승인 후 운영 마이그레이션 + 시드) → C3.
2. **11-15 1R:** 할 일 없음. instagram-sync 가 스코어/득점자를 넣는다.
3. **승인 후, 2R 전 목표:** C4 (관리자) → C5 (함수 배포 + dry 확인) → C6 (cron). 첫 실행이 일정표 45경기, 순위, 1R 결과기록지를 채운다(1R 줄은 전부 review).
4. **이어서:** C7 배포 → 관리자가 `/admin/kfl` 에서 1R 명단 확인([제안대로 모두 연결] 또는 줄마다) → [공개 켜기]. 이때부터 선수 카드/상세가 2026-27 이다. 1R 게시 지연을 I-059 에 적는다.
5. **그다음:** C8 (나무위키). 관리자가 구단 문서가 있는지 확인하고 [기존 문서에 맞추기] 또는 [새 문서]를 쓴다.
6. **새 화면:** C9 → 피그마 시안(N2) → C10 → N3 → C11 → N1 → C12 → N4 → C13.
- **멈추기:** `select cron.unschedule('kfl-sync');` (SUPABASE_SETUP 메모). 반영된 데이터는 남는다. 공개만 되돌리려면 [공개 끄기].
- **되돌리기:** 경기 하나의 출전 기록은 `delete from match_appearances where match_id = …` 후 `update kfl_games set applied_hash = null, next_check_at = now() where match_id = …` (다음 실행에서 다시 반영), `matches` 는 관리자 › 경기에서 고친다.

### 5.4 위험

| 위험 | 대응 |
|---|---|
| I-013 약관 (허락 없는 재사용 금지) | 소유자가 위험을 수용했다(D-082). GET 만, 하루 60건 이하, 간격 1.5초, 사이트를 밝힌 User-Agent, 출처 표기 유지, 멈추기 한 줄. 연락처는 I-013 에 그대로 둔다 |
| 연맹 HTML 변경 (JSP, dhtmlx, 후원사 이름) | 모양 검사에서 멈추고 일부만 반영하지 않는다. 대시보드 '모양이 바뀜' 알림. 스냅샷으로 파서를 고친 뒤 다시 파싱. 대회명 검사는 season + `(FK1)` 만 본다 |
| 다른 경기 기록지를 받음 (매개변수가 틀려도 200) | 경기번호, 대회명, 우리 팀 이름 검산 |
| 번호 등록 어긋남 → 잘못된 자동 연결 (가장 큰 데이터 위험) | 시즌 첫 경기는 전부 review, 관리자 확인 뒤 `stats_live`. 동명이인 시드 검사. 번호표 화면에 주소. 연맹 구단 페이지 비교 경고(자동 반영 안 함). 이름 대조 |
| 번호표 오류 / 시즌 중 번호 변경, 번호 재사용 | 이미 연결된 줄은 그대로(1번 규칙). 정정으로 바뀐 줄은 review. 화면 안내 |
| 수기 입력 오류, 발표 뒤 정정 | 검산 실패는 반영 안 함. 7일간 하루 1번 다시 읽고, 반영 값이 바뀌면 다시 반영 + 메모. 심판/관중 등은 해시에서 빼 가짜 정정 없음 |
| 득점자 줄이 나빠짐 | 골 줄이 모두 연결됐을 때만 덮어씀, 아니면 instagram 값 유지 |
| 일정 쪽 이동 (날짜순 쪽) | 쪽에 경기가 없으면 전체 일정 다시 읽기 |
| HTTP 평문 (변조 가능) | 범위/길이 검사, 이스케이프. 위험도는 낮다 |
| Edge 런타임의 HTTP 80 아웃바운드, 연맹 차단 | C5 dry 에서 확인. 막히면 cron 을 걸지 않고 `scripts/kfl/check.ts` 로 점검만 하며 다른 방법을 다시 정한다 |
| instagram-sync 와 이중 쓰기 | 2.6 규칙: 연맹이 공식이고, 반영 값이 바뀔 때만 쓴다 |
| 순위 자동 계산이 감점 등을 못 담음 | BR-034, I-059 에 적음. 직접 고친 값은 다음 갱신 때 덮인다는 안내 줄(4.4). 감점이 실제로 생기면 그때 감점 칸을 따로 정한다(지금은 `standings.points` 가 승×3+무 계산 열이라 사이트도 감점을 담지 못함) |
| 대회명/팀 이름 드리프트 (후원사, 용인 같은 개명) | `kfl_leagues.competition` 한 곳 + 상수 테스트. D-072 영향 목록에 추가. 팀 이름은 경고만, 사이트 이름 자동 변경 없음 |
| 컵/플레이오프 미지원 | 범위 밖. 지금처럼 관리자가 직접 넣는다 |
| 나무위키 편집 분쟁, 홍보성 판정 | 사실과 수치만. 체크리스트. 문단 단위로 붙여넣기. 자동 편집 없음. 원문 저장 없음 |

### 5.5 결정 (소유자 2026-11-13, 질문 대신)

| # | 항목 | 결정 | 반영 |
|---|---|---|---|
| 1 | 연맹 결과기록지 수집 | futsal.or.kr 에서 자동 수집, I-013 위험 수용 | D-082, 2장 |
| 2 | 나무위키 | 자동 편집 없음, 관리자 화면 생성 + 복사 버튼, 새 라운드 알림 필수(`namu_round_done`) | D-083, 4.3, 2.7 |
| 3 | 기록 시즌 전환 | 1R 기록이 들어오고 관리자가 첫 경기 명단을 확인한 직후 `stats_live` 로. 그 전에는 2025-26 | 1.6, 4.1 |
| 4 | 새 공개 화면 | N2 → N3 → N1 → N4, 피그마 먼저, 명세는 데이터만 | 3.2, C9~C13 |
| 5 | 나무위키 구단 문서 | 새 문서 템플릿(개요, 선수단, 시즌 기록) + 기존 문서 맞추기 둘 다. 선수 문서명은 선택, 강제 링크 없음 | 4.3 |
| 6 | 순위, 자책골 | 순위는 `kfl_games` 스코어로 자동(위젯 POST 없음). 득점자 줄과 나무위키에 '상대 자책골' | BR-034, 2.4, 2.6 |
| 7 | 2025-26 보충 | 원해연 13경기 3골, 이준형 14경기 0골은 이미 운영 반영(기록지로 확인). 계획에서 뺌 | I-056 ① |
| 8 | 기본값 | 출전 = P 또는 S. User-Agent `eunpyeong-fs.com record sync (+https://eunpyeong-fs.com/contact)`. 고정 자료는 축약 HTML(심판/임원 이름 제거). 중립 경기는 사이트대로 원정/홈. 도움 열 없음. GK 실점 범위 밖(I-036 메모) | 2.5, 5.2, 4.3 |
| 9 | 번호표 | 2026-27 은 활동 선수 `players.number` 로 시드(D-078). 연맹 구단 페이지는 경고만, 자동 신뢰 안 함 | 1.4, 4.2 |
| 10 | 용인 이름 | 연맹 개명(용인대흥FS → 용인지솔FS). `yongintmt` → 사이트 이름 '용인지솔FS'(이미 BR-030). 사이트 데이터 자동 변경 없음, 앞으로의 개명은 경고 + 관리자 확인 항목 | 1.4, 2.4 |
| 11 | 번호 | D-082, D-083, I-059, BR-032~034 | 0장 |
| + | 유스 (소유자 "유스는 서울은평 아카데미컬") | 나무위키 개요의 유스 = `YOUTH_TEAMS` '서울은평 아카데미컬 FC'. 옛 U-18/U-15/U-12 글은 안 씀 | BR-033, 4.3 |
| 이 명세의 기본값 | 질문 없이 정함, 바꾸기 쉬움 | 나무위키 퇴장 열 넣음. 승/무/패 색과 머리 색은 사이트 토큰/내용 값 그대로. 떠난 선수 표시 없음. 대기 7일 뒤 하루 1번 | 4.3, 2.4 |
| 알고 받아들인 결과 | | `stats_live` 를 켜면 N3 배포 전까지 선수 상세에서 2025-26 숫자가 안 보임 | 1.6 |

**운영 승인이 필요한 것:** C2 운영 마이그레이션 + 시드, C5 Edge Function `kfl-sync` 배포(+ dry 호출), C6 cron 등록. 그 밖의 커밋은 통상 앱 배포 승인만 필요하다.

---

## 부록 A. 검토 33건 반영표

| # | 반영 | 위치 |
|---|---|---|
| 1 | `kfl_sync_state`, 스냅샷에 audit 트리거 안 닮 | 1.2 |
| 2 | `player_id on delete restrict` + 삭제 안내 문구. 제안은 별도 칸 `suggested_player_id`(set null) | 1.2 |
| 3 | 같은 (번호, 이름) 줄은 link 종류와 상관없이 유지 | 1.5 규칙 1 |
| 4 | `valid_from` 대신 3번 규칙 + 정정 줄 review + 화면 안내 | 1.5 |
| 5 | `check.ts` 는 DB 없이 번호만 출력 | 2.9 |
| 6 | `fail_streak` 추가, [멈춤 풀기] + 열 권한 | 1.2, 1.3, 4.1 |
| 7 | 축약 HTML 7장 + 파생 자료로 합계 검사 | 5.2 |
| 8 | 골 줄 모두 연결일 때만 득점자 덮어씀, 빈 결과 null | 2.6 |
| 9 | 등번호 겹침 → 검산 실패 | 2.2 #9 |
| 10 | 경기번호, 대회명 검산 | 2.2 #1, #2 |
| 11 | 반영 대상 값만 해시 | 2.2 |
| 12 | 쪽에 없으면 전체 일정 다시 읽기 | 2.4 |
| 13 | P 0개 근거 바로잡음, 닫히지 않은 태그는 방어 코드, 작은따옴표 속성 테스트, 숫자 없는 og = null 분 | 2.1, 2.2, 5.2 |
| 14 | club_id 소문자 저장/비교, 주소에는 원래 표기 | 1.2, 2.4 |
| 15 | 뷰 권한 명시, 참조 열 grant, rls-check | 1.3 |
| 16 | `/match/results` 가 이미 라운드별 결과. N1 = 라운드별 순위, 라운드 번호 기준 + 미진행 수 | 3.1, 3.2 |
| 17 | 순위는 `kfl_games` 로 기본 계산, 위젯 없음 (소유자 결정 6) | 2.4, BR-034 |
| 18 | 나무위키 알림 필수, `namu_round_done` 한 칸 | 1.2, 4.3 |
| 19 | 기존 문서 원문 붙여 넣어 문단 맞춤, 선수 문서명 선택, 연혁 안 옮김 | 4.3 |
| 20 | 2025-26 은 요약 + 결과표만, 선수별 표 없음 | 4.3 |
| 21 | 떠난 선수는 시즌 표에 남기고 선수단 문단에서만 뺌. 표시는 붙이지 않음(나무위키 관례와 떠난 사유 금지 때문에 일부 거절) | 4.3 |
| 22 | (a) 첫 경기 전부 review → `stats_live` 에 합침, (b) 구단 페이지 비교 경고 | 1.5, 1.6, 2.4, 4.2 |
| 23 | `stats_live` 관리자 칸 | 1.6 |
| 24 | [연결] + '번호표에도 추가' | 4.1 |
| 25 | 사이트에서 출전 줄을 고치지 않음, 남는 오류는 메모 | BR-032 |
| 26 | GK 실점 범위 밖, 근사안 질문은 거절(소유자 결정 8) | 0장, I-036 |
| 27 | 새 색 대신 사이트 토큰 값, 글자색까지 적어 다크모드 해결, 토큰 대조 테스트 | 4.3 |
| 28 | `\` 먼저, 항상 이스케이프, `[` 일반 규칙 | 4.3 |
| 29 | 소유자 질문 → 결정표 | 5.5 |
| 30 | 관리자 화면 피그마 없이(규칙 위반 아님), TESTING_GUIDELINES 문구 수정 | 머리말, 0장 |
| 31 | `apply.ts` 와 1R 수동 확인 뺌 | 2.9, 1R 안내 |
| 32 | 라운드 계산 묶음을 N1 데이터(C9)로 미룸, DB 라운드 칸 없음, 날짜 + 상대만으로 연결 | 2.3, 3.2 |
| 33 | euc-kr, 파울/지도자/관중, fed_name 중복 칸, 리그 목록 찾기, 위젯 POST, [경기 시간 연맹대로], 스냅샷 3개 → 2개, `nextCheckAt` 세 상태, 복사 블록 줄임(7 → 4 + 새 문서 1, 역대 시즌은 시즌 끝에만 바뀌는 별도 문단이라 남김), '채우기' 버튼 뺌 | 2.1, 2.2, 2.4, 4.2, 4.3 |
