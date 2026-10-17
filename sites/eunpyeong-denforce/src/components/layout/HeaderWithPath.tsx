"use client";

import { usePathname } from "next/navigation";
import type { SnsLink } from "@/lib/club";
import type { HeaderContent } from "@/lib/content/views";
import { Header } from "./Header";

export function HeaderWithPath({ sns, content }: { sns: SnsLink[]; content: HeaderContent }) {
  return <Header pathname={usePathname()} sns={sns} content={content} />;
}
