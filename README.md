<div align="center">

# 🎵 ConcertTix

### Secure Full-Stack Concert Ticketing System with QR Code Entry Validation

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-purple?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

<br />

![ConcertTix Preview](https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=400&fit=crop)

<br />

**Browse concerts → Buy tickets securely via Stripe → Get unique QR codes → Scan at venue gate**

[View Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Core Security Principle](#-core-security-principle)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [Running With ngrok (Phone Scanner)](#-running-with-ngrok-phone-scanner)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Admin Guide](#-admin-guide)
- [Testing Payments](#-testing-payments)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About The Project

ConcertTix is a secure full-stack concert ticket booking and QR-based venue entry validation platform. Customers browse upcoming concerts, purchase tickets securely through Stripe, and receive unique QR codes instantly after payment confirmation. Door staff use any smartphone to scan QR codes and validate entry in real time.

### The Problem It Solves

| Problem | Solution |
|---|---|
| Ticket fraud (fake PDFs) | UUIDv4 tokens with 122 bits of randomness |
| Duplicate entry (shared QR) | Atomic VALID → USED status update |
| Manual paper checking | Digital smartphone scanner |
| Overselling | Atomic MongoDB inventory decrement |
| Multi-ticket confusion | One QR code per seat (5 tickets = 5 QR codes) |
| Delayed ticket delivery | QR generated within seconds of payment |

---

## 🔐 Core Security Principle
A QR code is ONLY generated AFTER Stripe cryptographically
confirms payment via a signed webhook event.

No payment = No QR code. No exceptions.

text


The webhook is verified using HMAC-SHA256 signature before any code executes. Forged requests are rejected immediately with a 400 status.

---

## ✨ Features

### Customer Features
- 🎵 Browse all upcoming concerts with images and real-time availability
- 🛒 Select ticket quantity (1 to 10 per purchase)
- 💳 Secure Stripe-hosted checkout (card data never touches our server)
- 🎫 **Individual QR code per seat** (buying 5 tickets = 5 separate QR codes)
- 📱 Personal dashboard with all tickets and seat numbers
- 👁️ Toggle QR visibility for security in public places
- ✅ Real-time ticket status (VALID or USED with timestamp)

### Admin Features
- 📊 Admin dashboard with live statistics (events, tickets, revenue)
- ➕ Create, edit, and delete concert events
- 📋 Events table with ticket sales progress bars
- 🔍 QR scanner interface for any smartphone
- 🟢🟠🔴 Color-coded scan results (green/orange/red)
- 📍 Scan result shows event, venue, seat number, and timestamp

### Security Features
- 🔒 Stripe HMAC-SHA256 webhook signature verification
- ♻️ One-time QR codes with atomic database update
- 👮 Role-based route protection (CUSTOMER vs ADMIN)
- 🔑 bcrypt password hashing (cost factor 12)
- 🍪 JWT session encryption with secret key
- 🛡️ Duplicate ticket prevention via unique indexes
- ⚡ Atomic inventory decrement prevents overselling

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 | Full-stack React framework with App Router |
| React | 19 | UI component library |
| TypeScript | 5 | Static typing across all files |
| Tailwind CSS | 4 | Utility-first styling |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 16 | Server-side API endpoints |
| NextAuth.js | 4 | Authentication with JWT sessions |
| Mongoose | 8 | MongoDB ODM with schema definitions |
| Stripe SDK | 17 | Payment processing and webhook verification |

### QR System
| Package | Purpose |
|---|---|
| qrcode | Server-side QR code generation (PNG base64) |
| uuid | UUIDv4 cryptographic token generation |
| jsqr | Client-side QR decoding (works on iPhone Safari) |
| bcryptjs | Password hashing and comparison |

### Services
| Service | Purpose |
|---|---|
| MongoDB Atlas | Cloud database (free M0 tier) |
| Stripe | Payment processing (test mode) |
| Stripe CLI | Local webhook forwarding during development |
| ngrok | HTTPS tunnel for phone camera access |

---

## 📦 Prerequisites

Before you begin, make sure you have:

- **Node.js** 18 or higher — [Download](https://nodejs.org/)
- **MongoDB Atlas** account (free) — [Sign up](https://www.mongodb.com/atlas)
- **Stripe** account (free test mode) — [Sign up](https://stripe.com/)
- **Stripe CLI** — [Download](https://stripe.com/docs/stripe-cli)
- **ngrok** (for phone testing) — [Download](https://ngrok.com/download)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/concert-ticketing-system
cd concert-ticketing-system
2. Install Dependencies
Bash

npm install
3. Set Up Environment Variables
Bash

# Copy the example file
cp .env.example .env.local

# Edit .env.local with your real values
# See Environment Variables section below
4. Seed the Database
Bash

# Run ONCE to create admin user and 6 sample events
npm run seed
Output:

text

✅ Connected to MongoDB
✅ Admin user created:
   Email:    admin@concerttix.com
   Password: Admin1234!
✅ Created 6 sample events
✅ Seed complete!
⚙️ Environment Variables
Create a .env.local file at the project root:

Bash

# ============================================
# DATABASE
# ============================================
# Get from: MongoDB Atlas → Connect → Drivers
# IMPORTANT: Include /concert_ticketing before the ?
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/concert_ticketing?retryWrites=true&w=majority

# ============================================
# NEXTAUTH
# ============================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_32_character_string_here

# For local development:
NEXTAUTH_URL=http://localhost:3000
# For ngrok (phone testing):
# NEXTAUTH_URL=https://yourname.ngrok-free.app

# ============================================
# STRIPE
# ============================================
# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Get from: running "stripe listen" command output
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
Getting Each Value
<details> <summary><b>MongoDB URI</b></summary>
Go to MongoDB Atlas
Click Connect on your cluster
Choose Drivers → Node.js
Copy the connection string
Replace <password> with your database user password
Add /concert_ticketing before the ?
text

mongodb+srv://user:pass@cluster.net/concert_ticketing?retryWrites=true
</details><details> <summary><b>NEXTAUTH_SECRET</b></summary>
Run this in your terminal:

Bash

openssl rand -base64 32
Copy the output and paste it as your secret.

</details><details> <summary><b>Stripe Keys</b></summary>
Go to Stripe Dashboard
Make sure Test mode is enabled
Copy Publishable key (pk_test_...)
Click Reveal test key for Secret key (sk_test_...)
</details><details> <summary><b>Stripe Webhook Secret</b></summary>
Run the Stripe CLI and copy the whsec_... value:

Bash

stripe listen --forward-to localhost:3000/api/webhooks/stripe
# > Ready! Your webhook signing secret is whsec_abc123...
</details>
💻 Running the Project
Development Mode (Desktop Only)
Open 2 terminals:

Bash

# Terminal 1 — Start Next.js
npm run dev

# Terminal 2 — Start Stripe webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe
Open your browser at http://localhost:3000

Production Mode (Required for Phone Testing)
Open 3 terminals:

Bash

# Terminal 1 — Build and start production server
npm run build
npm run start

# Terminal 2 — Start ngrok tunnel
ngrok http --domain=yourname.ngrok-free.app 3000

# Terminal 3 — Start Stripe with ngrok URL
stripe listen --forward-to https://yourname.ngrok-free.app/api/webhooks/stripe
📱 Running With ngrok (Phone Scanner)
ngrok creates a public HTTPS URL for your local server. This is required because:

iPhone Safari requires HTTPS for camera access
Your phone cannot reach localhost (it only exists on your computer)
One-Time ngrok Setup
Bash

# 1. Download ngrok from https://ngrok.com/download

# 2. Create free account at https://ngrok.com

# 3. Authenticate (get token from https://dashboard.ngrok.com/authtokens)
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 4. Create FREE permanent domain
# Go to: https://dashboard.ngrok.com/domains
# Click "New Domain" — you get: yourname.ngrok-free.app
# This URL NEVER changes — set it once and forget it
Update .env.local for ngrok
Bash

# Change this line to your ngrok domain
NEXTAUTH_URL=https://yourname.ngrok-free.app
Daily Startup Sequence
Bash

# Terminal 1
npm run build && npm run start

# Terminal 2
ngrok http --domain=yourname.ngrok-free.app 3000

# Terminal 3
stripe listen --forward-to https://yourname.ngrok-free.app/api/webhooks/stripe
Access URLs
URL	Purpose
https://yourname.ngrok-free.app	Main app (any device)
https://yourname.ngrok-free.app/scanner	QR scanner for door staff
https://yourname.ngrok-free.app/admin	Admin dashboard
http://localhost:3000	Local access on your computer
Phone Scanner Usage
text

1. Open Chrome (Android) or Safari (iPhone)
2. Go to: https://yourname.ngrok-free.app/scanner
3. Login as admin
4. Tap "Start Scanner"
5. Tap "Allow" when camera permission is requested
6. Point camera at attendee QR code
7. Result appears in under 1 second
🔄 How It Works
Purchase Flow
text

Customer clicks "Buy Ticket"
         ↓
POST /api/checkout creates Stripe Checkout Session
with metadata: { userId, eventId, quantity }
         ↓
Customer redirected to Stripe-hosted payment page
(card data never touches our server)
         ↓
Customer completes payment
         ↓
Stripe sends webhook to POST /api/webhooks/stripe
(signed with HMAC-SHA256 — verified before processing)
         ↓
For each seat purchased:
  → Generate UUIDv4 secure token
  → Generate QR code PNG image
  → Save Ticket document to MongoDB (status: VALID)
  → Decrement event.availableTickets atomically
         ↓
Customer visits /dashboard
Individual QR codes appear for each seat ✅
Scanning Flow
text

Door staff opens /scanner on phone
         ↓
jsQR library decodes QR code via camera
         ↓
POST /api/scanner/validate { token: "uuid..." }
         ↓
Verify staff is logged in as ADMIN
         ↓
MongoDB findByIdAndUpdate:
  { secureToken: token } → { status: "USED", scannedAt: now }
         ↓
✅ GREEN  → Ticket was VALID → Now marked USED → Let in
⚠️ ORANGE → Ticket was already USED → Deny entry
❌ RED    → Token not in database → Fake ticket → Deny
📁 Project Structure
text

concert-ticketing/
│
├── .env.local                    # Secret environment variables
├── .env.example                  # Template showing required vars
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and npm scripts
│
├── scripts/
│   └── seed.ts                   # Database seeder (run once)
│
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx            # Root layout with providers
    │   ├── page.tsx              # Home page (event listing)
    │   ├── globals.css           # Global styles
    │   │
    │   ├── auth/
    │   │   ├── signin/page.tsx   # Login page
    │   │   └── register/page.tsx # Registration page
    │   │
    │   ├── events/[eventId]/
    │   │   ├── page.tsx          # Event detail and buy page
    │   │   └── BuyTicketButton   # Stripe redirect handler
    │   │
    │   ├── checkout/
    │   │   ├── success/page.tsx  # Payment success page
    │   │   └── cancel/page.tsx   # Payment cancelled page
    │   │
    │   ├── dashboard/page.tsx    # User tickets with QR codes
    │   │
    │   ├── scanner/
    │   │   ├── page.tsx          # Auth guard wrapper
    │   │   └── QRScannerClient   # Camera scanner component
    │   │
    │   ├── admin/
    │   │   ├── layout.tsx        # Admin sidebar layout
    │   │   ├── page.tsx          # Stats dashboard
    │   │   └── events/           # Event management pages
    │   │
    │   └── api/
    │       ├── auth/             # NextAuth + registration
    │       ├── events/           # CRUD endpoints
    │       ├── checkout/         # Stripe session creation
    │       ├── webhooks/stripe/  # Payment webhook handler
    │       ├── tickets/          # User tickets endpoint
    │       └── scanner/validate/ # QR validation endpoint
    │
    ├── components/
    │   ├── Providers.tsx         # SessionProvider wrapper
    │   ├── Navbar.tsx            # Responsive navigation
    │   ├── EventCard.tsx         # Concert event card
    │   ├── TicketCard.tsx        # Ticket with QR display
    │   └── admin/EventForm.tsx   # Create/edit event form
    │
    ├── lib/
    │   ├── db/mongoose.ts        # MongoDB connection singleton
    │   ├── models/User.ts        # User Mongoose schema
    │   ├── models/Event.ts       # Event Mongoose schema
    │   ├── models/Ticket.ts      # Ticket Mongoose schema
    │   ├── auth/authOptions.ts   # NextAuth configuration
    │   └── stripe/stripeClient   # Stripe SDK initialization
    │
    └── types/
        └── next-auth.d.ts        # NextAuth type extensions
📡 API Endpoints
Method	Endpoint	Auth	Description
POST	/api/auth/register	None	Create new account
POST	/api/auth/signin	None	Login with email/password
GET	/api/auth/session	None	Get current session
GET	/api/events	None	List upcoming events
POST	/api/events	ADMIN	Create new event
GET	/api/events/[id]	None	Get single event
PATCH	/api/events/[id]	ADMIN	Update event
DELETE	/api/events/[id]	ADMIN	Delete event
POST	/api/checkout	Login	Create Stripe session
POST	/api/webhooks/stripe	Stripe	Payment confirmation
GET	/api/tickets	Login	Get user's tickets
POST	/api/scanner/validate	ADMIN	Validate QR token
🗄️ Database Schema
Users Collection
TypeScript

{
  _id: ObjectId,
  name: String,
  email: String,        // unique, lowercase
  password: String,     // bcrypt hash, select: false
  role: "CUSTOMER" | "ADMIN",
  createdAt: Date,
  updatedAt: Date
}
Events Collection
TypeScript

{
  _id: ObjectId,
  name: String,
  description: String,
  venue: String,
  date: Date,
  imageUrl: String,
  totalCapacity: Number,
  availableTickets: Number,  // decremented atomically on purchase
  price: Number,             // in cents (4500 = $45.00)
  currency: String,          // "usd", "gbp", "eur"
  createdAt: Date,
  updatedAt: Date
}
Tickets Collection
TypeScript

{
  _id: ObjectId,
  eventId: ObjectId,         // ref: Event
  userId: ObjectId,          // ref: User
  secureToken: String,       // UUIDv4, unique — the QR payload
  status: "VALID" | "USED",
  paymentIntentId: String,   // unique — prevents duplicate tickets
  stripeSessionId: String,
  qrCodeData: String,        // base64 PNG image
  quantity: 1,               // always 1 per document
  ticketNumber: Number,      // seat number (1, 2, 3...)
  totalInOrder: Number,      // total seats in this purchase
  scannedAt: Date | null,    // when the QR was scanned
  createdAt: Date,
  updatedAt: Date
}
👨‍💼 Admin Guide
Accessing the Admin Panel
text

URL:      http://localhost:3000/admin
Email:    admin@concerttix.com
Password: Admin1234!
Creating an Event
text

1. Go to /admin/events/new
2. Fill in:
   - Event Name
   - Description
   - Venue
   - Date and Time
   - Total Capacity
   - Price (in dollars, e.g. 45.99)
   - Currency
   - Image URL (use Unsplash URLs)
3. Click Create Event
4. Event appears on the home page immediately
Using the Scanner
text

1. Go to /scanner on your phone (use ngrok URL for phone)
2. Login as admin
3. Tap Start Scanner
4. Allow camera permission
5. Point camera at attendee QR code
6. Read the result:
   GREEN  = Valid ticket — let them in
   ORANGE = Already scanned — deny entry  
   RED    = Invalid/fake — deny entry
7. Tap Scan Next Ticket to continue
💳 Testing Payments
Stripe Test Cards
Card Number	Result
4242 4242 4242 4242	✅ Payment succeeds
4000 0000 0000 0002	❌ Card declined
4000 0000 0000 9995	❌ Insufficient funds
4000 0000 0000 0069	❌ Expired card
For all test cards use:

Expiry: Any future date (e.g. 12/34)
CVC: Any 3 digits (e.g. 123)
ZIP: Any 5 digits (e.g. 12345)
Complete Test Flow
text

1. Register a customer account
2. Browse events on the home page
3. Click an event → View event detail
4. Select quantity → Click Buy Ticket
5. Use card: 4242 4242 4242 4242 | 12/34 | 123
6. Complete payment on Stripe checkout page
7. Redirected to /checkout/success
8. Go to /dashboard
9. Your individual QR codes appear (one per seat)
10. Open /scanner as admin
11. Scan each QR code to validate entry
🔧 Troubleshooting
Common Issues
<details> <summary><b>MONGODB_URI error on startup</b></summary>
Make sure your connection string includes the database name:

text

# Wrong — missing database name
mongodb+srv://user:pass@cluster.net/?retry...

# Correct — concert_ticketing included
mongodb+srv://user:pass@cluster.net/concert_ticketing?retry...
</details><details> <summary><b>Login says "Invalid email or password"</b></summary>
Run the fix script: node moveadmin.js
Check your MONGODB_URI includes /concert_ticketing
Restart the server after any .env.local changes
</details><details> <summary><b>Stripe webhook returning 400</b></summary>
Your STRIPE_WEBHOOK_SECRET does not match the CLI output.

Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe
Copy the whsec_... value shown
Update .env.local with the exact value
Restart the server
</details><details> <summary><b>QR code not generating after payment</b></summary>
Check Terminal 1 for webhook logs. Common causes:

Stripe CLI not running (Terminal 2)
Wrong STRIPE_WEBHOOK_SECRET in .env.local
Metadata missing from Stripe session (userId, eventId)
</details><details> <summary><b>Camera not working on iPhone</b></summary>
iPhone requires HTTPS for camera access.

Must use ngrok (provides HTTPS automatically)
Cannot use http://localhost:3000 on iPhone
Make sure you are in Safari on iPhone
Go to iPhone Settings → Safari → Camera → Allow
</details><details> <summary><b>Scanner shows "An error occurred"</b></summary>
Check Terminal 1 for the exact error
Verify you are logged in as ADMIN not CUSTOMER
Test session: visit /api/auth/session on your phone
Make sure credentials: "include" is in the fetch call
</details><details> <summary><b>ngrok shows ERR_NGROK_3200</b></summary>
ngrok is not running. Start it:

Bash

ngrok http --domain=yourname.ngrok-free.app 3000
</details><details> <summary><b>Login works on desktop but not phone</b></summary>
NEXTAUTH_URL does not match your ngrok URL.

Check Terminal 2 for your exact ngrok URL
Update .env.local: NEXTAUTH_URL=https://your-url.ngrok-free.app
Rebuild: npm run build && npm run start
</details>
📜 Available Scripts
Bash

npm run dev      # Start development server (localhost only)
npm run build    # Build for production
npm run start    # Start production server (required for ngrok)
npm run lint     # Run ESLint code checks
npm run seed     # Seed database with admin + sample events (run once)
npm run prod     # Build and start in one command
🤝 Contributing
Contributions are welcome. Please follow these steps:

Bash

# 1. Fork the repository

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes

# 4. Commit with a clear message
git commit -m "Add: description of what you added"

# 5. Push to your fork
git push origin feature/your-feature-name

# 6. Open a Pull Request
Coding Standards
All files must be TypeScript
No any types without a comment explaining why
All API routes must have authentication checks
All database operations must have try/catch blocks
📊 Project Stats
text

Total Source Files        ~40 files
Languages                 TypeScript, CSS
npm Packages              24 packages
External Services         4 services
Database Collections      3 collections
API Endpoints             13 endpoints
Application Pages         12 pages
React Components          8 components
Security Measures         10 measures
🔮 Future Roadmap
 Email ticket delivery with QR code attachment
 PDF ticket download
 Google and Apple OAuth login
 Event search and filtering
 Stripe refund processing
 Waiting list for sold out events
 Promotional discount codes
 Admin analytics dashboard with charts
 React Native mobile app
 Seat map selection
📄 License
This project is licensed under the MIT License.

text

MIT License

Copyright (c) 2026 ConcertTix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
🙏 Acknowledgements
Next.js — The React framework
Stripe — Payment processing
MongoDB Atlas — Cloud database
NextAuth.js — Authentication
Tailwind CSS — Styling
ngrok — HTTPS tunneling
jsQR — QR code decoding
<div align="center">
Built with ❤️ using Next.js, MongoDB, and Stripe

⭐ Star this repo if you found it helpful

</div>
