import Link from "next/link";
import { Fragment } from "react";
import { SITE } from "@/config/site";
import { linkify, ownSiteLink } from "@/lib/linkify";

/**
 * 관리자가 입력한 일반 텍스트 속 주소를 링크로 보여준다 — 바깥 주소는 새 창 (BR-017),
 * 우리 홈페이지 주소(eunpyeong-fs.com)는 같은 창 + 긴 주소 대신 짧은 이름 ('선수 소개 보기' 등)
 */
export function LinkifiedText({ text }: { text: string }) {
  return linkify(text).map((p, i) => {
    if (p.type === "text") return <Fragment key={i}>{p.value}</Fragment>;
    const own = ownSiteLink(p.href, p.value, SITE.url);
    return own ? (
      <Link key={i} href={own.path}>
        {own.label}
      </Link>
    ) : (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
        {p.value}
      </a>
    );
  });
}
