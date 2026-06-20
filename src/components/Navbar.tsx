"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Events" },
    ...(session ? [{ href: "/dashboard", label: "My Tickets" }] : []),
    ...(session?.user?.role === "ADMIN"
      ? [
          { href: "/admin", label: "Admin" },
          { href: "/scanner", label: "Scanner" },
        ]
      : []),
  ];

  return (
    <nav className="glass border-b border-gray-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-extrabold text-white flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🎵</span>
            <span>
              Concert<span className="text-purple-400">Tix</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  } ${
                    link.label === "Scanner"
                      ? "text-yellow-400 hover:text-yellow-300"
                      : ""
                  } ${
                    link.label === "Admin"
                      ? "text-purple-400 hover:text-purple-300"
                      : ""
                  }`}
                >
                  {link.label === "Scanner" && "🔍 "}
                  {link.label === "Admin" && "⚙️ "}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth Area */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-24 h-8 bg-gray-800 rounded-lg animate-pulse" />
            ) : session ? (
              <div className="flex items-center gap-3">
                {/* User badge */}
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 font-medium">
                    {session.user.name?.split(" ")[0]}
                  </span>
                  {session.user.role === "ADMIN" && (
                    <span className="text-xs bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded-md font-semibold">
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-gray-800 mt-3 pt-3">
              {session ? (
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link href="/auth/signin" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
                    Sign In
                  </Link>
                  <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-purple-400 hover:bg-gray-800 rounded-lg transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}