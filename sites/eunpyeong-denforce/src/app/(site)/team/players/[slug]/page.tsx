import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { LEAGUE } from "@/config/league";
import { POSITION_LABEL } from "@/data/people";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { nonEmptyParams } from "@/lib/params";
import { findPlayerJoin, playerDescription, profileRows } from "@/lib/player-profile";
import { getNews, getPlayer, getPlayers, getSiteContent, isLiveData } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import type { Player } from "@/types";

export async function generateStaticParams() {
  return nonEmptyParams((await getPlayers()).map((p) => ({ slug: p.slug })), { slug: "none" });
}

/** 기록 시즌 뒤에 영입된 선수면 그 영입 소식 (구단뉴스 제목으로 찾는다) */
async function joinOf(player: Player) {
  const [players, posts] = await Promise.all([getPlayers(), getNews("news")]);
  return findPlayerJoin({
    name: player.name,
    sameNameCount: players.filter((p) => p.name === player.name).length,
    posts,
    statsSeason: LEAGUE.statsSeason,
  });
}

export async function generateMetadata({ params }: PageProps<"/team/players/[slug]">): Promise<Metadata> {
  const player = await getPlayer((await params).slug);
  if (!player) return { title: "선수" };
  // 링크 미리보기 = 선수 사진 (없으면 사이트 이미지) + 포지션·기록(또는 합류 시즌) — D-038
  const description = playerDescription({
    player,
    positionLabel: POSITION_LABEL[player.position],
    clubName: (await getSiteContent())["site.name"],
    statsSeason: LEAGUE.statsSeason,
    join: await joinOf(player),
  });
  return {
    title: player.name,
    description,
    ...(await sitePreviewMeta({ imageUrl: player.photo, imageAlt: player.name, description })),
  };
}

export default async function PlayerPage({ params }: PageProps<"/team/players/[slug]">) {
  const player = await getPlayer((await params).slug);
  if (!player) notFound();

  const join = await joinOf(player);
  const profile = profileRows(player, POSITION_LABEL[player.position], join);
  // 합류 선수는 출전/득점 칸이 없으니 기록 출처 문구 대신 영입 소식 바로가기
  const joined = profile.some(([k]) => k === "합류");

  return (
    <>
      {/* 이 페이지의 큰 제목은 선수 이름(h1) — 메뉴 이름 '선수'는 작게 */}
      <PageHeader title="선수" current="/team/players" compact />
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
            <h1 className={styles.pageTitle}>
              {player.number != null && `No.${player.number} `}
              {player.name}
            </h1>
            <ul className={styles.list}>
              {profile.map(([k, v]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            {joined && join ? (
              <p>
                <Link href={`/news/${join.post.category}/${join.post.id}`} className={styles.button}>
                  영입 소식 보기
                </Link>
              </p>
            ) : (
              isLiveData() && (
                <p className={`${styles.note} ${styles.source}`}>
                  출전/득점: {LEAGUE.statsSeason} 기록 / 자료: {LEAGUE.source}
                </p>
              )
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
