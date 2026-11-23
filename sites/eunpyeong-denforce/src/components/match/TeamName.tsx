import { Fragment } from "react";
import { teamNameSegments } from "@/lib/match";

/** 팀 이름 글자 — 띄어쓰기 없는 긴 이름은 뒷말(풋살클럽, FS 등) 앞에 줄바꿈 후보(<wbr>)를 둔다. 칸이 넉넉하면 한 줄 그대로 */
export function TeamName({ name, className }: { name: string; className?: string }) {
  return (
    <span className={className}>
      {teamNameSegments(name).map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
