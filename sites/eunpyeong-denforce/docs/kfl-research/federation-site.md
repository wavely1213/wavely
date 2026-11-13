> 2026-11-13 총괄 세션 조사 기록. 본문의 `/tmp/.../scratchpad/...` 경로는 총괄 세션 임시 폴더라 저장소와 다른 세션에는 없다(연맹 HTML 은 C1 에서 다시 받는다).

# futsal.or.kr match data map (for automatic 결과기록지 collection)

I made 47 HTTP requests in total (log: `/tmp/claude-0/-home-user-wavely/4c312638-5039-5b2f-a13d-6481ae7ad681/scratchpad/kfl/requests.log`). They went to `http://www.futsal.or.kr` only, at least 1.2 s apart, with a Chrome User-Agent and Referer `http://www.futsal.or.kr/`. I sent no cookies and logged in nowhere, and none of these pages needed it.

**Encoding:** every page came back as `content-type: text/html;charset=UTF-8` with a UTF-8 meta tag. **Nothing was EUC-KR.** Watch for a few oddities:
- Names inside cells can carry trailing `\n` and spaces.
- Some board titles contain U+FEFF.

## 1. robots.txt
`GET /robots.txt` returns **404**. The body is the site's normal HTML error page ("해당 페이지를 찾을수 없습니다"), so there is no robots policy. Sample: `samples/robots.txt` and `robots.hdr`.

## 2. Finding the current league, the schedule and our matches

**League list:** `GET /mng_GameList.action` (newest first, paged with POST `mng_GameList.action?pageNum=N`, year filter with form field `searchValue=2026`).
- Each row looks like `<a onclick="javascript:league_read('116');">키움증권 2026-27 FK 리그(FK1)</a>`.
- Parse with the regex `league_read\('(\d+)'\)[^>]*>([^<]+)<`.
- Pick the row whose name contains `2026-27` and `(FK1)`.
- The name format drifts between seasons: the sponsor prefix changes (flex → 키움증권) and the spacing varies ("FK 리그" vs "FK리그"). Match on `\d{4}-\d{2}` plus `\(FK1\)` only.

**Known league_seq values:**

| league_seq | League | Status |
|---|---|---|
| **116** | **2026-27 FK1** | "준비중"; season 2026-11-14 ~ 2027-04-03 |
| 117 | 2026-27 FK2 | |
| 108 | 2025-26 FK1 | |
| 109 | 2025-26 FK2 | |
| 112 | 2025-26 플레이오프 | |

**League page:** `GET /mng_gameLeagueRead.action?league_seq=116`. It is a shell; its dhtmlx tab loads by AJAX `game_enterteamlist.action?league_seq=116&league_type=10&league_gubun=1` (참가팀). The tabs:
- `game_leagueTab03.action?...` is **경기상세일정 (schedule + results)**.
- `game_leagueTab04` (조편성) is empty: "편성된 내역이 없습니다".
- `game_leagueTab05` (경기결과) is an empty table and is not used.

**Schedule + results:** `GET /game_leagueTab03.action?league_seq=116&league_type=10&divisionPage=mainPage&pageNum=1..5`
- 10 rows per page, ordered by kickoff date. Paging link: `gameLeaguePlanListPaging('tab','N')`.
- Selector: `div.tabScroll > table.table_type3 > tr`. The columns are:
  - `td[0]` 경기번호
  - `td[1]` "YYYY-MM-DD HH:MM" in KST
  - `td[2]` an inner table with home / "vs" / away
  - `td[3]` venue
  - `td[4] a` with `href="javascript:getrecord('<club1_id>','<club2_id>','<league_seq>','<league_type>','<game_number>')"`
- The anchor text is **"2 : 5" once the result is entered, and blank/whitespace before**.

Trimmed row from the 2025-26 list:
```html
<tr><td>1 </td><td>2025-11-15 15:00</td>
 <td><table ...><tr><td ...>서울은평덴포스</td><td ...>vs</td><td ...>강원FS</td></tr></table></td>
 <td>서울은평 다목적체육관</td>
 <td class="red"><a href="javascript:getrecord('eunpyeongfs','gwFSclub','108','10','1')" class="red"> 2 : 5 </a></td></tr>
```

**One-request alternative:** `POST /main_selectMainLeaguePlan.action` with body `league_seq=116&league_type=10` returns all 45 games at once, with the same `getrecord(...)` links.
- It has the date only (no time or venue).
- **Unplayed games show "0 : 0" there**, so don't use it to decide whether a match is finished.
- `<tr id="1">` means the date hasn't passed and `id="0"` means it has; that is only the widget's scroll anchor.

