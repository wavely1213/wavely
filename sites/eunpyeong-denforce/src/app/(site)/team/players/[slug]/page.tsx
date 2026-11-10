import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { toNewsCardPost } from "@/components/news/NewsCard";
import { NewsMoreGrid } from "@/components/news/NewsMoreGrid";
import { PlayerHero } from "@/components/player/PlayerHero";
import { PlayerNav } from "@/components/player/PlayerNav";
import { LEAGUE } from "@/config/league";
import { POSITION_LABEL } from "@/data/people";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { nonEmptyParams } from "@/lib/params";
import { findPlayerJoin, findPlayerNews, playerDescription, playerNeighbors, playerRecordLine } from "@/lib/player-profile";
import { getNews, getPlayer, getPlayers, getSiteContent, isLiveData } from "@/lib/repo";
import styles from "./player.module.css";
import type { Player } from "@/types";

export async function generateStaticParams() {
  return nonEmptyParams((await getPlayers()).map((p) => ({ slug: p.slug })), { slug: "none" });
}

/**
 * 이 선수의 소식 — join: 기록 시즌 뒤에 영입된 선수면 그 영입 소식(구단뉴스 제목으로 찾는다, '합류' 칸에 씀),
 * related: 아래 '관련 소식' 미리보기 카드(구단뉴스/공지사항, D-068)
 */
async function newsOf(player: Player) {
  const [players, posts] = await Promise.all([getPlayers(), getNews()]);
  const sameNameCount = players.filter((p) => p.name === player.name).length;
  return {
    join: findPlayerJoin({ name: player.name, sameNameCount, posts, statsSeason: LEAGUE.statsSeason }),
    related: findPlayerNews({ name: player.name, slug: player.slug, sameNameCount, posts }),
  };
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
    join: (await newsOf(player)).join,
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

  const [{ join, related }, players] = await Promise.all([newsOf(player), getPlayers()]);
  const record = playerRecordLine(player, join);
  const { prev, next } = playerNeighbors(players, player.slug);

  return (
    <>
      {/* 이 페이지의 큰 제목은 선수 이름(h1, PlayerHero) — 메뉴 이름 '선수'는 작게 */}
      <PageHeader title="선수" current="/team/players" compact flush />
      <PlayerHero
        player={player}
        positionLabel={POSITION_LABEL[player.position]}
        record={record}
        joinSeason={record ? null : (join?.season ?? null)}
        source={isLiveData() ? `출전/득점: ${LEAGUE.statsSeason} 기록 / 자료: ${LEAGUE.source}` : null}
      />
      <div className="container">
        {/* 관련 소식 (BR-031, D-068) — 12개씩 더 보기, 없으면 숨김. '영입 소식 보기' 버튼은 없음 */}
        {related.length > 0 && (
          <section className={styles.related} aria-labelledby="player-news">
            <h2 id="player-news" className={styles.h2}>
              관련 소식
            </h2>
            <NewsMoreGrid posts={related.map(toNewsCardPost)} />
          </section>
        )}
        <PlayerNav prev={prev} next={next} />
      </div>
    </>
  );
}
