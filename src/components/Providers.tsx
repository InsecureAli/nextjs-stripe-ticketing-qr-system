/**
 * Providers Component
 *
 * WHY THIS EXISTS:
 * SessionProvider from next-auth uses React Context, which requires
 * the component to be a Client Component ("use client").
 * We cannot make layout.tsx a client component (it's a server component).
 * So we extract SessionProvider into this small wrapper.
 */

"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}