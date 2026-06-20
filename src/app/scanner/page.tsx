import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import QRScannerClient from "./QRScannerClient";

/**
 * Scanner Page — /scanner
 *
 * Server Component wrapper:
 * - Checks authentication and admin role server-side
 * - Redirects non-admins before any client code runs
 * - Renders the Client Component scanner interface
 */
export default async function ScannerPage() {
  const session = await getServerSession(authOptions);

  // Not logged in
  if (!session) {
    redirect("/auth/signin?callbackUrl=/scanner");
  }

  // Logged in but not admin
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-900/50 rounded-2xl mb-4 border border-yellow-700">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Ticket Scanner
        </h1>
        <p className="text-gray-400 text-sm">
          Scan attendee QR codes at the venue entrance
        </p>
        <div className="inline-flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 text-yellow-400 text-xs px-3 py-1.5 rounded-full mt-3">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
          Staff Access Only — {session.user.email}
        </div>
      </div>

      {/* Client scanner component */}
      <QRScannerClient />
    </div>
  );
}