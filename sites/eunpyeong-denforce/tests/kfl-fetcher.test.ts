// 연맹 요청 예산 (D-082, 명세 2.5)
import assert from "node:assert/strict";
import { test } from "node:test";
import { BudgetExhausted, Fetcher, GAP_MS, KflRequestError, MAX_PER_DAY, MAX_PER_RUN, pauseUntil, schedulePath, seoulDay, sheetPath } from "../supabase/functions/kfl-sync/fetcher.ts";

function fake(responses: Array<() => Response>, start = 1_000_000) {
  let t = start;
  const calls: Array<{ url: string; at: number; init: RequestInit }> = [];
  const f = new Fetcher({
    fetch: async (url, init) => {
      calls.push({ url, at: t, init });
      const r = responses.shift();
      if (!r) throw new Error("no more");
      return r();
    },
    now: () => t,
    sleep: async (ms) => {
      t += ms;
    },
    dayCount: 0,
    startedAt: start,
  });
  return { f, calls, advance: (ms: number) => (t += ms) };
}
const ok = (text = "<html></html>") => () => new Response(text, { status: 200, headers: { "content-type": "text/html;charset=UTF-8" } });

test("GET: HTTP 호스트, 사이트를 밝힌 UA, 리다이렉트 따라가지 않음, 요청 사이 1.5초", async () => {
  const { f, calls } = fake([ok("a"), ok("b")]);
  assert.equal(await f.get("/x"), "a");
  assert.equal(await f.get("/y"), "b");
  assert.equal(calls[0].url, "http://www.futsal.or.kr/x");
  assert.equal((calls[0].init.headers as Record<string, string>)["User-Agent"], "eunpyeong-fs.com record sync (+https://eunpyeong-fs.com/contact)");
  assert.equal(calls[0].init.redirect, "manual");
  assert.ok(calls[1].at - calls[0].at >= GAP_MS);
  assert.equal(f.anyOk, true);
});

test("예산: 실행당 8건, 하루 60건, 90초", async () => {
  const { f } = fake(Array.from({ length: 20 }, () => ok()));
  for (let i = 0; i < MAX_PER_RUN; i++) await f.get("/x");
  await assert.rejects(f.get("/x"), BudgetExhausted);
  const day = new Fetcher({ fetch: async () => ok()(), now: () => 0, sleep: async () => {}, dayCount: MAX_PER_DAY, startedAt: 0 });
  assert.equal(day.canRequest(), false);
  const late = fake([ok()]);
  late.advance(91_000);
  assert.equal(late.f.canRequest(), false);
});

test("실패: 200 아님 / 네트워크 / UTF-8 아님", async () => {
  await assert.rejects(fake([() => new Response("", { status: 403 })]).f.get("/x"), (e: unknown) => e instanceof KflRequestError && e.status === 403);
  await assert.rejects(fake([() => { throw new Error("reset"); }]).f.get("/x"), (e: unknown) => e instanceof KflRequestError && e.status === null);
  await assert.rejects(fake([() => new Response("x", { status: 200, headers: { "content-type": "text/html;charset=EUC-KR" } })]).f.get("/x"), /UTF-8/);
});

test("주소는 파싱한 값으로만 (club id 모양, 숫자)", () => {
  assert.equal(schedulePath(116, 10, 2), "/game_leagueTab03.action?league_seq=116&league_type=10&divisionPage=mainPage&pageNum=2");
  assert.equal(sheetPath("FSSeoul", "eunpyeongfs", 116, 10, 1), "/gameLeagueRecord.action?club1_id=FSSeoul&club2_id=eunpyeongfs&league_seq=116&league_type=10&game_number=1");
  assert.throws(() => sheetPath("a&b=c", "x1", 116, 10, 1));
  assert.throws(() => schedulePath(116, 10, 0));
});

test("멈춤: 1h × 2^(n-1), 24시간 상한 / 서울 날짜", () => {
  assert.equal(pauseUntil(1, 0), new Date(3_600_000).toISOString());
  assert.equal(pauseUntil(3, 0), new Date(4 * 3_600_000).toISOString());
  assert.equal(pauseUntil(9, 0), new Date(24 * 3_600_000).toISOString());
  assert.equal(seoulDay(Date.parse("2026-11-15T15:30:00Z")), "2026-11-16");
});

test("본문 읽기 중 끊김/시간 초과도 요청 실패, 간격은 앞 요청이 끝난 때부터", async () => {
  const broken = () => {
    const body = new ReadableStream({ start(c) { c.error(new Error("timed out")); } });
    return new Response(body, { status: 200, headers: { "content-type": "text/html;charset=UTF-8" } });
  };
  await assert.rejects(fake([broken]).f.get("/x"), (e: unknown) => e instanceof KflRequestError && /timed out/.test((e as Error).message));
  // 느린 응답(5초) 뒤에도 다음 요청까지 1.5초를 더 기다린다
  let t = 0;
  const at: number[] = [];
  const f = new Fetcher({
    fetch: async () => {
      at.push(t);
      t += 5000;
      return new Response("x", { status: 200, headers: { "content-type": "text/html;charset=UTF-8" } });
    },
    now: () => t,
    sleep: async (ms) => {
      t += ms;
    },
    dayCount: 0,
    startedAt: 0,
  });
  await f.get("/a");
  await f.get("/b");
  assert.ok(at[1] - (at[0] + 5000) >= GAP_MS);
});
