import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";
import Event from "@/lib/models/Event";
import stripe from "@/lib/stripe/stripeClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Main POST Handler ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  console.log("\n📨 Webhook received at:", new Date().toISOString());

  // ── Step 1: Read raw body ─────────────────────────────────────
  let rawBody: string;
  try {
    rawBody = await request.text();
    console.log("✅ Raw body read, length:", rawBody.length);
  } catch (error) {
    console.error("❌ Failed to read raw body:", error);
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 }
    );
  }

  // ── Step 2: Get Stripe signature header ──────────────────────
  const stripeSignature = request.headers.get("stripe-signature");
  console.log("🔑 Stripe signature present:", !!stripeSignature);

  if (!stripeSignature) {
    console.error("❌ No stripe-signature header found");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // ── Step 3: Check webhook secret is configured ────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log("🔑 Webhook secret present:", !!webhookSecret);

  if (
    !webhookSecret ||
    webhookSecret === "whsec_YOUR_WEBHOOK_SIGNING_SECRET"
  ) {
    console.error("❌ STRIPE_WEBHOOK_SECRET is missing or placeholder");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // ── Step 4: Verify Stripe signature ──────────────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      stripeSignature,
      webhookSecret
    );
    console.log("✅ Stripe signature verified");
    console.log("📋 Event type:", event.type);
    console.log("📋 Event ID:", event.id);
  } catch (error) {
    console.error("❌ Signature verification failed:", error);
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.error("   Message:", error.message);
    }
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // ── Step 5: Handle the event ──────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed":
        console.log("🎫 Processing checkout.session.completed...");
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "checkout.session.expired":
        console.log("⏰ Checkout session expired:", event.data.object.id);
        break;

      case "payment_intent.payment_failed":
        console.log("💳 Payment failed:", event.data.object.id);
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("❌ Error handling webhook event:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // ── Step 6: Acknowledge receipt ───────────────────────────────
  return NextResponse.json({ received: true }, { status: 200 });
}

