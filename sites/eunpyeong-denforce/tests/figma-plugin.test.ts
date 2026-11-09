// 피그마 플러그인 순수 함수 + 빌드 최신 여부 (D-066, docs/FIGMA_SYNC.md 약속 B-3, C) — 실행: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { imageProxyUrl, layerField, planFill, posterValues, templateKind, type PosterValues } from "../figma-plugin/src/poster.ts";
import { cssToFigmaColor, figmaColorToCss, sameFigmaValue, tokensToVariableSpecs, variablesToTokens } from "../figma-plugin/src/variables.ts";
import { buildPluginUi, bundlePluginCode, resolvePath } from "../scripts/figma/plugin-bundle.ts";
import { buildTokens, diffTokens } from "../scripts/figma/tokens.ts";
import type { FigmaFeed } from "../src/lib/figma-feed.ts";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const FEED: FigmaFeed = {
  version: 1,
  generatedAt: "2026-11-09T03:00:00.000Z",
  club: { clubName: "서울은평 덴포스", clubNameEn: "SEOUL EUNPYEONG", clubEmblem: "https://eunpyeong-fs.com/brand/emblem.png", clubUrl: "https://eunpyeong-fs.com" },
  nextMatch: {
    matchId: "m1",
    competition: "2026-27 FK1리그",
    round: "3R",
    matchLabel: "2026-27 FK1리그 / 3R",
    opponent: "용인지솔FS",
    isHome: true,
    homeAway: "HOME",
    homeTeam: "서울은평 덴포스",
    awayTeam: "용인지솔FS",
    kickoff: "2026-11-15T15:00:00+09:00",
    date: "2026-11-15 (일)",
    time: "15:00",
    venue: "은평다목적체육관",
  },
  lastResult: null,
  recentSignings: [
    {
      playerName: "김선빈",
      playerNumber: "7",
      position: "ALA",
      positionLabel: "아라",
      playerPhoto: null,
      isStaff: false,
      newsTitle: "서울은평 덴포스, 아라 김선빈 영입",
      newsDate: "2026-10-20",
      newsUrl: "https://eunpyeong-fs.com/news/news/1",
      newsImage: "https://eunpyeong-fs.com/photos/a.jpg",
    },
  ],
  recentFarewells: [],
  sponsors: [
    { sponsorName: "덴포스스포츠", sponsorTier: "naming", sponsorTierLabel: "네이밍 스폰서", sponsorLogo: null },
    { sponsorName: "은평구", sponsorTier: "official", sponsorTierLabel: "메인 스폰서", sponsorLogo: "https://x.supabase.co/storage/v1/object/public/media/s.png" },
  ],
};

test("templateKind: 이름 앞부분으로 템플릿 종류, 비슷한 다른 이름은 아님", () => {
  assert.equal(templateKind("MATCH DAY"), "matchday");
  assert.equal(templateKind("MATCH DAY 1080x1350"), "matchday");
  assert.equal(templateKind("MATCH DAY/1080x1080"), "matchday");
  assert.equal(templateKind("경기결과"), "result");
  assert.equal(templateKind(" WELCOME "), "welcome");
  assert.equal(templateKind("GOOD LUCK / 1080x1080"), "goodluck");
  assert.equal(templateKind("MATCH DAYS"), null);
  assert.equal(templateKind("채움 MATCH DAY 2026-11-15 용인지솔FS"), null);
});

test("layerField: '#필드' 로 시작하는 레이어만", () => {
  assert.equal(layerField("#opponent"), "opponent");
  assert.equal(layerField("#sponsorLogo 2"), "sponsorLogo");
  assert.equal(layerField("opponent"), null);
  assert.equal(layerField("# opponent"), null);
});

test("posterValues: MATCH DAY 는 다음 경기 + 구단, 불리언은 빼고 스폰서는 목록", () => {
  const v = posterValues(FEED, "matchday") as PosterValues;
  assert.equal(v.single.opponent, "용인지솔FS");
  assert.equal(v.single.clubName, "서울은평 덴포스");
  assert.equal(v.single.homeAway, "HOME");
  assert.equal("isHome" in v.single, false);
  assert.deepEqual(v.lists.sponsorName, ["덴포스스포츠", "은평구"]);
  assert.deepEqual(v.lists.sponsorLogo, [null, "https://x.supabase.co/storage/v1/object/public/media/s.png"]);
  assert.equal(v.title, "MATCH DAY 2026-11-15 용인지솔FS");
});

