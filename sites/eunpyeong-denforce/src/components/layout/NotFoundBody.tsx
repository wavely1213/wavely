import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import styles from "./NotFoundBody.module.css";

/**
 * '페이지를 찾을 수 없습니다' 본문 (리디자인 3차 158:19785 / 158:19896) — 큰 404 + 제목 + 안내 + 버튼.
 * back: 사이트 안 없는 글이면 그 목록으로 가는 버튼('구단소식 목록')을 [메인으로] 앞에 둔다.
 * 루트 not-found(헤더/푸터를 직접 붙임)와 (site)/not-found(레이아웃 헤더 안), 구단소식 글 not-found 가 같이 쓴다.
 */
export function NotFoundBody({ back }: { back?: { href: string; label: string } }) {
  return (
    <div className={`container ${styles.wrap}`}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>페이지를 찾을 수 없습니다</h1>
      <p className={styles.desc}>주소가 바뀌었거나 아직 준비 중인 페이지입니다.</p>
      <div className={styles.actions}>
        {back && (
          <Link href={back.href} className={buttonClass("secondary")}>
            {back.label}
          </Link>
        )}
        <Link href="/" className={buttonClass("primary")}>
          메인으로
        </Link>
      </div>
    </div>
  );
}
