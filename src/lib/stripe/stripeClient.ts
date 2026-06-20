import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key || key === "sk_test_YOUR_STRIPE_SECRET_KEY" || !key.startsWith("sk_")) {
  throw new Error(
    "❌ STRIPE_SECRET_KEY is missing or still a placeholder.\n" +
    "Get your real key from: https://dashboard.stripe.com/test/apikeys\n" +
    "Then add it to .env.local as STRIPE_SECRET_KEY=sk_test_..."
  );
}

const stripe = new Stripe(key, {
  apiVersion: "2025-05-28.basil",
  typescript: true,
});

export default stripe;