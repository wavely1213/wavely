import Link from "next/link";
import styles from "@/styles/prose.module.css";

/** '페이지를 찾을 수 없습니다' 본문 — 루트 not-found(헤더·푸터를 직접 붙임)와 (site)/not-found(레이아웃 헤더 안)가 같이 쓴다 */
export function NotFoundBody() {
  return (
    <div className={`container ${styles.center}`}>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소가 바뀌었거나 아직 준비 중인 페이지입니다.</p>
      <Link href="/" className={styles.button}>
        메인으로
      </Link>
    </div>
  );
}