**How to spot our matches:** the stable club id is **`eunpyeongfs`** (the same in 108 and 116). The display name is `서울은평덴포스` with no space.
- `club1_id` is the **home** team and `club2_id` is **away**.
- The other 2026-27 ids: `fsseoul` 노원제너FS, `gwFSclub` 강원FS, `GoyangBulls` 고양불스풋살클럽, `hwaseongFS` 화성FS, `yongintmt` 용인지솔FS.
- Our docs call that last club "용인대흥FS"; the federation now names it **용인지솔FS**.

**Match id:** the tuple (`league_seq`, `league_type=10`, `game_number`). The club ids are also required to fetch the sheet (see section 3).

**Rounds are not shown anywhere on the site.**
- For 116, round = ceil(game_number / 3). I checked all 15 blocks of three games: each one contains all 6 teams.
- That does **not** hold for 2025-26 (blocks 1, 2, 3 and 6 break it; game 18 was a postponed round-3 game).
- So: compute the round, validate it (each block = 6 distinct teams), and allow an admin override.
- A postponed game keeps its number: game 9 (R3) is listed on 12-26, after R6.

**Our 2026-27 FK1 schedule (already published, 45 games, 6 teams, triple round-robin):**

| R | Game # | Date | H/A | Opponent | Venue |
|---|---|---|---|---|---|
| 1 | 1 | 11-15 14:00 | A | 노원 | 파주NFC |
| 2 | 5 | 11-21 14:00 | H | 용인 | 파주NFC |
| 3 | 9 | 12-26 14:00 | H | 고양 | 은평다목적 |
| 4 | 10 | 12-05 14:00 | H | 화성 | 은평 |
| 5 | 13 | 12-12 14:00 | H | 강원 | 은평 |
| 6 | 16 | 12-19 14:00 | H | 노원 | 은평 |
| 7 | 20 | 01-16 14:00 | H | 용인 | 단양 |
| 8 | 24 | 01-17 17:00 | A | 고양 | 단양 |
| 9 | 27 | 02-14 16:00 | A | 화성 | 장안대 |
| 10 | 28 | 02-20 14:00 | A | 강원 | 홍천 |
| 11 | 32 | 02-28 13:00 | A | 노원 | 월계 |
| 12 | 34 | 03-06 18:00 | A | 용인 | 용인실내 |
| 13 | 39 | 03-14 15:30 | A | 고양 | 고양어울림누리 |
| 14 | 42 | 03-21 16:00 | A | 화성 | 장안대 |
| 15 | 43 | 03-27 14:00 | H | 강원 | 은평 |

Full list: `samples/sched_116.tsv`.

## 3. Per-match record sheet (경기기록지)

**URL:** `GET /gameLeagueRecord.action?club1_id=eunpyeongfs&club2_id=gwFSclub&league_seq=108&league_type=10&game_number=1`. This is the `getrecord()` popup.
- It is **HTML text, not an image or PDF**, about 60 KB.
- **If you leave out `club1_id`/`club2_id`, the page still returns the header and score but NO player tables** (tested with `rec108_g43_min.html`). Always pass both ids.

**Fields that exist:**
- **Header** (`td.record_title_bg` label followed by the sibling `td.record_text_bg` value): 대회명, 주최, 장소, 일자 (YYYY-MM-DD), 시간 (HH:MM), 주심, 2주심, 대기심, 계시원, 기록원, 경기감독, 심판감독, 경기번호, 관중수.
- **Score box** (the table containing `span.record_20`):
  - The two `span.record_20` elements are the home and away totals.
  - The rows labelled `td.record_title_bg2` 전반 / 후반 / 연장 / PK have the home value in the left cell and the away value in the right cell.
  - Team names are in the `td.record_text_bg[rowspan=2]` cells.
  - The 지도자 row holds the head coaches.
  - Uniform colours (field and GK) are also there.
- **Two team tables:** `table[width=499]`, the first is home and the second is away.
  - 파울누적: the two `<tr height="20">` rows (1st half, 2nd half). The foul count is the number of non-empty cells; each foul is entered as "0".
  - Player rows have exactly 20 `td`s, and `td[1]` has `colspan=3`.
  - 비고 row: free text in `td.record_title_bg4` "비고" followed by `td[colspan=21]`. It holds timeouts, coach cautions and "홈팀 몰수패".

The player-row columns:

| td | Field | Notes |
|---|---|---|
| 0 | 배번 | jersey number |
| 1 | 이름 | **often blank** (see below) |
| 2 | P | "O" = starting five ("P = Player") |
| 3 | S | "O" = listed substitute ("S = Substition") |
| 4 | 1경고 | minute |
| 5 | 2경고 | minute |
| 6 | 퇴장 | minute |
| 7–19 | 골 1–13 | one minute per goal, cumulative 1–40 (21–40 = 2nd half) |

