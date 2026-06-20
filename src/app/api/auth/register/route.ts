/**
 * POST /api/auth/register
 *
 * PURPOSE:
 * Creates a new user account.
 * Password is hashed automatically by the User model's pre-save hook.
 */

import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongoose";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // ── Validate Required Fields ────────────────────────────────────────────
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "MISSING_FIELDS",
          message: "Name, email, and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "WEAK_PASSWORD",
          message: "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // ── Check for Existing User ─────────────────────────────────────────────
    /**
     * We check BEFORE trying to create to give a clear error message.
     * The unique index on email would also reject duplicates, but the
     * MongoDB error message is harder to parse into a user-friendly response.
     */
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "EMAIL_TAKEN",
          message: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // ── Create User ─────────────────────────────────────────────────────────
    /**
     * The pre-save hook in User.ts automatically hashes the password.
     * We never store plain-text passwords.
     */
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Will be hashed by pre-save hook
      role: "CUSTOMER", // All registrations start as CUSTOMER
    });

    // Return success WITHOUT the password (even though it's hashed)
    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Registration failed:", error);

    return NextResponse.json(
      {
        error: "REGISTRATION_FAILED",
        message: "Failed to create account. Please try again.",
      },
      { status: 500 }
    );
  }
}