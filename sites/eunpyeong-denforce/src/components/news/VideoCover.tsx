import Image from "next/image";
import { buttonClass } from "@/components/ui/Button";
import { externalPlay, parseVideoUrl } from "@/lib/video";
import styles from "./VideoCover.module.css";

/**
 * 구단영상 상세 — 사이트 안에서 재생하지 않는다(인스타그램, 유튜브 틀 없음, D-074).
 * 표지를 칸에 꽉 채우고(세로 영상 9:16, 유튜브 가로 16:9) 아래에 원본 재생 버튼(새 창) 하나.
 * 구단영상 카드는 원본으로 바로 가므로 그 상세는 옛 주소나 사이트맵으로 들어온 경우에 보이고,
 * 영상 주소가 있는 공지/구단뉴스는 카드가 상세로 오므로 이 화면에서 원본으로 간다 (videoCardPlay).
 */
export function VideoCover({ url, thumbnail }: { url: string; thumbnail: string | null }) {
  const v = parseVideoUrl(url);
  const play = externalPlay(url);
  if (!v || !play) return null;
  const wide = v.provider === "youtube" && !v.vertical;
  return (
    <figure className={`${styles.wrap} ${wide ? styles.wide : styles.vertical}`}>
      {thumbnail && (
        <div className={styles.frame}>
          {/* 제목(h1)이 바로 위에 있어 표지는 꾸밈 */}
          <Image src={thumbnail} alt="" fill sizes="(max-width: 720px) 100vw, 400px" className={styles.cover} priority />
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
        </div>
      )}
      <figcaption className={styles.caption}>
        <a href={play.href} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", styles.button)}>
          {play.label} <span aria-hidden="true">↗</span>
          <span className="sr-only">(새 창)</span>
        </a>
      </figcaption>
    </figure>
  );
}
