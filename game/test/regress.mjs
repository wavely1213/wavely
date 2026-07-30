/* 회귀 검사 — 지금까지 실제로 밟았던 함정들만 모아 둔다.
   "동작하는지" 가 아니라 "예전에 깨졌던 방식으로 다시 깨지지 않는지" 를 본다.

   실행: node game/test/regress.mjs [파일경로]
         (경로를 주면 그 HTML을 검사한다 — 리팩터링 전후 대조용)
*/
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";

const TARGET = path.resolve(process.argv[2] || new URL("../index.html", import.meta.url).pathname);
const fails = [];
const ok = [];
const check = (name, cond, detail) => (cond ? ok : fails).push(name + (cond ? "" : " — " + detail));

const browser = await chromium.launch();

/* 스토리 화면을 지나 전투로 들어간다. 출력이 남아 있으면 첫 클릭은 출력을 마칠 뿐이다. */
async function enterPlay(page) {
  await page.click("#btn-start");
  await page.waitForTimeout(200);
  for (let i = 0; i < 4 && await page.evaluate(() => G.screen) === "story"; i++) {
    await page.click("#btn-story-go");
    await page.waitForTimeout(250);
  }
  return page.evaluate(() => G.screen);
}

async function fresh(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 760, height: 1000 }, colorScheme: "dark", ...opts });
  const errs = [];
  page.on("pageerror", e => errs.push("ERR " + e.message));
  page.on("console", m => { if (m.type() === "error") errs.push("CONSOLE " + m.text()); });
  page.errs = errs;
  await page.goto("file://" + TARGET);
  await page.waitForTimeout(500);
  return page;
}

/* ── 1. 부팅 · 진입 ── */
{
  const p = await fresh();
  check("부팅 무오류", p.errs.length === 0, p.errs.join(" | "));
  check("전투 진입", await enterPlay(p) === "play", "screen=" + await p.evaluate(() => G.screen));
  check("진입 후 무오류", p.errs.length === 0, p.errs.join(" | "));
  await p.close();
}

/* ── 2. 손상된 저장 데이터로도 부팅한다 (예전엔 영구 크래시였다) ── */
{
  const p = await browser.newPage();
  await p.goto("file://" + TARGET);
  await p.evaluate(() => localStorage.setItem("wavelength.save.v1", JSON.stringify(
    { eq: { weapon: 99, engine: -3, shield: "x" }, pilot: "없음", frame: "없음", skin: "?", trail: "?", coins: "NaN", owned: "배열아님" })));
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.reload();
  await p.waitForTimeout(500);
  check("손상 저장 복구", errs.length === 0 && await p.evaluate(() => S.eq.weapon >= 1 && S.eq.weapon <= MAXLV && S.pilot === "stray"), errs.join(" | "));
  await p.evaluate(() => localStorage.clear());
  await p.close();
}

/* ── 3. 코어 중복 지급 — endRun 재진입, 사망 700ms 창 ── */
{
  const p = await fresh();
  await enterPlay(p);
  const r = await p.evaluate(() => {
    G.coins = 50;
    const before = S.coins;
    endRun(false); endRun(false); endRun(false);
    return { gained: S.coins - before, inert: $("hud").inert };
  });
  check("endRun 재진입 방어", r.gained === 50, "지급 " + r.gained);
  check("사망 직후 HUD 비활성", r.inert === true, "inert=" + r.inert);
  await p.close();
}

/* ── 4. 정지 중 폭탄 소비 금지 (inert는 입력 경로만 막는다 — 불변식은 코드에 있어야 한다) ── */
{
  const p = await fresh();
  await enterPlay(p);
  const r = await p.evaluate(() => {
    setScreen("pause");
    const b = G.player.bomb;
    useBomb(); useBomb();
    return b + "→" + G.player.bomb;
  });
  check("정지 중 폭탄 불가", r.split("→")[0] === r.split("→")[1], r);
  await p.close();
}

/* ── 5. 히트스톱이 이동 입력을 삼키지 않는다 ── */
{
  const p = await fresh();
  await enterPlay(p);
  const moved = await p.evaluate(async () => {
    G.stop = .4;
    const x0 = G.player.x;
    P.active = false;                       /* 포인터가 잡고 있으면 키를 안 본다 */
    keys.add("arrowleft");
    await new Promise(r => setTimeout(r, 250));
    keys.delete("arrowleft");
    return Math.abs(G.player.x - x0);
  });
  check("히트스톱 중 이동", moved > 5, "이동량 " + moved.toFixed(1));
  await p.close();
}

/* ── 6. 동시 발음 카운터가 드리프트하지 않는다 ── */
{
  const p = await fresh();
  await enterPlay(p);
  const r = await p.evaluate(async () => {
    Snd.init();
    let peak = 0;
    for (let i = 0; i < 200; i++) { Snd.shoot(); peak = Math.max(peak, Snd._ends.length); }
    await new Promise(r => setTimeout(r, 400));
    /* 헤드리스에는 사용자 제스처가 없어 AudioContext가 suspended 로 남는다.
       그러면 currentTime이 흐르지 않아 '빠지는지'는 볼 수 없고, '넘치지 않는지'만 본다. */
    return { peak, state: Snd.ctx.state, drained: Snd.active(Snd.ctx.currentTime + 1) };
  });
  check("발음 상한 유지", r.peak <= 9, "peak=" + r.peak);
  check("발음 카운터 배수", r.drained === 0, "잔여=" + r.drained + " (ctx " + r.state + ")");
  await p.close();
}

