/**
 * MongoDB Connection Singleton
 *
 * WHY A SINGLETON?
 * ─────────────────
 * Next.js API routes run in a serverless environment. Without a singleton,
 * every single API request would open a NEW database connection, quickly
 * exhausting MongoDB's connection limit (512 on free tier).
 *
 * The singleton pattern caches the connection on the `global` object,
 * which persists between hot-reloads in development and is reused
 * across invocations in production serverless functions.
 */

import dns from "dns";
import mongoose from "mongoose";

// Some Windows networks fail SRV lookups via the default DNS resolver.
// Public DNS servers allow MongoDB Atlas `mongodb+srv://` URIs to resolve.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// The MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI as string;

// Guard: Crash immediately if URI is missing, not silently fail later
if (!MONGODB_URI) {
  throw new Error(
    "❌ MONGODB_URI is not defined in .env.local\n" +
      "Please add it: MONGODB_URI=mongodb+srv://..."
  );
}

console.log("📦 Database URI (masked):", MONGODB_URI.replace(/:([^@]+)@/, ':****@'));


if (
  MONGODB_URI.includes("YOUR_USERNAME") ||
  MONGODB_URI.includes("YOUR_PASSWORD") ||
  MONGODB_URI.includes("xxxxx")
) {
  throw new Error(
    "❌ MONGODB_URI in .env.local still uses placeholder values.\n" +
      "Copy your real connection string from MongoDB Atlas → Connect → Drivers."
  );
}

function getMongoUri(): string {
  const uri = MONGODB_URI;

  // Ensure a database name is present in the URI
  if (/mongodb(\+srv)?:\/\/[^/]+\/?(\?|$)/.test(uri)) {
    return uri.replace(/\/?(\?|$)/, "/concert_ticketing$1");
  }

  return uri;
}

/**
 * We extend the NodeJS Global type to hold our cached connection.
 * This is a TypeScript requirement — global is typed, so we must
 * declare our custom property to avoid type errors.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null; // The active Mongoose connection (or null)
    promise: Promise<typeof mongoose> | null; // Pending connection promise (or null)
  };
}

// Initialize the cache on global if it doesn't exist
// This runs once when the module is first loaded
if (!global.mongooseCache) {
  global.mongooseCache = {
    conn: null,
    promise: null,
  };
}

// Reference the global cache in a local variable for convenience
const cached = global.mongooseCache;

/**
 * connectToDatabase()
 *
 * Call this at the top of every API route handler that needs DB access.
 * It will either:
 *   1. Return the existing cached connection immediately, OR
 *   2. Create a new connection, cache it, then return it
 *
 * @returns Promise<typeof mongoose> - The active Mongoose instance
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // CASE 1: We already have a live connection — return it instantly
  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  // CASE 2: A connection is being established (another request beat us here)
  // Wait for that promise to resolve instead of creating a duplicate connection
  if (!cached.promise) {
    // CASE 3: First time — create the connection
    const mongooseOptions = {
      /**
       * bufferCommands: false
       * By default, Mongoose buffers commands when the connection is down
       * and executes them when reconnected. We disable this to get
       * immediate errors if the DB is unreachable (better for debugging).
       */
      bufferCommands: false,
    };

    console.log("🔄 Creating new MongoDB connection...");

    // Store the promise (not the result) so other simultaneous requests
    // can await the SAME connection attempt
    cached.promise = mongoose
      .connect(getMongoUri(), mongooseOptions)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((error) => {
        // If connection fails, clear the promise so the next request tries again
        cached.promise = null;
        console.error("❌ MongoDB connection failed:", error);
        throw error;
      });
  }

  // Await the pending connection promise and cache the result
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;