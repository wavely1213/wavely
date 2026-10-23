"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./FitImage.module.css";

/** 사진 비율 ÷ 칸 비율이 이 범위면 칸을 꽉 채운다 (조금 잘려도 괜찮은 정도) — 밖이면 사진 전체를 보인다 */
const FILL_MIN = 0.75;
const FILL_MAX = 1.4;

/**
 * 칸에 맞춰 보여 주는 사진 — 세로 포스터처럼 칸과 비율이 크게 다른 사진은 자르지 않고 전체를 보이고,
 * 남는 곳은 같은 사진을 흐리게 깔아 채운다. 비율이 비슷한 사진(가로 사진 등)은 지금처럼 칸을 꽉 채운다.
 * 부모 칸은 position: relative + 크기(aspect-ratio 등)를 가져야 한다. 처음(불러오기 전·자바스크립트 없이)은 전체 보기.
 */
export function FitImage({
  src,
  alt = "",
  sizes,
  priority,
  unoptimized,
  className,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  unoptimized?: boolean;
  /** 감싸는 칸에 더할 클래스 (예: 마우스를 올리면 살짝 커지는 효과) */
  className?: string;
}) {
  const [fill, setFill] = useState(false);
  return (
    <span className={`${styles.wrap} ${fill ? styles.fill : ""} ${className ?? ""}`}>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} unoptimized={unoptimized} className={styles.backdrop} />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className={styles.main}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!img.naturalWidth || !img.naturalHeight || !img.clientWidth || !img.clientHeight) return;
          const r = img.naturalWidth / img.naturalHeight / (img.clientWidth / img.clientHeight);
          setFill(r >= FILL_MIN && r <= FILL_MAX);
        }}
      />
    </span>
  );
}
