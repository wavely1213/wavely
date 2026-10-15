import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getStaff } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "코칭스태프" };

export default async function StaffPage() {
  const staff = await getStaff();
  return (
    <>
      <PageHeader title="코칭스태프" current="/team/staff" />
      <div className="container">
        <div className={styles.cards}>
          {staff.map((s) => (
            <div key={s.slug} className={styles.card}>
              <h3>{s.role}</h3>
              <p>{s.name}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
