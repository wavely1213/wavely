> 2026-11-13 총괄 세션 조사 기록. 본문의 `/tmp/.../scratchpad/...` 경로는 총괄 세션 임시 폴더라 저장소와 다른 세션에는 없다(연맹 HTML 은 C1 에서 다시 받는다).

# Code map: federation result-sheet sync, Namuwiki markup and homepage records

Site root: `/home/user/wavely/sites/eunpyeong-denforce`. All paths below are relative to it. Read-only: nothing was modified.

Nothing exists yet for Namuwiki or for an automated federation feature. A grep of `src/`, `supabase/functions/`, `scripts/` and `tests/` finds no "나무위키"/"namu" and no futsal.or.kr fetcher. The only futsal.or.kr hits are comments and a linkify test.

## 1. DB schema (supabase/migrations)

**players** (`20261015000000_init.sql:77-92`)
- Columns: `id uuid`, `slug unique` (`^[a-z0-9]+(-[a-z0-9]+)*$`), `number int 0..99 null`, `name 1..40`, `position in (GK, FIXO, ALA, PIVO)`, `photo_url`, `birth`, `height_cm 100..250`.
- **`apps` / `goals` / `assists` int not null default 0, >=0** (lines 86-88). These are single static totals with no season column.
- `is_active` bool, `updated_at`, `updated_by`.
- No uniqueness on `number` or `name`. Same-name players (김대현 slugs `no-8`=#6 and `no-18`=#18; 김종호 `no-22`=#22 and `kim-jongho`=#30) are told apart only by slug or number (BR-025, `docs/DOMAIN_KNOWLEDGE.md:77`).
- Inactive rows are kept for history, e.g. 하윤호 `no-26` and 박영완 `no-25`.

**matches** (`init.sql:107-127`)
- Columns: `competition 1..60`, `round text default '' <=30` (e.g. '1R'), `kickoff timestamptz`, `venue <=60`, `is_home`, `opponent 1..40`, `status in (scheduled, finished)`, `score_us` / `score_them` 0..99.
- Constraint `matches_score_matches_status`: finished requires both scores; scheduled requires both null.
- Index on `kickoff` only. **There is no natural or external key**: no unique `(competition, round)` and no federation game id. The schedule SQL avoids duplicates with `where not exists` (`supabase/data/2026-27_fk1_schedule.sql:22`).
- `20261018100000_match_videos_scorers.sql:7-13` adds `highlight_url` / `replay_url` (https, <=500) and **`scorers text` (1..300, free text, ours only, e.g. '원해연 2, 김민성')**. Scorers are stored only as display text with no link to player ids, so they cannot tell same-name players apart.
- Gaps: no PK-shootout columns (I-015, `docs/KNOWN_ISSUES.md:326`). No goalkeeper goals-conceded column (I-036, `:184`).

**standings** (`init.sql:130-143`)
- Columns: `team`, `win` / `draw` / `loss` / `goals_for` / `goals_against` (>=0), `is_us`.
- Generated columns: `played = w+d+l` and `points = w*3+d` (BR-005).
- `season text not null 1..40` plus index, added in `20261016000000_standings_season.sql:5-9`. `season` equals the match competition string.
- One cumulative row per (season, team), entered by hand. No unique (season, team) and **no per-round snapshots**.

**Audit**
- Trigger `<table>_audit` before insert/update calls `set_audit()` (`init.sql:182-190`).
- Since `20261019150000_audit_user_ids.sql:9-19`, `set_audit()` sets `updated_by = coalesce(auth.uid()::text, new.updated_by)`, i.e. a uuid and not an email (I-042).
- Writes made with the service role have no `auth.uid()`. An UPDATE therefore keeps the previous `updated_by`, and an INSERT leaves it null.

**RLS** (`init.sql:198-213`)
- players, matches and standings: select for anon and authenticated using `true`. Insert, update and delete for authenticated with `is_admin()`.
- `20261019120000_admin_roles.sql` redefines `is_admin()` as role in (owner, admin) (`:38-46`). Helpers: `admin_role()` `:23`, `is_owner` `:48`, `is_media` `:58`, `is_staff` `:69`, `media_can` `:80`, `my_admin_profile` `:104`.
- Media accounts get write policies only on news_posts and postings (`:256-280`). **Media cannot write matches, players or standings.**

**LEAGUE** (`src/config/league.ts:3-12`)
- `statsSeason: "2025-26 FK1리그"` (`:6`): the season that `players.apps/goals` represent.
- `currentCompetition: "키움증권 2026-27 FK리그1"` (`:11`, D-072).
- `source: "한국풋살연맹"`.

**Data provenance**
- `supabase/data/2025-26_kfl.sql` was collected by hand from futsal.or.kr (2025-26 FK1 = `league_seq=108`, 2026 FK CUP = `113`). It contains players with 2025-26 apps/goals (`:46-85`), 17 matches (`:101-118`) and final standings (`:121-128`). Assists are always 0 because the federation does not publish them.
- The data comments use "경기번호" (game number, e.g. 10R = 28). That is a candidate external key.
- Current roster SQL: `supabase/data/2026-11-13_roster_drive.sql` (32 active players, slug, number, name, position). 윤창욱's 2025-26 stats (8 apps, 4 goals) are set at `:47`.
- **Drift:** `2026-27_fk1_schedule.sql` and `2026-27_fk1_standings.sql` still say `'2026-27 FK1리그'`. The production DB was renamed to `'키움증권 2026-27 FK리그1'` (D-072, `docs/DECISION_LOG.md:108`), so re-running these files in a fresh environment produces the old name.

## 2. Public read path and caching

**Data layer**
- `src/lib/repo.ts`: `'use cache'` + `cacheTag(TAGS.x)` + `cacheLife('minutes')`.
- `getMatches` `:81-86` (tag `matches`). `getUpcomingMatches` / `getFinishedMatches` `:88-94` filter by status (BR-003). `getNextHomeMatch` `:97`.
- `getAllStandings` `:101-106` (tag `standings`). `getStandings` filters `season === LEAGUE.currentCompetition` and sorts with `byRank` (`:109-111`). `getPastLeagues` / `getPastLeague` `:114-120`. `getSeasonResults(season)` `:123-127`.
- `getPlayers` `:159-170` (tag `players`, sorted by position, number, name). `getPlayersByPosition` `:172`. `getPlayer` `:177`.
- Tags are defined in `src/lib/cache-tags.ts:2-16`.
- `src/lib/data/db-source.ts` uses the anon client:
  - `players()` returns **active only** (`.eq("is_active", true)`, `:53-56`).
  - `matches()` `:61`; `standings()` `:65`.
- Static fallback: `src/lib/data/static-source.ts`.
- Row and domain mapping is in `src/lib/data/rows.ts`: `PlayerRow` `:22-35`, `MatchRow` `:39-53`, `StandingDbRow` `:55-67`, `toPlayer` `:142` (`stats: {apps, goals, assists}`), `toMatch` `:156`, `toStanding` `:175`.
- Domain types: `src/types/index.ts`, with `Player` `:5-15`, `Match` `:26-41` (`scorers: string|null`) and `StandingRow` `:43-56`.

**Invalidation**
- Admin server actions call `updateTag(TAGS.x)` before `redirect` (D-009, `docs/ARCHITECTURE.md:92`).
- **The Edge Function does not call any tag invalidation.** Its writes show up only once `cacheLife('minutes')` expires: about 1 minute per instance (I-008, `KNOWN_ISSUES.md:378`).

**Pages that show this data**
- `/match/results` (`src/app/(site)/match/results/page.tsx:14-31`): `MatchTable details`. The scorers line and video buttons come from `src/components/match/MatchTable.tsx:109,133-157`, gated by `hasMatchDetails` (`src/lib/match.ts:91`). "자료: 한국풋살연맹" is shown only when `isLiveData()` (BR-008 and BR-013).
- `/match/schedule` (`schedule/page.tsx:18-37`): upcoming `MatchTable`.
- `/match/standings` (`standings/page.tsx:16-59`): current-season `StandingsTable` plus past-league chips.
- `/match/standings/[season]` (`[season]/page.tsx:35-66`): final table plus `getSeasonResults` (`:38`). Its `generateStaticParams` lists past seasons.
- `/team/players` (`team/players/page.tsx:17-41`): card line "{seasonYear(statsSeason)} 출전 N경기" (`:21-23`, `playerAppsLine` at `src/lib/player-profile.ts:139`).
- `/team/players/[slug]` (`[slug]/page.tsx`):
  - record line from `playerRecordLine` (`player-profile.ts:132`) and `profileRows` (`:60-75`, assists only if >0, BR-009).
  - `findPlayerJoin` uses `statsSeason` (`:29`).
  - source line "출전/득점: {statsSeason} 기록 / 자료: …" (`:69`).
  - `playerDescription` for meta (`:38-44`).
- Home (`src/app/(site)/page.tsx:44-118`): `homeMatchItems` (`lib/match.ts:25`) feeds `MatchStrip`; also `StandingsWidget` (shows `LEAGUE.currentCompetition`, `components/home/StandingsWidget.tsx:24`), `PlayersPreview`, and `Hero` next home match.
- `sitemap.ts` lists players and past-season slugs.
- Helpers: `lib/standings.ts` (`byRank` `:7`, `leagueDivision` `:17`, `seasonSlug` `:27`, `seasonYear` `:39`, `pastLeagues` `:53`) and `lib/match.ts` (`groupByCompetition` `:5`, `matchLabel` `:16`).

## 3. Admin side

**Matches** (`src/app/admin/(panel)/matches/`)
- `actions.ts`, `readMatch` `:13-54`:
  - FormReader: competition <=60, round <=30, KST date+time converted with `kstToIso` plus a round-trip check, `is_home` choice, opponent <=40, status choice.
  - Scores 0..99 are required only when finished. `optHttpsUrl` for videos. `scorers` <=300 is kept only when finished.
- `createMatch` `:56-69`, `updateMatch` `:71-88` (re-reads the row first), `deleteMatch` `:90-97`. Order: `requireAdminAction()`, validate, write, `updateTag(TAGS.matches)`, `redirect`.
- `page.tsx:142-161` shows scheduled and finished lists. `MatchForm.tsx` defaults competition to `LEAGUE.currentCompetition` (`:30`); scorers field `:95-102`.

**Players** (`players/actions.ts`)
- `readPlayer` `:21-50`: `apps` / `goals` / `assists` are required ints 0..PG_INT_MAX (`:36,45-47`); slug defaults to `no-<number>`.
- `resolveImage` / `removeImage` handle photos. `updateTag(TAGS.players)` at `:80,111,126`.
- Form inputs for the stats: `PlayerForm.tsx:55-57`. Admin list shows apps/goals/assists (`page.tsx:90-92`).

**Standings** (`standings/actions.ts:18-31`)
- Counts 0..9999; `played` and `points` are DB-generated. `updateTag(TAGS.standings)`.

**Roles**
- `src/lib/admin/roles.ts`: `FULL_ADMIN_ROLES = [owner, admin]` (`:22`), `STAFF_ROLES` includes media, `OWNER_ROLES`.
- `src/lib/admin/auth.ts`: `requireAdminPage(roles=FULL_ADMIN_ROLES)` `:39`, `requireAdminAction` `:47`. Both resolve the role through the `my_admin_profile()` RPC.
- `src/config/admin-nav.ts:26-32`: matches, players and standings carry no `roles`, so they are owner/admin only. Media sees only news and postings. Owner additionally gets accounts.
- **Template for the Namuwiki markup page:** `/admin/instagram` (nav `:16`).
  - `page.tsx` reads the state row plus a log with the session client.
  - `actions.ts:12-21` allows only the "확인함" status flip.
  - Labels live in `src/lib/admin/instagram.ts`.
  - Dashboard alerts: `src/lib/admin/alerts.ts:201-224` `instagramAlerts`, wired at `app/admin/(panel)/page.tsx:76-77,96`.
- Validation tools: `src/lib/admin/form.ts`, i.e. `FormReader` (`text`, `optText`, `int`, `choice`, `optHttpsUrl`, …), `dbErrorMessage`, `submittedValues`, `kstToIso` / `isoToKst`. Admin UI uses `components/admin/AdminForm` (`useActionState`).

## 4. Automation template: supabase/functions/instagram-sync

**Schedule**
- `20261023110000_instagram_sync_cron.sql:5-22`: `pg_net` + `pg_cron`.
- `cron.schedule('instagram-sync', '*/15 * * * *', net.http_post(url hardcoded https://vunnzagbsrujdernvetl.supabase.co/functions/v1/instagram-sync, header x-sync-secret = vault secret, timeout 120s))`.
- `config.toml:418-419`: `verify_jwt = false`.
- Stop and start notes: `docs/SUPABASE_SETUP.md:80-86`.

**Authentication**
- Migration `20261023100000_instagram_sync.sql:47-63`: `vault.create_secret(random 32 bytes, 'instagram_sync_secret')` is generated inside the DB.
- `instagram_sync_secret_ok(p_secret)` is security definer and executable only by `service_role`.
- `index.ts:29-30` reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (injected by Supabase).
- `:272-278`: POST only, `createClient(service key)`, RPC check returns 401 on failure.
- D-065 (`DECISION_LOG.md:163`) and `SECURITY_GUIDELINES.md:12-13`: the service key exists only inside the Edge Function, never in the app or Vercel.

**State and lock**
- `instagram_sync_state` is a single row `id=1` (`sync.sql:21-29`): `running_since`, `last_run_at`, `last_ok_at`, `last_error <=500`, `last_processed`, plus `last_warning` (`20261023120000:2`).
- Claim (`index.ts:281-289`): update `running_since` where null or older than 5 minutes (`STALE_MS`).
- Success and failure update (`:291-303`).

**Per-item log**
- `instagram_posts` (`sync.sql:5-18`): `code` PK, `kind`, `status in (done, review, reviewed, error)`, `actions` / `note` <=2000, `attempts`. Retries happen while status is error and `attempts < MAX_ATTEMPTS = 3` (`index.ts:33,221-227`).
- RLS (`:31-45`): owner/admin can select, and can update only review/error to reviewed. Column grants are `update(status, updated_at)` only. anon has no access.

**Plan/apply split**
- `embed.ts` (fetch output parsing: `parseProfileEmbed` `:30`, `classifyPost` `:51`, `parseResult` `:114`) and `plan.ts` are pure, use only type imports, and use relative `.ts` imports.
- `plan.ts` exports `planMatchday` `:337`, `planResult` `:376` (fills only `scheduled` matches within 7 days; if already finished it compares scores and adds a note) and `scorersText` `:361`, plus constants `LEAGUE_COMPETITION` `:9` and `seasonOf` `:97`.
- `korean.ts` provides `josa` and `nameSlug` `:47`.
- `index.ts` does the I/O: `apply()` `:111-198` and `sync()` `:205-270`, with an idempotency check before each insert. Notes become status `review`; exceptions become `error`. The function imports `npm:@supabase/supabase-js@2.117.3`.

**Tests**
- `tests/instagram-sync.test.ts` and `tests/instagram-embed.test.ts` import the function modules directly under `node --experimental-strip-types --test` (`package.json` `test` script).
- `:34` asserts `LEAGUE_COMPETITION === LEAGUE.currentCompetition`. `planResult` test at `:236`.
- Rules for test targets (`TESTING_GUIDELINES.md:14`): pure modules only, relative import with `.ts`, `import type` only.
- Manual scripts reuse the pure modules: `scripts/instagram/check.ts` (read-only) and `upload.ts` (admin login, never the service key).

**Interaction risk**
- Instagram `planResult` also writes `matches.status/score/scorers` (`index.ts:178-187`). A federation sync becomes a second writer, so precedence needs a rule.
- If federation data lands first, instagram only adds a mismatch note. If instagram lands first, federation must decide whether to overwrite.

## 5. Existing per-match and per-round computation

- No per-player-per-match appearances, no per-round table, and no standings computed from matches anywhere. Standings are entered by hand.
- Per-match only:
  - `getSeasonResults` (`repo.ts:123`) filters finished matches by season year.
  - `homeMatchItems` (`lib/match.ts:25`).
  - `matchResult` / `matchSides` (`lib/format.ts:42,50`).
  - `pastLeagues` (`lib/standings.ts:53`) computes our final rank per past season.
  - Figma feed `/api/figma/feed` (`src/app/api/figma/feed/route.ts:10-42`): own `'use cache'` + `cacheLife` (no tag) and `Cache-Control 60s`, CORS `*` (exception D-066). `buildFigmaFeed` (`src/lib/figma-feed.ts:252`) emits `nextMatch` and `lastResult` (`toFeedResult` `:138`, includes `scorers`).

## 6. Constraints on the design

**Approval required** (`DEVELOPMENT_RULES.md:49-56`): any new integration that sends data out, production DB migrations, deployment, and secrets.

**Federation source**
- futsal.or.kr is HTTP-only and unstable (`PROJECT_CONTEXT.md:76`, D-010 at `DECISION_LOG.md:565-571`).
- D-010 rejected live crawling because of I-013 (`KNOWN_ISSUES.md:345`). The owner's new decision reverses this, so a new D-entry should record it.

**Security** (`SECURITY_GUIDELINES.md:12-13`): no service_role in app code or Vercel. The only exception is inside an Edge Function, and calls must be verified with a Vault secret header. Every server action starts with `requireAdminAction()`. Re-read current values from the DB.

**Dependencies** (`DEPENDENCY_POLICY.md`)
- No new runtime dependency without approval (`:18`).
- Parsing may justify a vetted library, but it still needs approval (`:13`).
- next, react and @supabase are pinned (`:25`).
- An HTML parser for the record sheets would need owner approval, or a hand-written regex/DOM-free parser in the style of `embed.ts`.

**Tests** (`TESTING_GUIDELINES.md:14,16`)
- New pure logic (sheet parser, aggregation, Namuwiki markup builder) needs `tests/*.test.ts`.
- Done means lint, test, build in static mode, build in DB mode, and `supabase/tests/rls-check.mjs` (which covers players/matches/standings writes at `:15`).

**UI and design rules**
- Colors and spacing only through `var(--token)`; hex only in `src/styles/tokens.css` (`CODING_STANDARDS.md:67`).
- No middle dot "·" in any UI or generated text; use "/" (BR-024, `DOMAIN_KNOWLEDGE.md:78`). `plan.ts` `siteCaption` is the precedent; Namuwiki output shown on the site must follow it too.
- Federation-derived screens must show "자료: 한국풋살연맹" only when `isLiveData()` (BR-008, BR-013).
- New public UI sections go through Figma proposal, owner choice, then code (process in `docs/FIGMA_SYNC.md`, D-069 `DECISION_LOG.md:131`, the I-056 item 3 pattern). Examples: a round-by-round table, a player match log.
- Admin screens were left out of the redesign (D-069), so an admin markup page can follow existing admin components.
- The repo-root `/home/user/wavely/CLAUDE.md` design rules (wavely tokens) target the wavely app. The site's own `CLAUDE.md` only points to `AGENTS.md`.

**Season switch**
- `LEAGUE.statsSeason` is a code constant (I-018 `:307`). Moving to 2026-27 requires a redeploy.
- Because `players.apps/goals` have no season dimension, switching would discard or overwrite the 2025-26 totals. A per-match appearances/goals table keyed by player id is needed to keep both seasons and to support round-by-round records.
- Open issue I-056 (`KNOWN_ISSUES.md:30-37`): 원해연 and 이준형 show 0 for 2025-26, new players show "0경기 / 0골", and captaincy marks are missing. It explicitly says this can be fixed together with result-sheet records.

**Same-name players and player matching**
- Matching must use number plus name, never name alone. Inactive players (`is_active=false`) still have history, so matching should read all rows (as the instagram roster read at `index.ts:230` does), not `dbSource.players()`.
- Pages that pre-render slugs and seasons through `generateStaticParams`: `players/[slug]/page.tsx:17-19` and `standings/[season]/page.tsx:16-21`.
