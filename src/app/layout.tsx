/**
 * Root Layout
 *
 * This wraps EVERY page in the application.
 * We add:
 * - SessionProvider (makes useSession() work in all client components)
 * - Global Tailwind styles
 * - Shared Navbar
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ConcertTix — Buy Concert Tickets",
  description: "Discover and buy tickets for upcoming concerts near you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        {/* 
          Providers wraps everything with SessionProvider.
          SessionProvider must be a Client Component, so we extract it.
        */}
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}