import type { Metadata } from "next";
import Link from "next/link";
import { SponsorStrip } from "@/components/home/SponsorStrip";
import { PageHeader } from "@/components/layout/PageHeader";
import { LEAGUE } from "@/config/league";
import { SPONSOR_TOPIC, mailDraftHref, snsHandle, topicSubject } from "@/lib/contact";
import { getClubSettings, getSponsors } from "@/lib/repo";
import { leagueEntryLine } from "@/lib/sponsors";
import styles from "@/styles/prose.module.css";
import local from "./sponsors.module.css";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("스폰서", "/sponsors");
}

export default async function SponsorsPage() {
  const [sponsors, settings] = await Promise.all([getSponsors(), getClubSettings()]);
  // 확인된 사실만 (BR-004): 리그 참가는 지금 시즌 대회명, 생중계는 포스팅 FK리그 탭의 한국풋살연맹 유튜브 [LIVE] 영상들.
  // 팔로워 수 등 숫자는 넣지 않는다
  const league = leagueEntryLine(LEAGUE.currentCompetition);
  const instagram = settings.instagramUrl;
  return (
    <>
      <PageHeader title="스폰서" current="/sponsors" />
      <div className={`container ${styles.body}`}>
        <SponsorStrip sponsors={sponsors} />
        <section className={styles.card}>
          <h3>스폰서십 문의</h3>
          <p>FK리그 중계/유니폼/SNS를 통한 브랜드 노출과 지역 사회공헌 프로그램을 함께할 파트너를 찾습니다.</p>
          <ul className={local.facts}>
            {league && <li>{league}</li>}
            <li>FK리그 경기는 한국풋살연맹 유튜브로 생중계</li>
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
                문의하기
              </a>
            ) : (
              <Link href="/contact" className={styles.button}>
                문의하기
              </Link>
            )}
          </p>
        </section>
      </div>
    </>
  );
}
