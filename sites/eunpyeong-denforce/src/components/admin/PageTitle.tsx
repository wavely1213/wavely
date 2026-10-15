import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

/** 관리자 페이지 머리: 제목 + 설명 + 오른쪽 버튼 영역, 선택적으로 '목록으로' 링크 */
export function PageTitle({
  title,
  description,
  back,
  children,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className={styles.pageHead}>
      <div>
        {back && (
          <Link href={back.href} className={styles.back}>
            ← {back.label}
          </Link>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDesc}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** 페이지 본문 로딩 자리 (Suspense fallback) */
export function AdminLoading() {
  return <p className={styles.empty}>불러오는 중…</p>;
}
