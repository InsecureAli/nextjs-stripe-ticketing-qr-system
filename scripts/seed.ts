/**
 * Database Seeder Script
 * 
 * Run with: npx ts-node scripts/seed.ts
 * OR with: npx tsx scripts/seed.ts
 * 
 * This creates:
 * 1. An ADMIN user account
 * 2. Sample concert events
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI || MONGODB_URI.includes("YOUR_")) {
  console.error("❌ Please set a real MONGODB_URI in .env.local");
  process.exit(1);
}

// ─── Inline Schemas (avoid import issues in scripts) ─────────────────────────

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, enum: ["CUSTOMER", "ADMIN"], default: "CUSTOMER" },
}, { timestamps: true });

const EventSchema = new mongoose.Schema({
  name: String,
  description: String,
  venue: String,
  date: Date,
  imageUrl: String,
  totalCapacity: Number,
  availableTickets: Number,
  price: Number,
  currency: { type: String, default: "usd" },
}, { timestamps: true });

// ─── Sample Data ──────────────────────────────────────────────────────────────

const sampleEvents = [
  {
    name: "Neon Horizon — Electronic Music Festival",
    description: `Experience the future of electronic music at Neon Horizon, a one-night spectacular featuring the world's top DJs and producers. Immersive LED installations, three stages, and an unforgettable light show await you.\n\nLineup includes headliners from Europe and North America, with back-to-back sets that go until sunrise. Food vendors, chill zones, and VIP areas available.`,
    venue: "Madison Square Garden, New York, NY",
    date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
    totalCapacity: 500,
    availableTickets: 500,
    price: 7500, // $75.00
    currency: "usd",
  },
  {
    name: "The Midnight — Synthwave Live Tour",
    description: `The Midnight brings their critically acclaimed synthwave sound to life in a fully live band performance. Known for their nostalgic 80s-inspired soundscapes and emotional storytelling, this is a night you will not forget.\n\nFeaturing songs from their latest album plus fan favorites from the entire discography. Special guest openers TBA.`,
    venue: "O2 Arena, London, UK",
    date: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22 days from now
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800",
    totalCapacity: 300,
    availableTickets: 300,
    price: 5500, // $55.00
    currency: "usd",
  },
  {
    name: "Jazz Under the Stars — Summer Series",
    description: `An intimate outdoor jazz experience under the open sky. Featuring award-winning jazz musicians performing classic standards and original compositions in the beautiful outdoor amphitheater setting.\n\nBring a blanket, enjoy craft cocktails from our bar, and let the music wash over you. This is a seated event with limited capacity for an exclusive experience.`,
    venue: "Hollywood Bowl, Los Angeles, CA",
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800",
    totalCapacity: 150,
    availableTickets: 150,
    price: 4500, // $45.00
    currency: "usd",
  },
  {
    name: "Rock Revolution — Alternative & Indie Night",
    description: `Four bands. One legendary night. Rock Revolution brings together the hottest names in alternative and indie rock for an explosive evening of live music, crowd energy, and raw talent.\n\nDoors open at 6PM. First act at 7PM. Headliner takes the stage at 10PM. Standing floor and seated balcony options available. All ages welcome.`,
    venue: "The Roundhouse, Manchester, UK",
    date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    imageUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
    totalCapacity: 400,
    availableTickets: 400,
    price: 3500, // $35.00
    currency: "usd",
  },
  {
    name: "Classical Nights — Symphony Orchestra Gala",
    description: `The City Symphony Orchestra presents an elegant evening of classical masterpieces. The program includes Beethoven's 5th Symphony, Mozart's Piano Concerto No. 21, and a world premiere composition by our resident composer.\n\nBlack tie optional. Champagne reception begins at 6:30PM. Performance begins at 8PM sharp. Post-show meet and greet with the conductor included.`,
    venue: "Carnegie Hall, New York, NY",
    date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800",
    totalCapacity: 200,
    availableTickets: 200,
    price: 12000, // $120.00
    currency: "usd",
  },
  {
    name: "Hip Hop Heroes — Greatest Hits Live",
    description: `The biggest names in hip hop come together for one epic night celebrating 30 years of the genre's greatest hits. Expect surprise guest appearances, live DJ sets, and a show production like nothing you have ever seen.\n\nGeneral admission floor, VIP tables, and premium seating available. This show sells out every year — get your tickets early.`,
    venue: "Crypto.com Arena, Los Angeles, CA",
    date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
    imageUrl: "https://images.unsplash.com/photo-1571816119607-8d48e2e44951?w=800",
    totalCapacity: 100,
    availableTickets: 12, // Almost sold out for urgency
    price: 9500, // $95.00
    currency: "usd",
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log("\n🌱 Starting database seed...\n");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get or create models
    const User = mongoose.models.User || mongoose.model("User", UserSchema);
    const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

    // ── Create Admin User ───────────────────────────────────────────────────
    const adminEmail = "admin@concerttix.com";
    const adminPassword = "Admin1234!";

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await User.create({
        name: "Admin User",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
      });
      console.log("✅ Admin user created:");
      console.log(`   Email:    ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   Role:     ADMIN\n`);
    }

    // ── Create Sample Events ────────────────────────────────────────────────
    const existingEvents = await Event.countDocuments();

    if (existingEvents > 0) {
      console.log(`ℹ️  ${existingEvents} events already exist — skipping event creation`);
      console.log(`   Delete them in MongoDB Atlas to re-seed\n`);
    } else {
      await Event.insertMany(sampleEvents);
      console.log(`✅ Created ${sampleEvents.length} sample events:\n`);
      sampleEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.name}`);
        console.log(`      Price: $${(event.price / 100).toFixed(2)} | Capacity: ${event.totalCapacity}`);
      });
    }

    console.log("\n✅ Seed complete!\n");
    console.log("═══════════════════════════════════════════");
    console.log("  ADMIN LOGIN CREDENTIALS:");
    console.log("  Email:    admin@concerttix.com");
    console.log("  Password: Admin1234!");
    console.log("  URL:      http://localhost:3000/auth/signin");
    console.log("═══════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Seed failed:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();