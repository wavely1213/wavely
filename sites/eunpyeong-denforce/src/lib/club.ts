import type { ClubSettings } from "@/types";

export type SnsName = "Instagram" | "YouTube";
export type SnsLink = { label: SnsName; href: string };

/** 값이 있는 SNS 링크만 (관리자 › 구단정보의 인스타그램·유튜브 주소) */
export function snsLinks(settings: ClubSettings): SnsLink[] {
  const all: Array<{ label: SnsName; href: string | null }> = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "YouTube", href: settings.youtubeUrl },
  ];
  return all.filter((s): s is SnsLink => Boolean(s.href));
}

export type InfoLine = { label: string | null; text: string };

/**
 * 오시는 길 '대중교통'/'주차' 글을 한 줄씩 — 줄바꿈이나 ' / '로 나눈다.
 * 줄 앞 '지하철: …'처럼 짧은 이름(12자 이하) 뒤에 ':'가 오면 그 이름을 따로 돌려준다 (화면에서 굵게). 순수 함수 (테스트: club.test.ts)
 */
export function infoLines(text: string): InfoLine[] {
  return text
    .split(/\r?\n|\s\/\s/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^([^:]{1,12}):\s*(.+)$/.exec(line);
      return m ? { label: m[1].trim(), text: m[2].trim() } : { label: null, text: line };
    });
}
