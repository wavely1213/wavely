import type { Metadata } from "next";
import Link from "next/link";
import { SponsorStrip } from "@/components/home/SponsorStrip";
import { PageHeader } from "@/components/layout/PageHeader";
import { LEAGUE } from "@/config/league";
import { SPONSOR_TOPIC, mailDraftHref, snsHandle, topicSubject } from "@/lib/contact";
import { pageMetadata } from "@/lib/page-meta";
import { contentLines } from "@/lib/content/values";
import { getClubSettings, getSiteContent, getSponsors } from "@/lib/repo";
import { leagueEntryLine } from "@/lib/sponsors";
import styles from "@/styles/prose.module.css";
import local from "./sponsors.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("스폰서", "/sponsors");
}

export default async function SponsorsPage() {
  const [sponsors, settings, content] = await Promise.all([getSponsors(), getClubSettings(), getSiteContent()]);
  // 확인된 사실만 (BR-004): 리그 참가는 지금 시즌 대회명(자동), 가운데 줄은 관리자 › 홈페이지 내용 › 스폰서
  // (기본값 생중계 줄 = 포스팅 FK리그 탭의 한국풋살연맹 유튜브 [LIVE] 영상들). 팔로워 수 등 숫자는 넣지 않는다
  const league = leagueEntryLine(LEAGUE.currentCompetition);
  const instagram = settings.instagramUrl;
  return (
    <>
      <PageHeader title="스폰서" current="/sponsors" />
      <div className={`container ${styles.body}`}>
        <SponsorStrip sponsors={sponsors} />
        <section className={styles.card}>
          <h3>{content["sponsors.box.title"]}</h3>
          <p>{content["sponsors.box.body"]}</p>
          <ul className={local.facts}>
            {league && <li>{league}</li>}
            {[...new Set(contentLines(content["sponsors.box.facts"]))].map((line) => (
              <li key={line}>{line}</li>
            ))}
            {instagram && (
              <li>
                구단 공식 인스타그램 운영{" "}
                <a href={instagram} target="_blank" rel="noreferrer">
                  {snsHandle(instagram) ?? instagram}
                  <span className="sr-only"> (새 창)</span>
                </a>
              </li>
            )}
          </ul>
          <p style={{ marginTop: 16 }}>
            {/* 문의 메일이 있으면 제목이 채워진 메일 쓰기 창, 없으면 문의 페이지로 */}
            {settings.contactEmail ? (
              <a href={mailDraftHref(settings.contactEmail, topicSubject(SPONSOR_TOPIC))} className={styles.button}>
                {content["sponsors.box.button"]}
              </a>
            ) : (
              <Link href="/contact" className={styles.button}>
                {content["sponsors.box.button"]}
              </Link>
            )}
          </p>
        </section>
      </div>
    </>
  );
}
