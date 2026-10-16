import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { LEAGUE } from "@/config/league";
import { SITE } from "@/config/site";
import { POSITION_LABEL } from "@/data/people";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { nonEmptyParams } from "@/lib/params";
import { getPlayer, getPlayers, isLiveData } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export async function generateStaticParams() {
  return nonEmptyParams((await getPlayers()).map((p) => ({ slug: p.slug })), { slug: "none" });
}

export async function generateMetadata({ params }: PageProps<"/team/players/[slug]">): Promise<Metadata> {
  const player = await getPlayer((await params).slug);
  if (!player) return { title: "선수" };
  // 링크 미리보기 = 선수 사진 (없으면 사이트 이미지) + 포지션·등번호 — D-038
  const description = `${SITE.name} ${POSITION_LABEL[player.position]}${player.number != null ? ` · 등번호 ${player.number}` : ""}`;
  return {
    title: player.name,
    description,
    ...(await sitePreviewMeta({ imageUrl: player.photo, imageAlt: player.name, description })),
  };
}

export default async function PlayerPage({ params }: PageProps<"/team/players/[slug]">) {
  const player = await getPlayer((await params).slug);
  if (!player) notFound();

  const profile: Array<[string, string]> = [
    ["등번호", player.number?.toString() ?? "-"],
    ["포지션", `${POSITION_LABEL[player.position]} (${player.position})`],
    ["생년월일", player.birth ?? "-"],
    ["신장", player.heightCm ? `${player.heightCm}cm` : "-"],
    ["출전", `${player.stats.apps}경기`],
    ["득점", `${player.stats.goals}골`],
    // 도움은 연맹이 공개하지 않아 기록이 있을 때만 보여준다
    ...(player.stats.assists > 0 ? [["도움", `${player.stats.assists}개`] as [string, string]] : []),
  ];

  return (
    <>
      <PageHeader title="선수" current="/team/players" />
      <div className={`container ${styles.body}`}>
        <div className={styles.split}>
          <div className={styles.figure} style={{ aspectRatio: "3 / 4", maxWidth: 360 }}>
            {player.photo ? (
              <Image src={player.photo} alt={player.name} fill preload sizes="360px" />
            ) : (
              <EmblemFallback label={player.number ?? undefined} />
            )}
          </div>
          <div>
            <h2 className={styles.h2}>
              No.{player.number ?? "-"} {player.name}
            </h2>
            <ul className={styles.list}>
              {profile.map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            {isLiveData() && (
              <p className={`${styles.note} ${styles.source}`}>
                출전·득점: {LEAGUE.statsSeason} 기록 · 자료: {LEAGUE.source}
              </p>
            )}
          </div>
        </div>
        <p>
          <Link href="/team/players" className={styles.button}>
            선수 목록
          </Link>
        </p>
      </div>
    </>
  );
}
