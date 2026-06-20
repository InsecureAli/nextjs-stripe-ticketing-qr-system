"use client";

/**
 * BuyTicketButton — Client Component
 *
 * Handles:
 * 1. Quantity selection (1-10 tickets)
 * 2. POST to /api/checkout to create Stripe Session
 * 3. Redirect to Stripe-hosted checkout page
 *
 * Separated from the page because it needs useState and event handlers.
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface BuyTicketButtonProps {
  eventId: string;
  pricePerTicket: number;
  currency: string;
  maxTickets: number;
}

export default function BuyTicketButton({
  eventId,
  pricePerTicket,
  currency,
  maxTickets,
}: BuyTicketButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((pricePerTicket * quantity) / 100);

  const handleBuyTickets = async () => {
    // If not logged in, redirect to sign in page
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/events/${eventId}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call our checkout API to create a Stripe session
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, quantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to start checkout");
        return;
      }

      // Redirect to Stripe-hosted checkout page
      // This takes the user completely to Stripe's domain
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Quantity Selector */}
      <div>
        <label className="text-gray-400 text-sm block mb-2">
          Number of Tickets
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
          >
            −
          </button>
          <span className="w-8 text-center text-white font-bold text-xl">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxTickets, q + 1))}
            disabled={quantity >= maxTickets}
            className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
          >
            +
          </button>
          <span className="text-gray-500 text-sm">
            (max {maxTickets})
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Buy Button */}
      <button
        onClick={handleBuyTickets}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirecting to Stripe...
          </>
        ) : (
          <>
            {session ? `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""} — ${totalPrice}` : "Sign In to Buy Tickets"}
          </>
        )}
      </button>
    </div>
  );
}