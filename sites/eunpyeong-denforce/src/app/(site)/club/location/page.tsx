import type { Metadata } from "next";
import { VenueMap } from "@/components/club/VenueMap";
import { PageHeader } from "@/components/layout/PageHeader";
import { infoLines } from "@/lib/club";
import { pageMetadata } from "@/lib/page-meta";
import { getClubSettings, getSiteContent } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import local from "./location.module.css";

/** 대중교통/주차 글 — 줄바꿈이나 ' / '로 나눈 한 줄씩 (관리자 › 구단정보) */
function InfoLines({ text }: { text: string | null }) {
  if (!text) return <span>준비 중</span>;
  return (
    <span className={local.lines}>
      {infoLines(text).map((l, i) => (
        <span key={i}>
          {l.label && <span className={local.label}>{l.label}</span>}
          {l.text}
        </span>
      ))}
    </span>
  );
}

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("오시는 길", "/club/location");
}

export default async function LocationPage() {
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  return (
    <>
      <PageHeader title="오시는 길" current="/club/location" />
      <div className={`container ${styles.body}`}>
        <section>
          <h2 className={styles.h2}>홈구장 / {content["site.homeVenue"]}</h2>
          <VenueMap address={settings.venueAddress} />
        </section>
        <ul className={styles.list}>
          <li>
            <span>주소</span>
            <span>{settings.venueAddress ?? "준비 중"}</span>
          </li>
          <li>
            <span>대중교통</span>
            <InfoLines text={settings.venueTransit} />
          </li>
          <li>
            <span>주차</span>
            <InfoLines text={settings.venueParking} />
          </li>
        </ul>
      </div>
    </>
  );
}
