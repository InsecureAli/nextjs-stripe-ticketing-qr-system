/**
 * NextAuth Type Augmentation
 *
 * WHY THIS FILE?
 * ──────────────
 * NextAuth's default Session and JWT types don't include our custom fields
 * like `role` and `id`. TypeScript would give errors like:
 *   "Property 'role' does not exist on type 'Session'"
 *
 * This file EXTENDS (not replaces) NextAuth's built-in types to include
 * our custom fields. It uses TypeScript's "declaration merging" feature.
 *
 * IMPORTANT: This file must be referenced in tsconfig.json under "include"
 * OR be in a location TypeScript automatically picks up.
 */

import "next-auth";
import "next-auth/jwt";

// Extend the built-in Session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // MongoDB ObjectId as string
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "CUSTOMER" | "ADMIN"; // Our custom role field
    };
  }

  // Extend the User type returned by the authorize() callback
  interface User {
    id: string;
    role: "CUSTOMER" | "ADMIN";
  }
}

// Extend the JWT type (the token stored in the cookie)
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "ADMIN";
  }
}