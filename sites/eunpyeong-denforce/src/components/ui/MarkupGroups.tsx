import { Fragment } from "react";
import { telHref } from "@/lib/contact";
import type { RenderedGroup, Segment } from "@/lib/content/markup";

// '**이름표** 값' 묶음 한 줄 그리기 (D-048) — 푸터와 관리자 미리보기가 함께 쓴다 (훅 없음: 서버·클라이언트 공용)
// 이메일은 메일 쓰기 링크, 전화번호는 전화 걸기 링크(하이픈에서 줄이 바뀌지 않게).

export type MarkupClasses = { group: string; label: string; nowrap: string };

/** 전화번호 조각 — 번호로 읽히면 전화 걸기 링크, 아니면(내선 안내가 섞인 글 등) 글자만 */
function Phone({ segment, className }: { segment: Segment; className: string }) {
  const href = telHref(segment.text);
  return href ? (
    <a href={href} className={className}>
      {segment.text}
    </a>
  ) : (
    <span className={className}>{segment.text}</span>
  );
}

export function MarkupGroups({ groups, classes }: { groups: RenderedGroup[]; classes: MarkupClasses }) {
  // 묶음은 형제로 둔다 — 푸터 CSS 가 '마지막 묶음이 아니면 오른쪽 여백'(:last-child)으로 간격을 준다
  return groups.map((g, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className={classes.group}>
        {g.label && <span className={classes.label}>{g.label}</span>}
        {g.segments.map((s, j) =>
          s.kind === "email" ? (
            <a key={j} href={`mailto:${s.text}`}>
              {s.text}
            </a>
          ) : s.kind === "phone" ? (
            <Phone key={j} segment={s} className={classes.nowrap} />
          ) : (
            s.text
          ),
        )}
      </span>
    </Fragment>
  ));
}
