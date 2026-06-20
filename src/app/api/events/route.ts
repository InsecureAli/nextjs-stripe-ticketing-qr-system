/**
 * GET  /api/events  → Returns all upcoming events
 * POST /api/events  → Creates a new event (ADMIN only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";

// ─── GET: List All Upcoming Events ───────────────────────────────────────────

export async function GET() {
  try {
    await connectToDatabase();

    /**
     * Only return UPCOMING events (date in the future).
     * Sort by date ascending (soonest first).
     * Exclude __v from results.
     */
    const events = await Event.find({
      date: { $gte: new Date() }, // Greater than or equal to now
    })
      .sort({ date: 1 })
      .select("-__v")
      .lean();

    return NextResponse.json({ events, count: events.length }, { status: 200 });
  } catch (error) {
    console.error("❌ Failed to fetch events:", error);
    return NextResponse.json(
      { error: "FETCH_FAILED", message: "Failed to retrieve events" },
      { status: 500 }
    );
  }
}

// ─── POST: Create New Event (Admin Only) ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Only ADMIN users can create events
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only admins can create events" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, venue, date, imageUrl, totalCapacity, price, currency } = body;

    // Basic validation
    if (!name || !description || !venue || !date || !totalCapacity || !price) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Create event — availableTickets starts equal to totalCapacity
    const event = await Event.create({
      name,
      description,
      venue,
      date: new Date(date),
      imageUrl,
      totalCapacity,
      availableTickets: totalCapacity, // Starts fully available
      price,
      currency: currency ?? "usd",
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("❌ Failed to create event:", error);
    return NextResponse.json(
      { error: "CREATE_FAILED", message: "Failed to create event" },
      { status: 500 }
    );
  }
}