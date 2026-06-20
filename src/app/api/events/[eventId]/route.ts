import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";

// GET single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    await connectToDatabase();
    const event = await Event.findById(eventId).select("-__v").lean();
    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}

// PATCH update event (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { eventId } = await params;
    const body = await request.json();

    await connectToDatabase();

    const event = await Event.findByIdAndUpdate(
      eventId,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ event }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}

// DELETE event (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { eventId } = await params;
    await connectToDatabase();

    await Event.findByIdAndDelete(eventId);

    return NextResponse.json(
      { message: "Event deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }
}