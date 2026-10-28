import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { parseDocument } from "@/lib/content/document";
import styles from "./DocumentBody.module.css";

/** 관리자가 쓴 긴 문서 — '## 소제목', '- 목록', 빈 줄 문단 (lib/content/document.ts). 글 속 주소는 링크 (BR-017) */
export function DocumentBody({ text }: { text: string }) {
  return (
    <div className={styles.doc}>
      {parseDocument(text).map((b, i) =>
        b.kind === "heading" ? (
          <h2 key={i} className={styles.heading}>
            {b.text}
          </h2>
        ) : b.kind === "list" ? (
          <ul key={i} className={styles.list}>
            {b.items.map((item, j) => (
              <li key={j}>
                <LinkifiedText text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <LinkifiedText text={b.text} />
          </p>
        ),
      )}
    </div>
  );
}
