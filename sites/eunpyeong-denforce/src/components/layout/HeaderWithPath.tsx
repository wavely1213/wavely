"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

export function HeaderWithPath() {
  return <Header pathname={usePathname()} />;
}
