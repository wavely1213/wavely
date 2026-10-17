import { Fragment } from "react";
import { linkify } from "@/lib/linkify";

/** 관리자가 입력한 일반 텍스트 속 주소를 새 창 링크로 보여준다 (BR-017) */
export function LinkifiedText({ text }: { text: string }) {
  return linkify(text).map((p, i) =>
    p.type === "link" ? (
      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer">
        {p.value}
      </a>
    ) : (
      <Fragment key={i}>{p.value}</Fragment>
    ),
  );
}
