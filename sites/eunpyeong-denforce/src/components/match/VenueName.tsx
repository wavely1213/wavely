import { Fragment } from "react";
import { venueNameSegments } from "@/lib/match";

/** 경기장 이름 글자 — 끝말(체육관, 경기장, 트레이닝센터 등) 앞에 줄바꿈 후보(<wbr>)를 둔다. 칸이 넉넉하면 한 줄 그대로 */
export function VenueName({ name, className }: { name: string; className?: string }) {
  return (
    <span className={className}>
      {venueNameSegments(name).map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
