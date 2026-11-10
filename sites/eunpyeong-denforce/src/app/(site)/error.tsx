"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import styles from "./error.module.css";

/**
 * 공개 페이지 오류 (디자인 UX 상태 표 208:21444 / 208:21509, 총괄 기본값) — 머리/바닥(공개 레이아웃)은 그대로,
 * 본문 자리에 bg-soft 상자 + [다시 시도](같은 주소 다시 그리기) + [메인으로]. 불러오는 중 화면(loading.tsx)은 두지 않는다.
 * 없는 주소/글은 not-found 가 맡는다(notFound() 는 여기로 오지 않음).
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={`container ${styles.wrap}`}>
      <Placeholder label="정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.">
        <div className={styles.actions}>
          <button type="button" className={buttonClass("primary")} onClick={() => reset()}>
            다시 시도 <span aria-hidden="true">→</span>
          </button>
          <Link href="/" className={buttonClass("secondary")}>
            메인으로
          </Link>
        </div>
      </Placeholder>
    </div>
  );
}
