import Image from "next/image";
import styles from "./NewsGallery.module.css";

// 구단소식 상세 사진 (D-017) — 자르지 않고 원본 비율로, PC 두 칸 / 모바일 한 칸.
// width·height 는 로드 전 자리 비율(인스타그램 4:5)일 뿐, 로드 후에는 실제 비율로 보인다.

export function NewsGallery({ images, title }: { images: string[]; title: string }) {
  return (
    <ul className={styles.grid}>
      {images.map((src, i) => (
        <li key={`${i}:${src}`}>
          <Image
            src={src}
            alt={`${title} 사진 ${i + 1}`}
            width={1080}
            height={1350}
            sizes="(max-width: 720px) 100vw, (max-width: 1200px) 50vw, 600px"
            className={styles.image}
          />
        </li>
      ))}
    </ul>
  );
}
