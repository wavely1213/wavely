// 홈페이지 내용 → 화면 조각별 값 묶음 (D-046). 클라이언트 컴포넌트에는 필요한 값만 넘긴다.
import type { ClubSettings } from "@/types";
import type { SiteContent } from "./fields";
import { yearOf } from "./values";

/** 헤더 — 구단 이름·영문 이름, 메뉴 맨 오른쪽 바깥 링크 */
export type HeaderContent = { name: string; nameEn: string; externalLabel: string; externalHref: string };

export function headerContent(c: SiteContent): HeaderContent {
  return { name: c["site.name"], nameEn: c["site.nameEn"], externalLabel: c["nav.external.label"], externalHref: c["nav.external.href"] };
}

/** 메인 맨 위 큰 사진·문구 */
export type HeroContent = { image: string; imageAlt: string; eyebrow: string; slogan: string; name: string };

export function heroContent(c: SiteContent): HeroContent {
  return {
    image: c["home.hero.image"],
    imageAlt: c["home.hero.imageAlt"],
    eyebrow: c["home.hero.eyebrow"],
    slogan: c["home.hero.slogan"],
    name: c["site.name"],
  };
}

/** 푸터 글에 넣을 수 있는 값 이름 (D-048) — 설명은 관리자 편집기에 보인다 */
export const FOOTER_TOKENS = [
  { name: "구단이름", desc: "구단 이름" },
  { name: "창단연도", desc: "창단일의 연도" },
  { name: "홈구장", desc: "홈구장 이름" },
  { name: "대표", desc: "대표" },
  { name: "단장", desc: "코칭스태프 명단에서 직책이 '단장'인 사람 — 명단이 바뀌면 따라 바뀜" },
  { name: "사무국주소", desc: "구단정보의 사무국 주소" },
  { name: "문의메일", desc: "구단정보의 문의 이메일 (누르면 메일 쓰기)" },
  { name: "문의전화", desc: "구단정보의 문의 전화" },
] as const;

/** 푸터 값 이름 → 실제 값 (비어 있으면 null — 그 칸은 숨겨진다) */
export function footerTokens(
  c: SiteContent,
  s: Pick<ClubSettings, "contactAddress" | "contactEmail" | "contactPhone">,
  director: string | null,
): Record<string, string | null> {
  return {
    구단이름: c["site.name"],
    창단연도: yearOf(c["site.foundedDate"]),
    홈구장: c["site.homeVenue"],
    대표: c["site.representative"],
    단장: director,
    사무국주소: s.contactAddress,
    문의메일: s.contactEmail,
    문의전화: s.contactPhone,
  };
}
