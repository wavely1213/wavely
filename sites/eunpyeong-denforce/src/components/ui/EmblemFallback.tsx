import Image from "next/image";
import { SITE } from "@/config/site";
import styles from "./EmblemFallback.module.css";

/** 사진이 없을 때 쓰는 옅은 배경 + 엠블럼 워터마크. 부모는 position: relative. */
export function EmblemFallback({ label }: { label?: string | number }) {
  return (
    <div className={styles.box} aria-hidden>
      <Image src={SITE.emblem} alt="" width={48} height={55} className={styles.emblem} />
      {label !== undefined && <span className={styles.label}>{label}</span>}
    </div>
  );
}