test("posterValues: 데이터가 없으면 이유, WELCOME 은 고른 사람", () => {
  assert.match((posterValues(FEED, "result") as { error: string }).error, /끝난 경기가 없습니다/);
  assert.match((posterValues(FEED, "goodluck") as { error: string }).error, /작별 소식이 없습니다/);
  const w = posterValues(FEED, "welcome", 0) as PosterValues;
  assert.equal(w.single.playerName, "김선빈");
  assert.equal(w.single.playerPhoto, null);
  assert.equal(w.title, "WELCOME 김선빈");
  assert.ok("error" in posterValues(FEED, "welcome", 5));
});

test("planFill: 글자/이미지 레이어를 채우고, 스폰서는 차례로, 맞지 않는 레이어와 모르는 필드는 알려 준다", () => {
  const v = posterValues(FEED, "welcome") as PosterValues;
  const { steps, skipped } = planFill(
    [
      { id: "1", name: "#playerName", kind: "text" },
      { id: "2", name: "#playerNumber", kind: "text" },
      { id: "3", name: "#playerPhoto", kind: "shape" }, // 사진 없음 → 템플릿 그대로
      { id: "4", name: "#newsImage", kind: "shape" },
      { id: "5", name: "#sponsorLogo", kind: "shape" }, // 첫 스폰서 로고 없음 → 그대로
      { id: "6", name: "#sponsorLogo", kind: "shape" },
      { id: "7", name: "#sponsorLogo", kind: "shape" }, // 스폰서보다 많음 → 그대로
      { id: "8", name: "#sponsorName", kind: "text" },
      { id: "9", name: "#unknownThing", kind: "text" },
      { id: "10", name: "#playerName", kind: "shape" },
      { id: "11", name: "#clubEmblem", kind: "text" },
      { id: "12", name: "배경", kind: "shape" },
    ],
    v,
  );
  assert.deepEqual(steps, [
    { id: "1", field: "playerName", text: "김선빈" },
    { id: "2", field: "playerNumber", text: "7" },
    { id: "4", field: "newsImage", image: "https://eunpyeong-fs.com/photos/a.jpg" },
    { id: "6", field: "sponsorLogo", image: "https://x.supabase.co/storage/v1/object/public/media/s.png" },
    { id: "8", field: "sponsorName", text: "덴포스스포츠" },
  ]);
  assert.deepEqual(skipped, [
    "#unknownThing: 모르는 필드",
    "#playerName: 글자 필드는 텍스트 레이어에 두세요",
    "#clubEmblem: 이미지 필드는 도형/프레임 레이어에 두세요",
  ]);
});

test("imageProxyUrl: 사이트 이미지 중계 주소", () => {
  assert.equal(imageProxyUrl("https://x.supabase.co/a b.png"), "https://eunpyeong-fs.com/api/figma/image?src=https%3A%2F%2Fx.supabase.co%2Fa%20b.png");
});

test("variables: 색 0~1 ↔ CSS, 토큰 → 변수 목록 (변수 이름 = 토큰 경로)", () => {
  assert.deepEqual(cssToFigmaColor("#ffffff"), { r: 1, g: 1, b: 1, a: 1 });
  assert.equal(figmaColorToCss({ r: 26 / 255, g: 52 / 255, b: 154 / 255, a: 1 }), "#1a349a");
  assert.equal(figmaColorToCss({ r: 1, g: 1, b: 1, a: 0.6399999856948853 }), "rgba(255, 255, 255, 0.64)");
  const specs = tokensToVariableSpecs(buildTokens(read("src/styles/tokens.css")));
  const gutter = specs.find((s) => s.name === "layout/gutter");
  assert.deepEqual(gutter, { collection: "Layout", name: "layout/gutter", type: "FLOAT", desktop: 20, mobile: 16 });
  assert.deepEqual(specs.find((s) => s.name === "font/family"), { collection: "Font", name: "font/family", type: "STRING", desktop: "KFAGothic TTF" });
  assert.equal(specs.find((s) => s.name === "color/blue")?.collection, "Color");
});

