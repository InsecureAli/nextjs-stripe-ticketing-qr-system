/**
 * Ticket Model
 *
 * This is the MOST SECURITY-CRITICAL model in the application.
 *
 * SECURITY DESIGN DECISIONS:
 * ───────────────────────────
 *
 * 1. secureToken (UUIDv4):
 *    - Generated server-side in the webhook handler, NOT during checkout
 *    - A UUIDv4 has 122 bits of randomness — practically impossible to guess
 *    - This token IS the QR code payload
 *    - Unique index ensures no two tickets share a token
 *
 * 2. status enum (VALID | USED):
 *    - Only two states to prevent confusion
 *    - Status starts as VALID only after payment webhook confirms
 *    - Atomically set to USED during scanning to prevent race conditions
 *
 * 3. paymentIntentId:
 *    - Links the ticket to a specific Stripe payment
 *    - Used for refund lookup and audit trails
 *    - Has a unique index to prevent duplicate ticket creation for one payment
 *
 * 4. qrCodeData:
 *    - Stores the base64-encoded QR code image
 *    - Generated once and stored, not regenerated on every request
 *    - Only populated after webhook confirms payment
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId; // References Event collection
  userId: mongoose.Types.ObjectId; // References User collection
  secureToken: string; // UUIDv4 — the QR code payload
  status: "VALID" | "USED";
  paymentIntentId: string; // Stripe Payment Intent ID (pi_xxx)
  stripeSessionId: string; // Stripe Checkout Session ID (cs_xxx)
  qrCodeData: string; // Base64 encoded QR image (data:image/png;base64,...)
  scannedAt?: Date; // When the ticket was scanned (undefined if not yet used)
  quantity: number; // Number of tickets in this purchase
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema Definition ────────────────────────────────────────────────────────

const TicketSchema = new Schema<ITicket>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event", // Tells Mongoose this references the Event model
      required: [true, "Event reference is required"],
      index: true, // Index for fast lookups: "all tickets for event X"
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Tells Mongoose this references the User model
      required: [true, "User reference is required"],
      index: true, // Index for fast lookups: "all tickets for user X"
    },

    secureToken: {
      type: String,
      required: [true, "Secure token is required"],
      /**
       * unique: true creates a unique index.
       * If two requests somehow try to create tickets with the same token
       * (astronomically unlikely with UUID v4), MongoDB rejects the second.
       */
      unique: true,
      index: true, // Most queried field during QR scanning
    },

    status: {
      type: String,
      enum: {
        values: ["VALID", "USED"],
        message: "Status must be VALID or USED",
      },
      default: "VALID",
      required: true,
    },

    paymentIntentId: {
      type: String,
      required: [true, "Payment Intent ID is required"],
      /**
       * unique: true here is a CRITICAL security measure.
       * It prevents the webhook from creating duplicate tickets if Stripe
       * sends the webhook event more than once (which CAN happen).
       * The second attempt will fail with a MongoDB duplicate key error,
       * which we catch and handle gracefully.
       */
      unique: true,
      index: true,
    },

    stripeSessionId: {
      type: String,
      required: [true, "Stripe Session ID is required"],
      index: true,
    },

    qrCodeData: {
      type: String,
      required: [true, "QR code data is required"],
      // This will be a long base64 string — no length restriction
    },

    scannedAt: {
      type: Date,
      default: null, // null = not yet scanned
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [10, "Cannot purchase more than 10 tickets at once"],
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound Indexes ─────────────────────────────────────────────────────────

/**
 * Compound index on userId + eventId.
 * Optimizes the common query: "Did this user already buy a ticket for this event?"
 * Also useful for: "Show me all tickets for user X at event Y"
 */
TicketSchema.index({ userId: 1, eventId: 1 });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;