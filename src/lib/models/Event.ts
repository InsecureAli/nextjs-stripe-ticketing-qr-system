/**
 * Event Model
 *
 * Represents a concert or performance that users can buy tickets for.
 *
 * KEY DESIGN DECISIONS:
 * ─────────────────────
 * 1. availableTickets: We track this separately from totalCapacity so we can
 *    quickly check "is this event sold out?" without counting Ticket documents.
 *
 * 2. Atomic decrement: When a ticket is purchased, we use MongoDB's $inc operator
 *    to decrement availableTickets atomically, preventing race conditions
 *    (two users buying the last ticket simultaneously).
 *
 * 3. price is stored in CENTS (smallest currency unit):
 *    $29.99 is stored as 2999
 *    This matches Stripe's convention and avoids floating-point math errors.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

// ─── TypeScript Interface ─────────────────────────────────────────────────────

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  venue: string;
  date: Date;
  imageUrl: string;
  totalCapacity: number;
  availableTickets: number; // Decremented on each successful purchase
  price: number; // In cents! (e.g., 2999 = $29.99)
  currency: string; // ISO 4217 currency code (e.g., "usd", "gbp")
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema Definition ────────────────────────────────────────────────────────

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: [100, "Event name cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    venue: {
      type: String,
      required: [true, "Venue is required"],
      trim: true,
    },

    date: {
      type: Date,
      required: [true, "Event date is required"],
      // Validate that the event is set in the future when created
      validate: {
        validator: function (value: Date) {
          const doc = this as IEvent;
          if (doc.isNew) {
            return value > new Date();
          }
          return true;
        },
        message: "Event date must be in the future",
      },
    },

    imageUrl: {
      type: String,
      default: "/images/default-concert.jpg",
    },

    totalCapacity: {
      type: Number,
      required: [true, "Total capacity is required"],
      min: [1, "Capacity must be at least 1"],
      max: [100000, "Capacity seems unrealistically large"],
    },

    availableTickets: {
      type: Number,
      /**
       * Default: set equal to totalCapacity when event is created.
       * Note: We can't reference `this.totalCapacity` directly in a default
       * function for schema fields. We'll set this in the API route logic.
       */
      min: [0, "Available tickets cannot be negative"],
      validate: {
        validator: function (value: number) {
          const doc = this as IEvent;
          return value <= doc.totalCapacity;
        },
        message: "Available tickets cannot exceed total capacity",
      },
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      // Validate it's a whole number (cents, no decimals)
      validate: {
        validator: (value: number) => Number.isInteger(value),
        message: "Price must be in cents (whole number). E.g., $29.99 = 2999",
      },
    },

    currency: {
      type: String,
      required: true,
      default: "usd",
      lowercase: true,
      enum: ["usd", "gbp", "eur", "cad", "aud"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * Add an index on date for efficient "upcoming events" queries.
 * When we fetch events with date >= now, MongoDB uses this index
 * instead of scanning the entire collection.
 */
EventSchema.index({ date: 1 });

/**
 * Text index for search functionality (future feature).
 * Allows: Event.find({ $text: { $search: "rock concert" } })
 */
EventSchema.index({ name: "text", description: "text" });

// ─── Virtual Properties ───────────────────────────────────────────────────────

/**
 * isSoldOut - computed property (not stored in DB)
 * Usage: event.isSoldOut → true/false
 */
EventSchema.virtual("isSoldOut").get(function (this: IEvent) {
  return this.availableTickets === 0;
});

/**
 * priceFormatted - human-readable price
 * Usage: event.priceFormatted → "$29.99"
 */
EventSchema.virtual("priceFormatted").get(function (this: IEvent) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: this.currency.toUpperCase(),
  }).format(this.price / 100);
});

// Make virtuals appear when converting to JSON (for API responses)
EventSchema.set("toJSON", { virtuals: true });
EventSchema.set("toObject", { virtuals: true });

// ─── Model Export ─────────────────────────────────────────────────────────────

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

export default Event;