/* ── 7. 보스 → 구역 클리어 → 다음 구역 ── */
{
  const p = await fresh();
  await enterPlay(p);
  await p.evaluate(() => { G.enemies.length = 0; G.queue.length = 0; G.wave = WAVES_PER_STAGE; G.phase = "gap"; G.waveT = 1.0; G.player.inv = 1e9; });
  await p.waitForTimeout(900);
  const hadBoss = await p.evaluate(() => !!G.boss);
  await p.evaluate(() => { if (G.boss) killBoss(); });
  await p.waitForTimeout(1400);
  check("보스 등장", hadBoss, "boss 없음");
  check("구역 클리어 화면", ["clear", "story", "play"].includes(await p.evaluate(() => G.screen)), await p.evaluate(() => G.screen));
  check("보스 처리 무오류", p.errs.length === 0, p.errs.join(" | "));
  await p.close();
}

/* ── 8. 격납고 왕복 ── */
{
  const p = await fresh();
  await p.click("#btn-hangar");
  await p.waitForTimeout(300);
  for (const t of ["tab-pilot", "tab-frame", "tab-eq", "tab-cos", "tab-log"]) {
    await p.click("#" + t);
    await p.waitForTimeout(200);
  }
  await p.click("#btn-hangar-back");
  await p.waitForTimeout(300);
  check("격납고 → 타이틀 복귀", await p.evaluate(() => G.screen) === "title", await p.evaluate(() => G.screen));
  check("격납고 무오류", p.errs.length === 0, p.errs.join(" | "));
  await p.close();
}

/* ── 9. 작은 화면에서 출격 버튼이 잘리지 않는다 (390×844 = 가장 흔한 기기) ── */
{
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  await p.goto("file://" + TARGET);
  await p.waitForTimeout(500);
  const cut = await p.evaluate(() => {
    const b = document.getElementById("btn-start").getBoundingClientRect();
    return Math.round(b.bottom - innerHeight);
  });
  check("390×844 출격 버튼 노출", cut <= 0, "아래로 " + cut + "px 잘림");
  await p.close();
}

/* ── 10. CSS 가 통째로 버려지지 않았는지 ──
   떠 있는 중괄호 하나면 브라우저가 뒤따르는 규칙을 조용히 버린다.
   실제로 `.wallet { display:flex }` 이 그렇게 죽어 있었고, 화면은 그냥
   조금 어색해 보일 뿐이라 눈으로는 안 잡혔다. 숫자로 잡는다. */
{
  const css = fs.readFileSync(path.join(path.dirname(TARGET), "src/index.template.html"), "utf8")
    .replace(/[\s\S]*?<style>/, "").replace(/<\/style>[\s\S]*/, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  /* 선택자를 긁으면서 중괄호 균형도 같이 본다.
     깊이가 음수로 내려가면 그 자리가 바로 떠 있는 중괄호다. */
  const want = new Set();
  let depth = 0, buf = "", stray = 0;
  for (const ch of css) {
    if (ch === "{") {
      const sel = buf.trim();
      if (sel && !sel.startsWith("@") && depth <= 1)
        sel.split(",").forEach(t => want.add(t.trim().replace(/\s+/g, " ")));
      depth++; buf = "";
    } else if (ch === "}") {
      if (depth === 0) stray++; else depth--;
      buf = "";
    } else buf += ch;
  }
  check("중괄호 균형", stray === 0 && depth === 0, `떠 있는 } ${stray}개 · 안 닫힌 { ${depth}개`);

  const p = await fresh();
  const have = new Set(await p.evaluate(() => {
    const out = [];
    const walk = rules => { for (const r of rules) {
      if (r.selectorText) r.selectorText.split(",").forEach(t => out.push(t.trim()));
      if (r.cssRules) walk(r.cssRules);
    } };
    for (const s of document.styleSheets) { try { walk(s.cssRules); } catch {} }
    return out;
  }));
  const lost = [...want].filter(s => !have.has(s));
  check("CSS 규칙이 버려지지 않았다", lost.length === 0, "사라진 선택자: " + lost.join(" | "));
  await p.close();
}

/* ── 11. host 지점이 하나도 안 빠졌는지 ──
   한 곳만 빠뜨려도 화면은 멀쩡히 돌면서 기본값(무동작·sans-serif)으로 흘러간다.
   실제로 fontFamily 를 안 꽂아 캔버스 글자가 조용히 다른 서체로 나오고 있었다. */
{
  const p = await fresh();
  const r = await p.evaluate(() => ({ missing: unwired(), font: host.fontFamily, body: getComputedStyle(document.body).fontFamily }));
  check("host 지점이 전부 꽂혀 있다", r.missing.length === 0, "빠짐: " + r.missing.join(", "));
  check("캔버스 서체 = 화면 서체", r.font === r.body, `${r.font} ≠ ${r.body}`);
  await p.close();
}

/* ── 12. 라이트 테마에서도 무오류 ── */
{
  const p = await fresh({ colorScheme: "light" });
  check("라이트 부팅", p.errs.length === 0, p.errs.join(" | "));
  check("라이트 전투 진입", await enterPlay(p) === "play", await p.evaluate(() => G.screen));
  await p.close();
}

await browser.close();

console.log(`\n대상: ${TARGET}`);
for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
