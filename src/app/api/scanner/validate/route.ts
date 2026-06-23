import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";

export async function POST(request: NextRequest) {
  console.log("\n🔍 ── Scanner Validate Called ──");

  try {
    // ── Step 1: Auth check ──────────────────────────────────────
    const session = await getServerSession(authOptions);
    console.log("👤 Session:", session ? session.user.email : "NO SESSION");
    console.log("🔑 Role:", session?.user?.role);

    if (!session || !session.user) {
      return NextResponse.json(
        { result: "ERROR", message: "Not logged in" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { result: "ERROR", message: "Staff access only" },
        { status: 403 }
      );
    }

    // ── Step 2: Parse body ──────────────────────────────────────
    let token: string;
    try {
      const body = await request.json();
      token = body?.token ?? "";
      console.log("🎫 Token received:", token ? token.substring(0, 20) + "..." : "MISSING");
    } catch {
      return NextResponse.json(
        {
          result: "INVALID",
          message: "INVALID TICKET",
          detail: "Could not read scan data",
        },
        { status: 200 }
      );
    }

    if (!token || token.trim() === "") {
      return NextResponse.json(
        {
          result: "INVALID",
          message: "INVALID TICKET",
          detail: "Empty token received",
        },
        { status: 200 }
      );
    }

    const cleanToken = token.trim();

    // ── Step 3: Connect to database ─────────────────────────────
    await connectToDatabase();
    console.log("✅ Database connected");

    // ── Step 4: Find ticket first without populate ──────────────
    // We avoid populate here to prevent crashes from missing refs
    const rawTicket = await Ticket.findOne({
      secureToken: cleanToken,
    }).lean();

    console.log("🎫 Raw ticket found:", rawTicket ? "YES" : "NO");

    if (!rawTicket) {
      console.warn("❌ Token not found in database");
      return NextResponse.json(
        {
          result: "INVALID",
          message: "INVALID TICKET",
          detail: "This QR code is not recognized",
        },
        { status: 200 }
      );
    }

    console.log("   Ticket ID:", rawTicket._id);
    console.log("   Status:", rawTicket.status);
    console.log("   Event ID:", rawTicket.eventId);

    // ── Step 5: Already used ────────────────────────────────────
    if (rawTicket.status === "USED") {
      console.warn("⚠️  Ticket already scanned");

      // Get event name safely
      let eventName = "Unknown Event";
      try {
        const Event = (await import("@/lib/models/Event")).default;
        const eventDoc = await Event.findById(rawTicket.eventId)
          .select("name")
          .lean();
        if (eventDoc) eventName = eventDoc.name;
      } catch {
        // Event lookup failed — use fallback
      }

      return NextResponse.json(
        {
          result: "USED",
          message: "ALREADY SCANNED",
          detail: "This ticket has already been used for entry",
          ticket: {
            id: rawTicket._id,
            scannedAt: rawTicket.scannedAt ?? null,
            event: { name: eventName },
          },
        },
        { status: 200 }
      );
    }

    // ── Step 6: Valid ticket — mark as USED ─────────────────────
    if (rawTicket.status === "VALID") {
      const scannedAt = new Date();

      await Ticket.findByIdAndUpdate(rawTicket._id, {
        $set: {
          status: "USED",
          scannedAt: scannedAt,
        },
      });

      console.log("✅ Ticket marked as USED");

      // Get event name safely
      let eventInfo = {
        name: "Unknown Event",
        date: new Date().toISOString(),
        venue: "Unknown Venue",
      };

      try {
        const Event = (await import("@/lib/models/Event")).default;
        const eventDoc = await Event.findById(rawTicket.eventId)
          .select("name date venue")
          .lean();
        if (eventDoc) {
          eventInfo = {
            name: eventDoc.name,
            date: eventDoc.date?.toISOString() ?? new Date().toISOString(),
            venue: eventDoc.venue ?? "Unknown Venue",
          };
        }
      } catch {
        // Event lookup failed — use fallback
      }

      console.log("✅ Scan complete for event:", eventInfo.name);

      return NextResponse.json(
        {
          result: "VALID",
          message: "WELCOME! Ticket Accepted",
          ticket: {
            id: rawTicket._id,
            scannedAt: scannedAt,
            quantity: rawTicket.quantity ?? 1,
            ticketNumber: rawTicket.ticketNumber ?? 1,
            totalInOrder: rawTicket.totalInOrder ?? 1,
            event: eventInfo,
          },
        },
        { status: 200 }
      );
    }

    // ── Step 7: Unknown status ──────────────────────────────────
    console.error("❌ Unknown ticket status:", rawTicket.status);
    return NextResponse.json(
      {
        result: "INVALID",
        message: "INVALID TICKET",
        detail: "Ticket has an unknown status",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("\n❌ ── VALIDATION ERROR ──");
    console.error("Name:", error instanceof Error ? error.name : "unknown");
    console.error("Message:", error instanceof Error ? error.message : String(error));
    console.error("Stack:", error instanceof Error ? error.stack : "no stack");
    console.error("────────────────────────\n");

    return NextResponse.json(
      {
        result: "ERROR",
        message: "An error occurred during ticket validation",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}