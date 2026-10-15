import Link from "next/link";
import styles from "./QuickLinks.module.css";

const LINKS = [
  { href: "/match/schedule", label: "경기일정", desc: "시즌 일정·장소" },
  { href: "/team/players", label: "선수단", desc: "선수·코칭스태프" },
  { href: "/club/location", label: "오시는 길", desc: "은평다목적체육관" },
  { href: "/sponsors", label: "스폰서", desc: "함께하는 파트너" },
  { href: "/contact", label: "문의", desc: "제휴·후원·입단" },
];

export function QuickLinks() {
  return (
    <ul className={styles.list}>
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={styles.item}>
            <span className={styles.text}>
              <strong>{l.label}</strong>
              <span>{l.desc}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
