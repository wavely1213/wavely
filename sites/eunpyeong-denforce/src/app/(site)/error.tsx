"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { buttonClass } from "@/components/ui/Button";
import styles from "./error.module.css";

/**
 * 공개 페이지 오류 (디자인 UX 상태 표 208:21444 / 208:21509, 총괄 기본값) — 머리/바닥(공개 레이아웃)은 그대로,
 * 본문 자리에 bg-soft 상자: 제목 h1 + 안내 + [다시 시도 →](retry: 서버에서 다시 받아 그린다, Next 16.3+) + [메인으로].
 * 상자가 그려지면 제목으로 초점을 옮겨 화면 읽기가 오류를 바로 알리고, 다시 시도 뒤에도 초점이 body 로 사라지지 않는다.
 * 불러오는 중 화면(loading.tsx)은 두지 않는다. 없는 주소/글은 not-found 가 맡는다(notFound() 는 여기로 오지 않음).
 */
export default function SiteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  return (
    <div className={`container ${styles.wrap}`}>
      <div className={styles.box}>
        <h1 ref={title} tabIndex={-1} className={styles.title}>
          정보를 불러오지 못했습니다
        </h1>
        <p className={styles.desc}>잠시 후 다시 시도해 주세요.</p>
        <div className={styles.actions}>
          <button type="button" className={buttonClass("primary")} onClick={() => retry()}>
            다시 시도 <span aria-hidden="true">→</span>
          </button>
          <Link href="/" className={buttonClass("secondary")}>
            메인으로
          </Link>
        </div>
      </div>
    </div>
  );
}
