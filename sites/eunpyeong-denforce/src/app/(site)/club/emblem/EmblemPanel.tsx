import Image from "next/image";
import { EmphasisText } from "@/components/ui/EmphasisText";
import { SITE } from "@/config/site";
import { EMBLEM_DOWNLOADS } from "@/data/club";
import { hexToRgb, inkOn } from "@/lib/color";
import { splitParagraphs } from "@/lib/data/rows";
import { getContentList, getSiteContent } from "@/lib/repo";
import styles from "./emblem.module.css";

/** 엠블럼 탭 — 제목 / 모눈 패널(엠블럼 + Main Color + 파일 내려받기) / 굵게 강조한 설명. 설명·색은 관리자 › 홈페이지 내용 › 엠블럼/유니폼 */
export async function EmblemPanel() {
  const [content, colorItems] = await Promise.all([getSiteContent(), getContentList("emblem.colors")]);
  const clubName = content["site.name"];
  // 형식이 맞는 색만 (잘못된 값은 칸을 그리지 않는다)
  const colors = colorItems.flatMap((c) => {
    const rgb = hexToRgb(c.body);
    return rgb ? [{ id: c.id, name: c.title, hex: c.body.trim().toUpperCase(), rgb, ink: inkOn(rgb) }] : [];
  });
  return (
    <section className={styles.section} aria-labelledby="emblem-title">
      <h2 id="emblem-title" className={styles.title}>
        {clubName} 엠블럼 소개 및 상징
      </h2>

      <div className={styles.board}>
        <div className={styles.emblem}>
          <Image src={SITE.emblem} alt={`${clubName} 엠블럼`} width={600} height={829} sizes="(max-width: 760px) 200px, 280px" priority />
        </div>

        <div className={styles.info}>
          {colors.length > 0 && (
            <>
              <h3 className={styles.infoTitle}>Main Color</h3>
              <ul className={styles.colors}>
                {colors.map((c) => (
                  <li key={c.id} className={styles.color}>
                    <span className={`${styles.chip} ${c.ink === "dark" ? styles.inkDark : styles.inkLight}`} style={{ background: c.hex }}>
                      {c.hex}
                    </span>
                    <span className={styles.colorName}>{c.name}</span>
                    <span className={styles.rgb}>
                      R{c.rgb[0]} G{c.rgb[1]} B{c.rgb[2]}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 className={styles.infoTitle}>Download</h3>
          <ul className={styles.downloads}>
            {EMBLEM_DOWNLOADS.map((d) => (
              <li key={d.format}>
                {/* 파일 이름은 주소의 영문 이름 그대로 — 한글 이름은 크롬이 'download' 로 바꿔 버린다 */}
                <a href={d.href} download className={styles.download}>
                  <span>
                    <strong>{d.format}</strong> 파일 다운받기
                  </span>
                  <span className={styles.note}>{d.note}</span>
                  <svg className={styles.icon} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.text}>
        {splitParagraphs(content["emblem.text"]).map((p, i) => (
          <p key={i}>
            <EmphasisText text={p} />
          </p>
        ))}
      </div>
    </section>
  );
}
