/**
 * POST /api/scanner/validate
 *
 * PURPOSE:
 * Receives a scanned QR token from the staff scanner interface,
 * validates it against the database, and marks it as USED.
 *
 * SECURITY LAYERS:
 * 1. User must be authenticated (session check)
 * 2. User must have ADMIN role (role check)
 * 3. Token lookup uses the unique index on secureToken (fast + secure)
 * 4. Status update is atomic (findOneAndUpdate) to prevent race conditions
 *    where two scanners scan the same ticket at exactly the same time
 *
 * POSSIBLE RESPONSES:
 * ✅ 200 { result: "VALID" }    → Ticket accepted, now marked as USED
 * ❌ 200 { result: "USED" }     → Already scanned before, reject entry
 * ❌ 200 { result: "INVALID" }  → Token not found in database
 * ❌ 401                         → Not logged in
 * ❌ 403                         → Not an admin
 *
 * NOTE: We return 200 for USED and INVALID (not 4xx) because these are
 * expected business outcomes, not HTTP errors. The scanner UI reads
 * the `result` field to decide what color to show.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";

// ─── Request Body Type ────────────────────────────────────────────────────────

interface ValidateRequestBody {
  token: string; // The UUIDv4 string decoded from the QR code
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── STEP 1: Verify Authentication ───────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "You must be logged in to use the scanner",
        },
        { status: 401 }
      );
    }

    // ── STEP 2: Verify Admin Role ───────────────────────────────────────────
    /**
     * ONLY admin users can validate tickets.
     * A regular customer who somehow reaches this endpoint gets rejected.
     */
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Only staff members can validate tickets",
        },
        { status: 403 }
      );
    }

    // ── STEP 3: Parse and Validate Request Body ─────────────────────────────
    let body: ValidateRequestBody;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    const { token } = body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        {
          error: "MISSING_TOKEN",
          message: "Token is required",
        },
        { status: 400 }
      );
    }

    // Basic UUID v4 format validation
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidV4Regex.test(token.trim())) {
      return NextResponse.json(
        {
          result: "INVALID",
          message: "INVALID TICKET",
          detail: "Token format is not valid",
        },
        { status: 200 }
      );
    }

    // ── STEP 4: Connect and Look Up the Token ──────────────────────────────
    await connectToDatabase();

    /**
     * ATOMIC UPDATE STRATEGY:
     *
     * Instead of doing this (which has a race condition):
     *   const ticket = await Ticket.findOne({ secureToken: token });
     *   if (ticket.status === 'VALID') {
     *     ticket.status = 'USED';        ← GAP: another scanner could run here
     *     await ticket.save();
     *   }
     *
     * We do this (atomic — happens in a single MongoDB operation):
     *   findOneAndUpdate with condition { status: 'VALID' }
     *
     * If two scanners scan the same ticket simultaneously:
     * - Scanner A: findOneAndUpdate finds status=VALID → updates to USED → returns updated doc ✅
     * - Scanner B: findOneAndUpdate finds status=USED  → condition fails  → returns null ✅
     *
     * Both scanners handle their result correctly without a race condition.
     */
    const updatedTicket = await Ticket.findOneAndUpdate(
      {
        secureToken: token.trim(),
        status: "VALID", // ONLY update if currently VALID
      },
      {
        $set: {
          status: "USED",
          scannedAt: new Date(), // Record when it was scanned
        },
      },
      {
        new: true, // Return the document AFTER the update
        populate: {
          path: "eventId",
          select: "name date venue",
        },
      }
    );

    // ── STEP 5: Handle the Result ───────────────────────────────────────────

    if (updatedTicket) {
      /**
       * ✅ SUCCESS: Ticket was VALID and is now marked as USED.
       * Return green success with ticket details for the scanner display.
       */
      console.log(
        `✅ Ticket validated and marked as USED: ${updatedTicket._id}`
      );
      console.log(`   Scanned by admin: ${session.user.email}`);
      console.log(`   Scanned at: ${updatedTicket.scannedAt}`);

      return NextResponse.json(
        {
          result: "VALID",
          message: "WELCOME! Ticket Accepted",
          ticket: {
            id: updatedTicket._id,
            scannedAt: updatedTicket.scannedAt,
            quantity: updatedTicket.quantity,
            event: updatedTicket.eventId,
          },
        },
        { status: 200 }
      );
    }

    /**
     * updatedTicket is null — one of two reasons:
     * A) Token not found at all (INVALID)
     * B) Token found but status was already USED
     *
     * We need to check which case we're in.
     */
    const existingTicket = await Ticket.findOne({
      secureToken: token.trim(),
    })
      .populate({
        path: "eventId",
        select: "name date venue",
      })
      .lean();

    if (!existingTicket) {
      /**
       * ❌ INVALID: Token does not exist in our database at all.
       * Could be a forged QR code or scanning a random QR code.
       */
      console.warn(`❌ Invalid ticket token scanned: ${token}`);
      console.warn(`   Scanned by admin: ${session.user.email}`);

      return NextResponse.json(
        {
          result: "INVALID",
          message: "INVALID TICKET",
          detail: "This QR code is not recognized",
        },
        { status: 200 }
      );
    }

    /**
     * ❌ ALREADY USED: Ticket exists but was already scanned.
     * Possible duplicate entry attempt.
     */
    console.warn(`⚠️  Already-used ticket scan attempt: ${existingTicket._id}`);
    console.warn(`   Originally scanned at: ${existingTicket.scannedAt}`);
    console.warn(`   Re-scan attempt by: ${session.user.email}`);

    return NextResponse.json(
      {
        result: "USED",
        message: "ALREADY SCANNED",
        detail: "This ticket has already been used for entry",
        ticket: {
          id: existingTicket._id,
          scannedAt: existingTicket.scannedAt,
          event: existingTicket.eventId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Scanner validation error:", error);

    return NextResponse.json(
      {
        error: "VALIDATION_FAILED",
        message: "An error occurred during ticket validation",
      },
      { status: 500 }
    );
  }
}