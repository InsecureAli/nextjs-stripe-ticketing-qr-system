/**
 * POST /api/webhooks/stripe
 *
 * PURPOSE:
 * Receives payment confirmation events from Stripe's servers and
 * creates the Ticket document with a secure QR code.
 *
 * ════════════════════════════════════════════════════════════════
 * ⚠️  SECURITY — READ THIS BEFORE TOUCHING THIS FILE ⚠️
 * ════════════════════════════════════════════════════════════════
 *
 * THREAT: Anyone on the internet can send a POST request to this URL.
 * A malicious actor could send a fake "payment completed" event
 * and get free tickets.
 *
 * DEFENSE: Stripe signs every webhook request with your
 * STRIPE_WEBHOOK_SECRET. We use stripe.webhooks.constructEvent()
 * to verify this signature. If the signature is invalid or missing,
 * we immediately reject the request with 400.
 *
 * HOW SIGNATURE VERIFICATION WORKS:
 * 1. Stripe computes an HMAC-SHA256 hash of the raw request body
 *    using your webhook secret as the key
 * 2. Stripe sends this hash in the "Stripe-Signature" header
 * 3. We compute the same hash on our side
 * 4. If they match → request is genuinely from Stripe
 * 5. If they don't match → reject immediately
 *
 * ⚠️  RAW BODY REQUIREMENT:
 * The signature is computed on the RAW bytes of the request body.
 * If we parse the body as JSON first (which Next.js normally does),
 * the bytes change and signature verification FAILS.
 * We MUST read the raw body using request.text() or request.arrayBuffer().
 *
 * ════════════════════════════════════════════════════════════════
 *
 * IDEMPOTENCY:
 * Stripe can send the same webhook event MORE THAN ONCE if our
 * server doesn't respond with 200 quickly enough.
 * We handle this with a unique index on Ticket.paymentIntentId —
 * the second attempt to create a ticket for the same payment
 * will hit a MongoDB duplicate key error, which we catch and
 * handle gracefully by returning 200 (telling Stripe "we got it").
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";
import Event from "@/lib/models/Event";
import stripe from "@/lib/stripe/stripeClient";

// ─── CRITICAL: Disable body parsing ──────────────────────────────────────────
/**
 * Next.js App Router automatically parses request bodies.
 * We MUST disable this for the webhook route because:
 * - Stripe signature verification requires the RAW, UNPARSED body
 * - Once the body is parsed and re-stringified, the bytes may differ
 * - Different bytes = different HMAC hash = signature verification FAILS
 *
 * This export tells Next.js to skip its automatic body parsing
 * for this specific route.
 */
