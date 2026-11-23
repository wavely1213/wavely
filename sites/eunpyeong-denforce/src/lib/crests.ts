// 상대팀 이름 → 엠블럼 파일. 띄어쓰기와 영문 대소문자는 무시하고 별칭(예전 이름)도 찾는다.
import { TEAM_CRESTS, type TeamCrestEntry } from "../config/team-crests.ts";

const key = (name: string) => name.replace(/\s+/g, "").toLowerCase();

/** 이름(또는 별칭)이 같은 항목. 없으면 null */
export function crestEntryFor(name: string, list: TeamCrestEntry[] = TEAM_CRESTS): TeamCrestEntry | null {
  const k = key(name);
  if (!k) return null;
  return list.find((e) => [e.name, ...e.aliases].some((n) => key(n) === k)) ?? null;
}

/** 엠블럼 파일 경로(public 기준). 못 구한 팀, 모르는 팀은 null */
export function crestFor(name: string, list: TeamCrestEntry[] = TEAM_CRESTS): string | null {
  return crestEntryFor(name, list)?.file ?? null;
}

/** 엠블럼 그림 (경로 + 원본 픽셀 크기). 못 구한 팀, 모르는 팀은 null.
 * surface: 놓인 면 — 흰 면이고 흰 면용 파일(fileOnLight)이 있으면 그것을 쓴다 (인천ZD 흰 글씨 로고) */
export function crestImageFor(
  name: string,
  surface: "dark" | "light" = "dark",
  list: TeamCrestEntry[] = TEAM_CRESTS,
): { src: string; width: number; height: number } | null {
  const e = crestEntryFor(name, list);
  if (!e?.file || !e.pixels) return null;
  const src = surface === "light" && e.fileOnLight ? e.fileOnLight : e.file;
  return { src, width: e.pixels[0], height: e.pixels[1] };
}

/**
 * 코드 목록(기본값) + 관리자가 올린 DB 줄 (D-094). DB 줄은 이름이나 별칭이 겹치는 코드 항목을 덮는다:
 * 값이 있는 칸만 덮고(파일을 비운 DB 줄이면 코드 파일 그대로), 별칭은 합친다. 겹치는 항목이 없으면 새 팀으로 붙인다.
 */
export function mergeCrests(code: TeamCrestEntry[], db: TeamCrestEntry[]): TeamCrestEntry[] {
  const out = code.map((e) => ({ ...e, aliases: [...e.aliases] }));
  for (const d of db) {
    const names = new Set([d.name, ...d.aliases].map(key));
    const i = out.findIndex((e) => [e.name, ...e.aliases].some((n) => names.has(key(n))));
    if (i < 0) {
      out.push({ ...d, aliases: [...d.aliases] });
      continue;
    }
    const base = out[i];
    const hasFile = Boolean(d.file && d.pixels);
    out[i] = {
      ...base,
      name: d.name,
      aliases: [...new Set([...base.aliases, ...d.aliases, ...(base.name !== d.name ? [base.name] : [])])],
      file: hasFile ? d.file : base.file,
      pixels: hasFile ? d.pixels : base.pixels,
      ...(d.fileOnLight ? { fileOnLight: d.fileOnLight } : hasFile ? { fileOnLight: undefined } : {}),
      source: d.source ?? base.source,
      fetchedAt: d.fetchedAt ?? base.fetchedAt,
      note: d.note || base.note,
    };
  }
  return out;
}