// ─── Generate QR Code Image from Token ───────────────────────────
async function generateQRCode(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "H",
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

// ─── Handle Successful Checkout ───────────────────────────────────
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log("\n🎫 ── handleCheckoutSessionCompleted ──");
  console.log("   Session ID:", session.id);
  console.log("   Payment status:", session.payment_status);
  console.log("   Metadata:", session.metadata);

  // ── Only process paid sessions ────────────────────────────────
  if (session.payment_status !== "paid") {
    console.log("⚠️  Payment not completed yet, skipping");
    return;
  }

  // ── Extract metadata ──────────────────────────────────────────
  const userId = session.metadata?.userId;
  const eventId = session.metadata?.eventId;
  const quantity = parseInt(session.metadata?.quantity ?? "1", 10);

  console.log("   userId:", userId);
  console.log("   eventId:", eventId);
  console.log("   quantity:", quantity);

  if (!userId || !eventId) {
    console.error("❌ CRITICAL: Missing userId or eventId in metadata");
    console.error("   Full metadata:", JSON.stringify(session.metadata));
    throw new Error("Missing required metadata");
  }

  // ── Get payment intent ID ─────────────────────────────────────
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error("❌ No payment intent ID in session");
    throw new Error("No payment intent ID");
  }

  console.log("   paymentIntentId:", paymentIntentId);

  // ── Connect to database ───────────────────────────────────────
  await connectToDatabase();
  console.log("✅ Database connected");

  // ── Check for duplicate webhook ───────────────────────────────
  /**
   * Stripe can send the same webhook more than once.
   * We check if ANY ticket already exists for this payment intent.
   * The first ticket in a multi-seat order always uses the raw
   * paymentIntentId so this check catches all duplicates.
   */
  const existingTicket = await Ticket.findOne({
    paymentIntentId: paymentIntentId,
  });

  if (existingTicket) {
    console.log("⚠️  Tickets already exist for this payment — skipping");
    console.log("   Existing ticket ID:", existingTicket._id);
    return;
  }

  // ── Verify event exists ───────────────────────────────────────
  const eventDoc = await Event.findById(eventId);

  if (!eventDoc) {
    console.error("❌ Event not found:", eventId);
    throw new Error(`Event ${eventId} not found`);
  }

  console.log("✅ Event found:", eventDoc.name);

  // ── Generate one ticket per seat ──────────────────────────────
  /**
   * KEY DESIGN:
   * We create ONE ticket document per seat purchased.
   * If user bought 5 tickets → 5 documents, 5 QR codes.
   *
   * Each ticket:
   * - Has its own unique UUIDv4 secure token
   * - Has its own QR code image
   * - Has status: VALID (can be scanned exactly once)
   * - Shows "Seat X of Y" on the dashboard
   *
   * Ticket 1 uses the raw paymentIntentId.
   * Tickets 2-N use paymentIntentId_seat_N to keep them unique
   * while still allowing the duplicate check above to work
   * (it only checks for the raw paymentIntentId).
   */
  console.log(`\n   Creating ${quantity} individual ticket(s)...`);

  const ticketsToCreate = [];

  for (let i = 0; i < quantity; i++) {
    // Each seat gets its own cryptographically random token
    const secureToken = uuidv4();

    // Each seat gets its own QR code image
    let qrCodeData: string;
    try {
      qrCodeData = await generateQRCode(secureToken);
      console.log(`   ✅ QR code generated for seat ${i + 1}/${quantity}`);
    } catch (qrError) {
      console.error(`❌ QR code generation failed for seat ${i + 1}:`, qrError);
      throw new Error(`QR code generation failed for seat ${i + 1}`);
    }

    ticketsToCreate.push({
      eventId: eventId,
      userId: userId,
      secureToken: secureToken,
      status: "VALID",

      /**
       * paymentIntentId uniqueness strategy:
       * Seat 1: pi_3TkWNuRWfCddpY2s1...          (raw ID)
       * Seat 2: pi_3TkWNuRWfCddpY2s1..._seat_2   (derived)
       * Seat 3: pi_3TkWNuRWfCddpY2s1..._seat_3   (derived)
       *
       * The unique index on paymentIntentId in the schema
       * prevents duplicates for each seat individually.
       * The duplicate webhook check above uses the raw ID
       * which only exists on Seat 1 — catches all duplicates.
       */
      paymentIntentId:
        i === 0
          ? paymentIntentId
          : `${paymentIntentId}_seat_${i + 1}`,

      stripeSessionId: session.id,
      qrCodeData: qrCodeData,
      quantity: 1,           // Each document = 1 seat
      ticketNumber: i + 1,   // Seat number in the order (1, 2, 3...)
      totalInOrder: quantity, // Total seats in this purchase
      scannedAt: null,
    });

    console.log(
      `   ✅ Seat ${i + 1}/${quantity} prepared — token: ${secureToken.substring(0, 8)}...`
    );
  }

  // ── Insert all tickets to database ────────────────────────────
  try {
    const createdTickets = await Ticket.insertMany(ticketsToCreate, {
      ordered: true, // Stop on first error
    });

    console.log(
      `\n   ✅ ${createdTickets.length} ticket(s) saved to database`
    );

    createdTickets.forEach((t, i) => {
      console.log(
        `   Ticket ${i + 1}: ID=${t._id} | Token=${t.secureToken.substring(0, 8)}... | Status=${t.status}`
      );
    });
  } catch (dbError: unknown) {
    /**
     * MongoDB duplicate key error code = 11000
     * This fires if Stripe sends a second webhook that somehow
     * passes the findOne check but hits the unique index on insert.
     * Safe to ignore — tickets were already created.
     */
    if (
      typeof dbError === "object" &&
      dbError !== null &&
      "code" in dbError &&
      (dbError as { code: number }).code === 11000
    ) {
      console.log(
        "⚠️  Duplicate key on insert — tickets already exist, skipping"
      );
      return;
    }

    console.error("❌ Database error creating tickets:", dbError);
    throw dbError;
  }

  // ── Atomically decrement available tickets ────────────────────
  /**
   * We use $inc with a condition ($gte: quantity) to ensure
   * we never go below zero even if two webhooks run simultaneously.
   * findOneAndUpdate is atomic at the document level in MongoDB.
   */
  try {
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        availableTickets: { $gte: quantity },
      },
      {
        $inc: { availableTickets: -quantity },
      },
      { new: true }
    );

    if (updatedEvent) {
      console.log(
        `\n   ✅ Available tickets updated: ${updatedEvent.availableTickets} remaining`
      );
    } else {
      console.warn(
        "⚠️  Could not decrement tickets — may already be at 0"
      );
    }
  } catch (updateError) {
    // Non-critical — tickets are created, just log this
    console.error("⚠️  Failed to decrement available tickets:", updateError);
  }

  console.log("\n✅ ── Webhook processing complete ──");
  console.log(`   ${quantity} QR code(s) generated`);
  console.log(`   User: ${userId}`);
  console.log(`   Event: ${eventDoc.name}`);
  console.log(`   Payment: ${paymentIntentId}`);
  console.log("────────────────────────────────────────\n");
}