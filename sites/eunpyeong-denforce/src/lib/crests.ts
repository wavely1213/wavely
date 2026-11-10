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

/** 엠블럼 그림 (경로 + 원본 픽셀 크기). 못 구한 팀, 모르는 팀은 null */
export function crestImageFor(name: string, list: TeamCrestEntry[] = TEAM_CRESTS): { src: string; width: number; height: number } | null {
  const e = crestEntryFor(name, list);
  if (!e?.file || !e.pixels) return null;
  return { src: e.file, width: e.pixels[0], height: e.pixels[1] };
}
