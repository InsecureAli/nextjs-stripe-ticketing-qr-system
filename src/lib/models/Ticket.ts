import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  secureToken: string;
  status: "VALID" | "USED";
  paymentIntentId: string;
  stripeSessionId: string;
  qrCodeData: string;
  quantity: number;
  ticketNumber: number;    // Which seat number (1, 2, 3...)
  totalInOrder: number;    // How many were bought together
  scannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    secureToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["VALID", "USED"],
      default: "VALID",
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      index: true,
    },
    qrCodeData: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    ticketNumber: {
      type: Number,
      default: 1,  // Which seat in the order
    },
    totalInOrder: {
      type: Number,
      default: 1,  // How many seats were bought together
    },
    scannedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

TicketSchema.index({ userId: 1, eventId: 1 });
TicketSchema.index({ stripeSessionId: 1 });

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;