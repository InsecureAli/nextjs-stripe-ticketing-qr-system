/**
 * User Model
 *
 * Stores application users. Role determines what they can access:
 * - CUSTOMER: Can browse events, buy tickets, view their QR codes
 * - ADMIN: Can access the /scanner route and manage events
 *
 * SECURITY NOTE on passwords:
 * We NEVER store plain-text passwords. Passwords are hashed with bcrypt
 * (cost factor 12) before being saved. The `select: false` on the
 * password field means it is EXCLUDED from queries by default —
 * you must explicitly request it with .select('+password')
 */

import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// ─── TypeScript Interface ─────────────────────────────────────────────────────
// Defines the shape of a User document in TypeScript
// `Document` from Mongoose adds _id, save(), etc.

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string; // Stored as bcrypt hash, never plain text
  role: "CUSTOMER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
  // Instance method: compares a plain password against the stored hash
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── Schema Definition ────────────────────────────────────────────────────────

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true, // Removes leading/trailing whitespace automatically
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Creates a unique index in MongoDB — no duplicate emails
      lowercase: true, // Normalizes to lowercase before saving (foo@Bar.COM → foo@bar.com)
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      /**
       * select: false
       * This is a CRITICAL security feature.
       * When you do User.findOne({email}), the password field will NOT
       * be included in the result by default.
       * To include it: User.findOne({email}).select('+password')
       */
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ["CUSTOMER", "ADMIN"],
        message: "Role must be either CUSTOMER or ADMIN",
      },
      default: "CUSTOMER", // All new registrations start as customers
    },
  },
  {
    /**
     * timestamps: true
     * Automatically adds and manages two fields:
     * - createdAt: Set once when document is first created
     * - updatedAt: Updated automatically every time the document is saved
     */
    timestamps: true,
  }
);

// ─── Pre-Save Middleware (Password Hashing) ───────────────────────────────────

/**
 * This hook runs BEFORE every .save() call on a User document.
 *
 * WHY isModified('password')?
 * Without this check, if a user updates their name, the password would be
 * hashed AGAIN (double-hashed), making it impossible to log in.
 * We only hash when the password field has actually changed.
 *
 * Cost factor 12: A number that determines how computationally expensive
 * the hash is. Higher = more secure but slower.
 * 12 is the current industry recommendation (takes ~300ms to hash).
 */
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const saltRounds = 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * comparePassword(candidatePassword)
 *
 * Used during login to verify the entered password against the stored hash.
 * bcrypt.compare() handles the salt extraction automatically.
 *
 * Usage:
 *   const user = await User.findOne({ email }).select('+password');
 *   const isValid = await user.comparePassword('enteredPassword');
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Model Export ─────────────────────────────────────────────────────────────

/**
 * WHY the mongoose.models.User || mongoose.model(...) pattern?
 *
 * In Next.js development, hot-reloading re-executes module code.
 * Without this guard, Mongoose would throw:
 *   "Cannot overwrite `User` model once compiled"
 * The check says: "If the model already exists, use it. Otherwise, create it."
 */
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;