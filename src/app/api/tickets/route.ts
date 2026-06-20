/**
 * GET /api/tickets
 *
 * PURPOSE:
 * Returns all tickets belonging to the currently authenticated user.
 * Used by the /dashboard page to show the user their purchased tickets and QR codes.
 *
 * SECURITY:
 * - User must be authenticated (checked via session)
 * - Users can ONLY see their OWN tickets (userId filter on query)
 * - Even if a user somehow knows another user's ticket ID, this route won't return it
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";

export async function GET(request: NextRequest) {
  try {
    // ── Verify Authentication ───────────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "You must be logged in to view tickets",
        },
        { status: 401 }
      );
    }

    // ── Fetch Tickets ───────────────────────────────────────────────────────
    await connectToDatabase();

    /**
     * .populate('eventId') replaces the eventId ObjectId reference
     * with the actual Event document fields we need.
     *
     * We use .select() to specify exactly which fields to return:
     * - We include qrCodeData (the base64 QR image) ← user needs this
     * - We EXCLUDE __v (MongoDB version key, internal use only)
     *
     * .sort({ createdAt: -1 }) returns newest tickets first.
     * .lean() returns plain JS objects instead of Mongoose documents
     * (faster, and safe here since we don't need Mongoose methods on the result)
     */
    const tickets = await Ticket.find({ userId: session.user.id })
      .populate({
        path: "eventId",
        select: "name date venue imageUrl price currency", // Only these fields from Event
      })
      .select("-__v") // Exclude version key
      .sort({ createdAt: -1 }) // Newest first
      .lean(); // Plain objects (faster)

    return NextResponse.json(
      {
        tickets,
        count: tickets.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Failed to fetch tickets:", error);

    return NextResponse.json(
      {
        error: "FETCH_FAILED",
        message: "Failed to retrieve tickets",
      },
      { status: 500 }
    );
  }
}