**Not on the sheet:** assists, MVP, substitution times or minutes played, a GK/position flag per player, shots or saves. Goalkeepers have to come from our own roster positions.

Trimmed excerpt (decoded):
```html
<td class="record_title_bg">장 소</td><td class="record_text_bg">서울은평 다목적체육관</td>
<td class="record_title_bg">일 자</td><td class="record_text_bg">2025-11-15</td> ... 
<td class="record_title_bg">경기번호</td><td class="record_text_bg">1</td><td class="record_title_bg">관중수</td><td class="record_text_bg">127</td>
<tr><td colspan="2" class="record_title_bg3">유니폼</td><td class="record_title_bg3">HOME</td>
 <td rowspan="5" class="record_text_bg2"><span class="record_20">2</span></td>
 <td class="record_text_bg2">1</td><td class="record_title_bg2">전반</td><td class="record_text_bg2">4</td>
 <td rowspan="5" class="record_text_bg2"><span class="record_20">5</span></td> ...
<tr>...<td rowspan="2" class="record_text_bg">서울은평덴포스</td><td class="record_text_bg2">1</td><td class="record_title_bg2">후반</td><td class="record_text_bg2">1</td><td rowspan="2" class="record_text_bg">강원FS</td>...
<!-- home team table (table width=499 #1) -->
<tr height="20"><td class="record_text_bg2">0</td><td class="record_text_bg2">0</td>...<td class="record_text_bg2"></td></tr>  <!-- fouls 1H -->
<tr><td class="record_text_bg2">13</td><td colspan="3" class="record_text_bg2">황정환</td><td class="record_text_bg2">O</td><td class="record_text_bg2"></td>...</tr>
<tr><td class="record_text_bg2">77</td><td colspan="3" class="record_text_bg2"></td><td class="record_text_bg2"></td><td class="record_text_bg2">O</td>
    <td class="record_text_bg2">15</td><td></td><td></td><td class="record_text_bg2">36</td> ...12 more goal cells</tr>
<tr><td class="record_title_bg4">비<br />고</td><td colspan="21" ...>T.O 19분 / 11분 39분 김태승 지도자 경고</td></tr>
```

**Gotchas I checked against all 15 of our 2025-26 sheets:**
- **Own goals are free text in a goal cell of the player who committed them, in his own team's table.** I saw `15(og`, `8(og`, `og(1)` and `og(19`. Match `/og|자책/i`, take the digits as the minute, and count the goal for the opponent.
  - With that rule, "goals + opponent's own goals == total == sum of periods" held for every sheet.
  - The schedule score also equalled the sheet total for every game.
