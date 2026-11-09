// 포스터 채우기 규칙 — 순수 함수 (테스트: tests/figma-plugin.test.ts). docs/FIGMA_SYNC.md 약속 B-2, B-3.
// 피그마 API 를 부르지 않는다: code.ts 가 레이어 목록을 넘기면 '어느 레이어에 무엇을' 계획만 돌려준다.
import type { FeedPerson, FigmaFeed } from "../../src/lib/figma-feed.ts";

export type PosterKind = "matchday" | "result" | "welcome" | "goodluck";

/** 05 Posters 템플릿 이름 (앞부분) ↔ 종류 */
export const POSTER_TEMPLATES: ReadonlyArray<{ kind: PosterKind; name: string }> = [
  { kind: "matchday", name: "MATCH DAY" },
  { kind: "result", name: "경기결과" },
  { kind: "welcome", name: "WELCOME" },
  { kind: "goodluck", name: "GOOD LUCK" },
];

/** 포스터 템플릿이 있는 페이지 이름 (앞부분) */
export const POSTER_PAGE = "05 Posters";

/** 이미지로 채우는 필드 — 나머지는 글자 */
export const IMAGE_FIELDS: ReadonlySet<string> = new Set(["clubEmblem", "playerPhoto", "newsImage", "sponsorLogo"]);

/** 같은 이름 레이어가 여러 개면 차례로 채우는 목록 필드 (스폰서) */
const SPONSOR_FIELDS = ["sponsorLogo", "sponsorName", "sponsorTierLabel", "sponsorTier"] as const;

/** 템플릿 이름 → 종류. 'MATCH DAY', 'MATCH DAY 1080x1350', 'MATCH DAY / 1080x1080' 모두 matchday */
export function templateKind(name: string): PosterKind | null {
  const n = name.trim();
  for (const t of POSTER_TEMPLATES) {
    if (n === t.name || n.startsWith(`${t.name} `) || n.startsWith(`${t.name}/`)) return t.kind;
  }
  return null;
}

/** 레이어 이름 → 필드. '#opponent', '#opponent 2' → 'opponent'. '#' 로 시작하지 않으면 null */
export function layerField(name: string): string | null {
  const m = /^#([A-Za-z][A-Za-z0-9]*)/.exec(name.trim());
  return m ? m[1] : null;
}

export type PosterValues = {
  /** 레이어 하나에 하나 */
  single: Record<string, string | null>;
  /** 같은 이름 레이어에 차례로 */
  lists: Record<string, Array<string | null>>;
  /** 복제본 이름 */
  title: string;
};

function stringify(obj: object): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) out[k] = IMAGE_FIELDS.has(k) ? null : "";
    else if (typeof v === "boolean") continue; // isHome/isStaff — 포스터 글자가 아니다 (homeAway 를 쓴다)
    else out[k] = String(v);
  }
  return out;
}

/** 영입/작별 고를 사람 목록 */
export function peopleFor(feed: FigmaFeed, kind: PosterKind): FeedPerson[] {
  if (kind === "welcome") return feed.recentSignings;
  if (kind === "goodluck") return feed.recentFarewells;
  return [];
}

/**
 * 피드 + 포스터 종류 → 채울 값. 데이터가 없으면(다음 경기 없음 등) 이유 글자.
 * index: WELCOME/GOOD LUCK 에서 몇 번째 사람인지 (0 = 가장 최근)
 */
export function posterValues(feed: FigmaFeed, kind: PosterKind, index = 0): PosterValues | { error: string } {
  const lists: Record<string, Array<string | null>> = {};
  for (const f of SPONSOR_FIELDS) lists[f] = feed.sponsors.map((s) => s[f] ?? null);
  const club = stringify(feed.club);

  if (kind === "matchday") {
    const m = feed.nextMatch;
    if (!m) return { error: "예정된 경기가 없습니다 (관리자 › 경기에서 '예정' 경기를 넣어 주세요)" };
    return { single: { ...club, ...stringify(m) }, lists, title: `MATCH DAY ${m.date.slice(0, 10)} ${m.opponent}` };
  }
  if (kind === "result") {
    const r = feed.lastResult;
    if (!r) return { error: "점수가 들어간 끝난 경기가 없습니다" };
    return { single: { ...club, ...stringify(r) }, lists, title: `경기결과 ${r.date.slice(0, 10)} ${r.opponent} ${r.score}` };
  }
  const people = peopleFor(feed, kind);
  const p = people[index];
  if (!p) return { error: kind === "welcome" ? "최근 180일 영입 소식이 없습니다" : "최근 180일 작별 소식이 없습니다" };
  return { single: { ...club, ...stringify(p) }, lists, title: `${kind === "welcome" ? "WELCOME" : "GOOD LUCK"} ${p.playerName}` };
}

export type LayerInfo = { id: string; name: string; kind: "text" | "shape" | "other" };
export type FillStep = { id: string; field: string } & ({ text: string } | { image: string | null });

/**
 * 레이어 목록(문서 순서) → 채우기 계획. 모르는 필드/맞지 않는 레이어 종류는 skipped 로 알려 준다.
 * 이미지 값이 null 이면 그 레이어는 템플릿 그대로 둔다(계획에서 뺀다).
 */
export function planFill(layers: LayerInfo[], values: PosterValues): { steps: FillStep[]; skipped: string[] } {
  const steps: FillStep[] = [];
  const skipped: string[] = [];
  const used: Record<string, number> = {};
  for (const layer of layers) {
    const field = layerField(layer.name);
    if (!field) continue;
    let value: string | null;
    if (field in values.lists) {
      const i = used[field] ?? 0;
      used[field] = i + 1;
      value = values.lists[field][i] ?? (IMAGE_FIELDS.has(field) ? null : "");
    } else if (field in values.single) {
      value = values.single[field];
    } else {
      skipped.push(`${layer.name}: 모르는 필드`);
      continue;
    }
    if (IMAGE_FIELDS.has(field)) {
      if (layer.kind !== "shape") skipped.push(`${layer.name}: 이미지 필드는 도형/프레임 레이어에 두세요`);
      else if (value) steps.push({ id: layer.id, field, image: value });
    } else if (layer.kind !== "text") {
      skipped.push(`${layer.name}: 글자 필드는 텍스트 레이어에 두세요`);
    } else {
      steps.push({ id: layer.id, field, text: value ?? "" });
    }
  }
  return { steps, skipped };
}

/** 이미지 원본 주소 → 플러그인이 받을 주소 (사이트 이미지 중계, manifest 가 eunpyeong-fs.com 만 허용) */
export function imageProxyUrl(src: string, siteUrl = "https://eunpyeong-fs.com"): string {
  return `${siteUrl}/api/figma/image?src=${encodeURIComponent(src)}`;
}
