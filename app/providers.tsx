"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/education")) return children;
  return <SessionProvider>{children}</SessionProvider>;
}