- **Names are blank for many players** (it looks like a privacy setting; the same blanking appears on the federation's ranking pages). Map players by (season, jersey number) to our roster, which also separates 김대현 #6/#18 and 김종호 #22/#30.
  - The names that do appear are a useful cross-check.
  - Jersey numbers changed between seasons (e.g. #11 was 원해연 in 2025-26 and is 부성인 now), so keep the number map per season and allow an admin override.
- **Appearances = listed on the sheet (P or S).** S includes substitutes who may never have come on.
  - The federation counts appearances the same way.
  - My aggregate of the 15 sheets reproduces `supabase/data/2025-26_kfl.sql` exactly: #5 13/0, #7 13/1, #8 9/1, #18 12/1, #21 2/1, #25 7/0, #77 12/10 and so on.
  - It also matches the federation scorer ranking for our players (10 goals in 12 games, 7 in 11, 4 in 8, 3 in 13).
- **The starting five (P) is sometimes missing:** in 2025-26 game 1 the away team had zero P marks.
- **Second yellow card:** both 2경고 and 퇴장 are filled with the same minute (game 25, #5: 14 / 25 / 25).
- **Forfeit** (game 28): no player rows, a 3:0 put on the 전반 row, and 비고 "홈팀 몰수패".
- **Unplayed sheet** (`rec116_g1.html`): totals 0:0, referees blank, and one empty `<td colspan=22>` row instead of players.
- **Rule for "finished":** the tab03 anchor text matches `^\s*\d+\s*:\s*\d+\s*$`, AND (the sheet has at least one player row OR 비고 contains 몰수).

There is a reference parser that handles all of this, with JSON output, ready to port to TypeScript: `/tmp/claude-0/-home-user-wavely/4c312638-5039-5b2f-a13d-6481ae7ad681/scratchpad/kfl/bin/parse_record.py`. Parsed fixtures for our 15 games are in `samples/parsed_108_eunpyeong.jsonl`.

## 4. When results appear, and the state of 2026-27
- **There is no timestamp anywhere.** Responses carry `cache-control: no-Cache` and `expires 1970` with no Last-Modified, and neither the list nor the sheet has a 등록일.
- The NEWS list and the 대회소식 board (`brd_boardLoad.action?board_id=03`) don't post per-round results.
- So the delay between full time and the sheet appearing can't be measured until the first 2026-27 match: FK1 game 1, **2026-11-15 14:00, 노원 vs 은평 at 파주NFC**.
- Suggested polling:
  - Fetch the specific sheet from about kickoff + 2 h, every 2–3 h, until players appear.
  - Then re-fetch once a day for about 7 days to catch corrections. Store a hash of the raw HTML to detect edits.
- **2026-27 rounds already exist:** all 45 games have dates, times and venues, and no results yet.

## 5. Per-player cumulative stats
- `mng_PlayerList.action` (선수별기록; its menu link is commented out) shows only a "준비중" image (`re_wait.jpg`).
- These POST widgets take `league_seq=…&league_type=10`:
  - `main_selectMainLeagueGoal.action`: scorer ranking (순위·이름·팀명·경기·득점·경기당득점, 78 rows for 108). **Names are blank for many players and there are no jersey numbers or ids**, so it is only useful as a checksum.
  - `main_selectMainLeagueFoul.action`: caution ranking.
  - `main_selectMainLeagueRed.action`: sending-off ranking.
  - `main_selectMainLeagueRank.action`: **standings** (순위·팀명·경기수·승점·승·무·패·득점·실점·득실차). These are clean and directly usable.
- `start.action` embeds an all-time FK career ranking (경기/득점), also with names partly blank.
- `leagueJoinPlayerPopRead.action` (the registered squad per league) returns 404 with the parameters I could guess.
- `mng_EunPyeong.action` has the club roster (name, 배번, position) but is still the 2025-26 squad (감독 장성호). Use our own database roster for 2026-27.

**Conclusion:** build player stats by adding up the per-match sheets. The federation has no usable per-player page.

## Open risks
- **Terms of use (I-013):** reuse needs permission. The owner accepted this risk.
- **HTTPS is broken**, so everything has to go over HTTP. The site is old JSP with jQuery and dhtmlx.
  - Markup, ids and sponsor names in league titles can change.
  - The rate limit is unknown.
- **Manual data entry** shows up as:
  - free-text own goals and 비고;
  - missing P marks;
  - corrections made after publication.
- **No round field:** the round must be derived (validated for 116, wrong for 108).
- **Name blanking:** jersey-number mapping depends on our per-season number table being correct, including mid-season number changes.
- **Unplayed games read as 0:0** in the widget and on the sheet, so don't use either for status.
- **Cup and playoff competitions** (`mng_GameCupList.action` and its 'mng_gameCupLeagueRead' detail page, league 112) use other pages that I did not map.
- **Not tested:** extra time and PK minute values (minutes above 40).

## Files
All are in `/tmp/claude-0/-home-user-wavely/4c312638-5039-5b2f-a13d-6481ae7ad681/scratchpad/kfl/samples/`. For each page, `.raw` is the original bytes, `.html` is the decoded copy (identical, since everything was UTF-8) and `.hdr` is the response headers.
- **Lists:** `gamelist`, `league116`, `enter116`, `tab03_116` + `_p2`–`_p5`, `tab03_108` + `_p2`–`_p5`, `tab04_116`, `tab05_108`, `plan116`, `plan108`
- **Sheets:** `rec108_g{1,4,9,10,13,18,21,23,25,28,31,35,37,40,43}` (own goals in 23, 25, 35, 40; forfeit in 28), `rec108_g43_min` (no club ids, so no players), `rec116_g1` (unplayed)
- **Stats:** `goal108`, `rank108`, `foul108`, `red108`, `allres`, `start`, `playerlist`, `eunpyeong`
- **Other pages:** `home`, `board03`, `news`, `joinplayers116` (404), `robots.txt`
- **Parsed:** `sched_108.tsv`, `sched_116.tsv`, `parsed_108_eunpyeong.jsonl`
- **Scripts** in `/tmp/claude-0/-home-user-wavely/4c312638-5039-5b2f-a13d-6481ae7ad681/scratchpad/kfl/bin/`:
  - `f.sh`: the polite fetcher
  - `parse_record.py`: the sheet parser
  - `sched.py`: the schedule parser
  - `dump.py`, `summ.py`: inspection helpers