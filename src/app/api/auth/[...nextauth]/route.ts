/**
 * NextAuth Route Handler
 *
 * The [...nextauth] folder name is a Next.js "catch-all" route.
 * It handles ALL of these paths automatically:
 *   /api/auth/signin
 *   /api/auth/signout
 *   /api/auth/session
 *   /api/auth/csrf
 *   /api/auth/callback/credentials
 *   etc.
 *
 * This file is intentionally minimal — all configuration lives in authOptions.ts
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

// Create the handler using our centralized config
const handler = NextAuth(authOptions);

// Export as both GET and POST — NextAuth uses both methods internally
export { handler as GET, handler as POST };

