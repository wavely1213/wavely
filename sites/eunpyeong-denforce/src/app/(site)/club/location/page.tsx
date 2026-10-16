import type { Metadata } from "next";
import { VenueMap } from "@/components/club/VenueMap";
import { PageHeader } from "@/components/layout/PageHeader";
import { SITE } from "@/config/site";
import { getClubSettings } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "오시는 길" };

export default async function LocationPage() {
  const settings = await getClubSettings();
  return (
    <>
      <PageHeader title="오시는 길" current="/club/location" />
      <div className={`container ${styles.body}`}>
        <section>
          <h2 className={styles.h2}>홈구장 · {SITE.homeVenue}</h2>
          <VenueMap address={settings.venueAddress} />
        </section>
        <ul className={styles.list}>
          <li>
            <span>주소</span>
            <span>{settings.venueAddress ?? "준비 중"}</span>
          </li>
          <li>
            <span>대중교통</span>
            <span>{settings.venueTransit ?? "준비 중"}</span>
          </li>
          <li>
            <span>주차</span>
            <span>{settings.venueParking ?? "준비 중"}</span>
          </li>
        </ul>
      </div>
    </>
  );
}