test("variables: 가져오기 → 내보내기 하면 tokens.json 과 차이가 없다 (피그마 소수점 오차 포함)", () => {
  const tokens = buildTokens(read("src/styles/tokens.css"));
  const records = tokensToVariableSpecs(tokens).map((s) => {
    // 피그마는 색을 32비트 실수로 저장한다 — 작은 오차를 흉내 낸다
    const jitter = (v: typeof s.desktop) => (typeof v === "object" ? { ...v, a: v.a === 1 ? 1 : v.a + 0.0000001 } : v);
    // 앞부분을 뺀 변수 이름('blue')도 같은 경로로 읽혀야 한다
    return { collection: s.collection, name: s.name.split("/")[1], type: s.type, desktop: jitter(s.desktop), mobile: jitter(s.mobile ?? s.desktop) };
  });
  records.push({ collection: "Effects", name: "shadow", type: "FLOAT", desktop: 4, mobile: 4 });
  const { tokens: exported, skipped } = variablesToTokens(records);
  assert.deepEqual(skipped, []);
  assert.deepEqual(diffTokens(tokens, exported), []);
  assert.equal(exported.layout?.gutter.$extensions?.mobile, "16px");
  assert.equal(exported.radius?.s.$extensions, undefined);
});

test("variables: 참/거짓 변수와 Font 밖 글자 변수는 건너뛴다", () => {
  const { skipped } = variablesToTokens([
    { collection: "Color", name: "flag", type: "BOOLEAN", desktop: true },
    { collection: "Layout", name: "label", type: "STRING", desktop: "x" },
  ]);
  assert.equal(skipped.length, 2);
});

test("sameFigmaValue: 색은 표기로, 숫자는 작은 오차 무시", () => {
  assert.equal(sameFigmaValue("COLOR", { r: 1, g: 1, b: 1, a: 0.64 }, { r: 1, g: 1, b: 1, a: 0.6400001 }), true);
  assert.equal(sameFigmaValue("FLOAT", 20, 20.001), true);
  assert.equal(sameFigmaValue("FLOAT", 20, 16), false);
  assert.equal(sameFigmaValue("STRING", "a", "a"), true);
});

test("resolvePath: 상대 경로 풀기", () => {
  assert.equal(resolvePath("figma-plugin/src/code.ts", "./poster.ts"), "figma-plugin/src/poster.ts");
  assert.equal(resolvePath("figma-plugin/src/code.ts", "../../scripts/figma/tokens.ts"), "scripts/figma/tokens.ts");
});

test("figma-plugin/dist 가 원본과 같다 (다르면 npm run figma:plugin)", () => {
  assert.equal(read("figma-plugin/dist/code.js"), bundlePluginCode(read));
  assert.equal(read("figma-plugin/dist/ui.html"), buildPluginUi(read));
});

test("manifest: 네트워크는 eunpyeong-fs.com 만, 빌드 결과를 가리킨다", () => {
  const m = JSON.parse(read("figma-plugin/manifest.json"));
  assert.deepEqual(m.networkAccess.allowedDomains, ["https://eunpyeong-fs.com"]);
  assert.equal(m.networkAccess.devAllowedDomains, undefined);
  assert.equal(m.main, "dist/code.js");
  assert.equal(m.ui, "dist/ui.html");
});

test("플러그인 화면/코드에 하드코딩 색 없음 (색은 tokens.css 에서 빌드 때 넣는다)", () => {
  for (const p of ["figma-plugin/ui.html", "figma-plugin/src/code.ts", "figma-plugin/src/poster.ts", "figma-plugin/src/variables.ts"]) {
    assert.equal(/#[0-9a-f]{3,8}\b(?![\w-])|rgba?\(\s*\d/i.test(read(p).replace(/^\s*\/\/.*$/gm, "")), false, p);
  }
});
