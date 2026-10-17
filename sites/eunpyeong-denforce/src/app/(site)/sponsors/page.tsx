import type { Metadata } from "next";
import Link from "next/link";
import { SponsorStrip } from "@/components/home/SponsorStrip";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSponsors } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "스폰서" };

export default async function SponsorsPage() {
  const sponsors = await getSponsors();
  return (
    <>
      <PageHeader title="스폰서" current="/sponsors" />
      <div className={`container ${styles.body}`}>
        <SponsorStrip sponsors={sponsors} />
        <section className={styles.card}>
          <h3>스폰서십 문의</h3>
          <p>FK리그 중계/유니폼/SNS를 통한 브랜드 노출과 지역 사회공헌 프로그램을 함께할 파트너를 찾습니다.</p>
          <p style={{ marginTop: 16 }}>
            <Link href="/contact" className={styles.button}>
              문의하기
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
