"use client";

import { usePathname } from "next/navigation";
import type { SnsLink } from "@/lib/club";
import { Header } from "./Header";

export function HeaderWithPath({ sns }: { sns: SnsLink[] }) {
  return <Header pathname={usePathname()} sns={sns} />;
}
