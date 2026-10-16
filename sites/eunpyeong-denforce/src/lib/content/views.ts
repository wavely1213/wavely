// 홈페이지 내용 → 화면 조각별 값 묶음 (D-046). 클라이언트 컴포넌트에는 필요한 값만 넘긴다.
import type { SiteContent } from "./fields";

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
