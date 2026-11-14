import { Fragment } from "react";
import { emphasisParts } from "@/lib/emphasis";

/** 문장 속 **…** 를 굵게(<strong>) 보여준다 */
export function EmphasisText({ text }: { text: string }) {
  return emphasisParts(text).map((p, i) => (p.strong ? <strong key={i}>{p.text}</strong> : <Fragment key={i}>{p.text}</Fragment>));
}
