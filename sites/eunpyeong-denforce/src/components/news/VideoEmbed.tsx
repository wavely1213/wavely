import { embedSrc, parseVideoUrl, VIDEO_PROVIDER_LABEL, watchUrl } from "@/lib/video";
import styles from "./VideoEmbed.module.css";

/** 구단영상 재생 — 유튜브(가로·쇼츠)·인스타그램 릴스를 사이트 안에서 재생하고, 원본 링크를 함께 둔다 (D-035) */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const v = parseVideoUrl(url);
  if (!v) return null;
  const shape = v.provider === "instagram" ? styles.instagram : v.vertical ? styles.vertical : styles.wide;
  return (
    <figure className={`${styles.wrap} ${shape}`}>
      <div className={styles.frame}>
        <iframe
          src={embedSrc(v)}
          title={`${title} 영상`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <figcaption className={styles.caption}>
        <a href={watchUrl(v)} target="_blank" rel="noopener noreferrer">
          {VIDEO_PROVIDER_LABEL[v.provider]}에서 보기<span className="sr-only"> (새 창)</span>
        </a>
      </figcaption>
    </figure>
  );
}
