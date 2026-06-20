import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/auth/signin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Admin Sidebar */}
      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 fixed left-0 top-16 hidden lg:block">
          <div className="p-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">
              Admin Panel
            </p>
            <nav className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
              >
                <span>📊</span> Dashboard
              </Link>
              <Link
                href="/admin/events"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
              >
                <span>🎵</span> Manage Events
              </Link>
              <Link
                href="/admin/events/new"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
              >
                <span>➕</span> Add New Event
              </Link>
              <Link
                href="/scanner"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
              >
                <span>🔍</span> QR Scanner
              </Link>
              <div className="border-t border-gray-800 my-3" />
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
              >
                <span>🏠</span> View Site
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}