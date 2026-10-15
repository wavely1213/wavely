import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffGrid } from "@/components/player/StaffCard";
import { getStaff } from "@/lib/repo";

export const metadata: Metadata = { title: "코칭스태프" };

export default async function StaffPage() {
  const staff = await getStaff();
  return (
    <>
      <PageHeader title="코칭스태프" current="/team/staff" />
      <div className="container">
        <StaffGrid staff={staff} />
      </div>
    </>
  );
}