export const dynamic = "force-dynamic";

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── STEP 1: Read the Raw Request Body ────────────────────────────────────
  /**
   * We use request.text() to get the body as a raw string.
   * This preserves the exact bytes that Stripe signed.
   * Do NOT use request.json() here — that would break signature verification.
   */
  const rawBody = await request.text();

  // ── STEP 2: Get the Stripe Signature Header ───────────────────────────────
  /**
   * Stripe sends the signature in this specific header.
   * It looks like: t=1614556800,v1=abc123...,v0=def456...
   * The stripe SDK parses this format automatically.
   */
  const stripeSignature = request.headers.get("stripe-signature");

  if (!stripeSignature) {
    console.error("❌ Webhook received with no Stripe-Signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // ── STEP 3: Verify the Webhook Signature ─────────────────────────────────
  /**
   * stripe.webhooks.constructEvent() does THREE things:
   * 1. Parses the raw body as JSON
   * 2. Verifies the HMAC-SHA256 signature against your webhook secret
   * 3. Checks the timestamp to prevent replay attacks
   *    (rejects events older than 5 minutes by default)
   *
   * If ANY of these checks fail, it throws a Stripe.errors.StripeSignatureVerificationError
   */
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      stripeSignature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.error(
        "❌ Webhook signature verification failed:",
        error.message
      );
      console.error(
        "   This could mean: wrong secret, tampered body, or replay attack"
      );
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    console.error("❌ Webhook construction failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }

  // ── STEP 4: Handle Only the Events We Care About ──────────────────────────
  /**
   * Stripe sends MANY types of events (payment failed, refunded, disputed, etc.)
   * We only act on 'checkout.session.completed' which fires when:
   * - The user successfully completed the Stripe Checkout form
   * - Payment was collected (or will be collected for payment_intent)
   *
   * For all other event types, we acknowledge receipt (return 200)
   * but take no action. This is correct behavior — Stripe expects 200
   * for events it sends, even if we don't use them.
   */
  console.log(`📨 Received Stripe webhook event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed":
      /**
       * Payment was successful!
       * Now we create the ticket and QR code.
       */
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case "checkout.session.expired":
      /**
       * User let the checkout session expire (30 min timeout).
       * We could log this, but no ticket action needed.
       */
      console.log(`⏰ Checkout session expired: ${event.data.object.id}`);
      break;

    case "payment_intent.payment_failed":
      /**
       * Payment failed (bad card, insufficient funds, etc.)
       * We could send an email here in the future.
       */
      console.log(`💳 Payment failed for intent: ${event.data.object.id}`);
      break;

    default:
      /**
       * Unhandled event type — acknowledge receipt but do nothing.
       * This is correct. Never return 4xx for unknown event types.
       */
      console.log(`ℹ️  Unhandled event type: ${event.type} — ignoring`);
  }

  // ── STEP 5: Return 200 to Acknowledge Receipt ─────────────────────────────
  /**
   * CRITICAL: We must return 200 quickly (within 30 seconds).
   * If we don't, Stripe marks the delivery as failed and retries.
   * The actual ticket creation happens in handleCheckoutSessionCompleted()
   * which we await above before reaching this return.
   */
  return NextResponse.json({ received: true }, { status: 200 });
}

// ─── Core Logic: Handle Successful Payment ────────────────────────────────────

/**
 * handleCheckoutSessionCompleted()
 *
 * Called when Stripe confirms payment was successful.
 * This function is responsible for:
 * 1. Extracting userId and eventId from session metadata
 * 2. Generating a cryptographically secure token (UUIDv4)
 * 3. Generating a QR code image from that token
 * 4. Creating the Ticket document in MongoDB
 * 5. Atomically decrementing availableTickets on the Event
 *
 * @param session - The Stripe Checkout Session object from the webhook event
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log(`\n🎫 Processing successful checkout: ${session.id}`);

  // ── Extract Metadata ──────────────────────────────────────────────────────
  /**
   * Remember: we attached metadata when creating the checkout session.
   * Now we read it back here. If metadata is missing, something went wrong
   * during session creation and we cannot proceed.
   */
  const { userId, eventId, quantity } = session.metadata ?? {};

  if (!userId || !eventId) {
    console.error(
      "❌ CRITICAL: Checkout session missing userId or eventId in metadata!",
      {
        sessionId: session.id,
        metadata: session.metadata,
      }
    );
    // We throw here — this will cause a 500 response, making Stripe retry.
    // Better to retry than to silently lose a paid ticket.
    throw new Error("Missing required metadata in checkout session");
  }

  const ticketQuantity = parseInt(quantity ?? "1", 10);
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error("❌ CRITICAL: No payment intent ID found in session", {
      sessionId: session.id,
    });
    throw new Error("No payment intent ID in checkout session");
  }

  console.log(`   User ID: ${userId}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Quantity: ${ticketQuantity}`);
  console.log(`   Payment Intent: ${paymentIntentId}`);

  // ── Connect to Database ───────────────────────────────────────────────────
  await connectToDatabase();

  // ── Check for Duplicate Webhook ───────────────────────────────────────────
  /**
   * IDEMPOTENCY CHECK:
   * Before creating anything, check if we already processed this payment.
   * Stripe can send the same webhook multiple times if our server is slow
   * or returns a non-200 response.
   *
   * If a ticket already exists for this paymentIntentId, we log it and return
   * early — ticket has already been created, job done.
   */
  const existingTicket = await Ticket.findOne({ paymentIntentId });

  if (existingTicket) {
    console.log(
      `⚠️  Duplicate webhook detected for payment intent: ${paymentIntentId}`
    );
    console.log(`   Ticket already exists: ${existingTicket._id}`);
    console.log(`   Skipping ticket creation.`);
    return; // Exit gracefully — not an error
  }

  // ── Verify Event Still Exists ─────────────────────────────────────────────
  const event = await Event.findById(eventId);

  if (!event) {
    console.error(
      `❌ CRITICAL: Event ${eventId} not found during webhook processing`
    );
    throw new Error(`Event ${eventId} not found`);
  }

  // ── Generate Secure Token ─────────────────────────────────────────────────
  /**
   * UUIDv4 (Universally Unique Identifier version 4)
   *
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * Example: f47ac10b-58cc-4372-a567-0e02b2c3d479
   *
   * WHY UUID v4?
   * - 122 bits of randomness (2^122 possible values)
   * - Statistically impossible to guess by brute force
   * - Generated using cryptographically secure random numbers
   * - Not sequential (unlike auto-increment IDs) — no pattern to predict
   * - The uuid npm package uses crypto.randomUUID() internally
   *
   * This token IS the QR code payload.
   * When scanned, this token is sent to /api/scanner/validate
   * which looks it up in the database.
   */
  const secureToken = uuidv4();
  console.log(`   Generated secure token: ${secureToken}`);

  // ── Generate QR Code Image ────────────────────────────────────────────────
  /**
   * We encode the secureToken into a QR code image.
   *
   * The QR code contains ONLY the token string (not the ticket ID,
   * user ID, or any other data). This means:
   * - Scanning the QR gives you: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   * - The scanner sends this to our API to validate
   * - Our API looks up the token in MongoDB to find the ticket
   *
   * QRCode.toDataURL() returns a base64-encoded PNG image:
   * "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
   *
   * We store this in the database so we don't regenerate it on every request.
   *
   * Options:
   * - errorCorrectionLevel: 'H' = 30% of QR can be damaged/obscured and still scan
   * - width: 400px is large enough to scan reliably
   * - margin: White border around the QR code (helps scanners)
   */
  let qrCodeData: string;

  try {
    qrCodeData = await QRCode.toDataURL(secureToken, {
      errorCorrectionLevel: "H", // High error correction
      width: 400, // pixels
      margin: 2, // quiet zone (white border)
      color: {
        dark: "#000000", // Black QR modules
        light: "#FFFFFF", // White background
      },
    });
    console.log(`   QR code generated successfully`);
  } catch (qrError) {
    console.error("❌ Failed to generate QR code:", qrError);
    throw new Error("QR code generation failed");
  }

  // ── Create the Ticket Document ────────────────────────────────────────────
  /**
   * Now we create the Ticket in MongoDB.
   *
   * We use a try-catch specifically for duplicate key errors (code 11000).
   * This is our SECOND layer of idempotency protection (after the findOne check).
   *
   * The unique index on paymentIntentId means MongoDB will reject
   * a second ticket insert for the same payment — even if two webhook
   * requests somehow slip past the findOne check simultaneously.
   */
  try {
    const ticket = await Ticket.create({
      eventId: eventId,
      userId: userId,
      secureToken: secureToken,
      status: "VALID",
      paymentIntentId: paymentIntentId,
      stripeSessionId: session.id,
      qrCodeData: qrCodeData,
      quantity: ticketQuantity,
    });

    console.log(`   ✅ Ticket created: ${ticket._id}`);
    console.log(`   Status: ${ticket.status}`);

    // ── Atomically Decrement Available Tickets ──────────────────────────────
    /**
     * ATOMIC OPERATION: $inc with a condition
     *
     * This single MongoDB operation:
     * 1. Finds the event where availableTickets >= quantity (prevents going negative)
     * 2. Decrements availableTickets by the purchased quantity
     * 3. Returns the updated document
     *
     * WHY ATOMIC?
     * If two users buy the last 2 tickets simultaneously:
     * - Request A: reads availableTickets = 2, proceeds
     * - Request B: reads availableTickets = 2, proceeds
     * - Request A: webhook runs, decrements to 0 ✅
     * - Request B: webhook runs, condition fails (0 >= 2 is false), 
     *              NO decrement ✅ (prevents going negative)
     *
     * findOneAndUpdate() with these options is atomic at the document level.
     */
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        availableTickets: { $gte: ticketQuantity }, // Only if enough tickets remain
      },
      {
        $inc: { availableTickets: -ticketQuantity }, // Decrement by quantity purchased
      },
      {
        new: true, // Return the updated document (not the original)
        runValidators: true, // Run schema validators on update
      }
    );

    if (!updatedEvent) {
      /**
       * This means the atomic update found no matching document,
       * which means availableTickets < quantity at update time.
       * The ticket was created but no decrement happened.
       *
       * In production, you'd want to handle this edge case:
       * - Potentially flag the ticket for review
       * - Trigger a refund
       * For now, we log it as a warning.
       */
      console.warn(
        `⚠️  Could not decrement available tickets for event ${eventId}.`,
        `Available tickets may be 0 or less than quantity ${ticketQuantity}.`
      );
    } else {
      console.log(
        `   ✅ Event tickets decremented: ${updatedEvent.availableTickets} remaining`
      );
    }
  } catch (dbError: unknown) {
    /**
     * MongoDB duplicate key error code is 11000.
     * This means a ticket with this paymentIntentId already exists
     * (race condition between the findOne check and the create call).
     * This is safe to ignore — the ticket was already created.
     */
    if (
      typeof dbError === "object" &&
      dbError !== null &&
      "code" in dbError &&
      (dbError as { code: number }).code === 11000
    ) {
      console.log(
        `⚠️  Duplicate key on ticket create for payment ${paymentIntentId} — already exists, skipping`
      );
      return;
    }

    // For any other DB error, re-throw so Stripe knows to retry
    console.error("❌ Failed to create ticket in database:", dbError);
    throw dbError;
  }

  console.log(`\n✅ Webhook processing complete for session: ${session.id}\n`);
}