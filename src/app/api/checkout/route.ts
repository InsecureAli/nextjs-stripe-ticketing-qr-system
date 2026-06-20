/**
 * POST /api/checkout
 *
 * PURPOSE:
 * Creates a Stripe Checkout Session and returns the URL to redirect the user.
 *
 * WHAT THIS ROUTE DOES:
 * 1. Verifies the user is authenticated (no anonymous purchases)
 * 2. Validates the request body (eventId, quantity)
 * 3. Fetches the event from MongoDB to get price and availability
 * 4. Checks tickets are available (prevents overselling)
 * 5. Creates a Stripe Checkout Session with:
 *    - Line items (what the user is buying)
 *    - Metadata (userId + eventId — we need these in the webhook)
 *    - Success and cancel redirect URLs
 * 6. Returns the Stripe-hosted checkout URL
 *
 * WHAT THIS ROUTE DOES NOT DO:
 * ❌ Does NOT create a Ticket document (webhook does that)
 * ❌ Does NOT charge the user (Stripe does that)
 * ❌ Does NOT generate a QR code (webhook does that)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import stripe from "@/lib/stripe/stripeClient";

// ─── Request Body Type ────────────────────────────────────────────────────────

interface CheckoutRequestBody {
  eventId: string;
  quantity: number;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── STEP 1: Verify Authentication ──────────────────────────────────────
    /**
     * getServerSession() reads the JWT cookie and returns the session.
     * Returns null if the user is not logged in.
     * We pass authOptions so it knows how to decode our custom JWT fields.
     */
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "You must be logged in to purchase tickets",
        },
        { status: 401 }
      );
    }

    // ── STEP 2: Parse and Validate Request Body ─────────────────────────────
    let body: CheckoutRequestBody;

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

    const { eventId, quantity } = body;

    // Validate eventId
    if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
      return NextResponse.json(
        {
          error: "MISSING_EVENT_ID",
          message: "eventId is required",
        },
        { status: 400 }
      );
    }

    // Validate quantity
    if (
      !quantity ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return NextResponse.json(
        {
          error: "INVALID_QUANTITY",
          message: "Quantity must be a whole number between 1 and 10",
        },
        { status: 400 }
      );
    }

    // ── STEP 3: Fetch Event from Database ───────────────────────────────────
    await connectToDatabase();

    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json(
        {
          error: "EVENT_NOT_FOUND",
          message: "The requested event does not exist",
        },
        { status: 404 }
      );
    }

    // ── STEP 4: Check Ticket Availability ──────────────────────────────────
    /**
     * Check if enough tickets are available.
     * NOTE: This is a "soft" check — the actual atomic decrement happens
     * in the webhook after payment is confirmed.
     *
     * There's a small race condition window here (two users checking at the
     * same time), but the webhook handler uses atomic MongoDB operations
     * to prevent actual overselling. This check prevents obviously bad requests.
     */
    if (event.availableTickets < quantity) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_TICKETS",
          message:
            event.availableTickets === 0
              ? "This event is sold out"
              : `Only ${event.availableTickets} ticket(s) remaining`,
          availableTickets: event.availableTickets,
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Check if event has already passed
    if (new Date(event.date) < new Date()) {
      return NextResponse.json(
        {
          error: "EVENT_PASSED",
          message: "Cannot purchase tickets for a past event",
        },
        { status: 400 }
      );
    }

    // ── STEP 5: Create Stripe Checkout Session ──────────────────────────────
    /**
     * A Stripe Checkout Session represents one "purchase attempt".
     * Stripe hosts the entire payment form — we never touch card data.
     *
     * KEY FIELDS:
     *
     * line_items: What the user is buying.
     *   - price_data: We define the price dynamically (not from Stripe dashboard)
     *   - unit_amount: Price in CENTS (matches our DB storage)
     *
     * metadata: KEY-VALUE pairs attached to the session.
     *   ⚠️ CRITICAL: This is how we pass userId and eventId to the webhook.
     *   The webhook handler reads these to know which user and event
     *   to create the ticket for. Without metadata, the webhook is blind.
     *   Values MUST be strings (Stripe metadata only supports strings).
     *
     * payment_intent_data.metadata: We also attach metadata to the
     *   Payment Intent (the actual charge object) so it's accessible
     *   from both the session and the payment intent in the webhook.
     *
     * success_url: Where to redirect after successful payment.
     *   {CHECKOUT_SESSION_ID} is replaced by Stripe with the actual session ID.
     *   We use this on the success page to look up the ticket.
     *
     * cancel_url: Where to redirect if user clicks "back" or closes the tab.
     *
     * expires_at: Session expires after 30 minutes.
     *   After expiry, the user must start checkout again.
     */
    const checkoutSession = await stripe.checkout.sessions.create({
      // Payment method types to accept
      payment_method_types: ["card"],

      // What the user is buying
      line_items: [
        {
          price_data: {
            currency: event.currency, // "usd", "gbp", etc.
            product_data: {
              name: `${event.name} - Ticket`,
              description: `${new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })} at ${event.venue}`,
              // Optional: add event image to Stripe checkout page
              images: event.imageUrl ? [event.imageUrl] : [],
            },
            unit_amount: event.price, // Already in cents from our DB
          },
          quantity: quantity,
        },
      ],

      // One-time payment (not a subscription)
      mode: "payment",

      /**
       * METADATA — The bridge between checkout and webhook
       *
       * These values travel with the Stripe session and are readable
       * in the webhook. This is the ONLY way to know which MongoDB
       * user and event to associate with the payment.
       */
      metadata: {
        userId: session.user.id, // MongoDB User _id
        eventId: eventId, // MongoDB Event _id
        quantity: quantity.toString(), // Must be string
        userEmail: session.user.email ?? "", // For confirmation emails (future)
      },

      /**
       * payment_intent_data.metadata
       * Also attach to the Payment Intent so the metadata is accessible
       * regardless of which Stripe object we receive in the webhook
       */
      payment_intent_data: {
        metadata: {
          userId: session.user.id,
          eventId: eventId,
          quantity: quantity.toString(),
        },
      },

      // Where to send the user after payment
      success_url: `${process.env.NEXTAUTH_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      // Where to send the user if they cancel
      cancel_url: `${process.env.NEXTAUTH_URL}/events/${eventId}`,

      // Pre-fill the email field on the Stripe checkout page
      customer_email: session.user.email ?? undefined,

      // Session expires in 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // ── STEP 6: Return the Checkout URL ────────────────────────────────────
    /**
     * The frontend will redirect the user to this URL.
     * It points to Stripe's hosted checkout page.
     * Example: https://checkout.stripe.com/c/pay/cs_test_xxx
     */
    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json(
      {
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("❌ Checkout session creation failed:", error);

    // Return a generic error to the client (don't expose internals)
    return NextResponse.json(
      {
        error: "CHECKOUT_FAILED",
        message: "Failed to create checkout session. Please try again.",
      },
      { status: 500 }
    );
  }
}