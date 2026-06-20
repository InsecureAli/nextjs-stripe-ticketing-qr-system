/**
 * Event Detail Page — /events/[eventId]
 *
 * Shows full event information and the "Buy Ticket" button.
 * The buy button triggers a POST to /api/checkout and redirects to Stripe.
 *
 * This is a mixed page:
 * - The page itself is a Server Component (fetches event data)
 * - The BuyButton is a Client Component (handles click + API call)
 */

import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import BuyTicketButton from "./BuyTicketButton";

// Fetch a single event from the database
async function getEvent(eventId: string) {
  try {
    await connectToDatabase();
    const event = await Event.findById(eventId).select("-__v").lean();
    if (!event) return null;
    return JSON.parse(JSON.stringify(event));
  } catch {
    return null;
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  // Show Next.js 404 page if event not found
  if (!event) {
    notFound();
  }

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = new Date(event.date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: event.currency.toUpperCase(),
  }).format(event.price / 100);

  const isSoldOut = event.availableTickets === 0;
  const isPast = new Date(event.date) < new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Back Link */}
      <a
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left Column: Event Image + Info */}
        <div className="lg:col-span-3 space-y-6">

          {/* Image */}
          <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-900 to-gray-800 rounded-2xl overflow-hidden">
            {event.imageUrl && event.imageUrl !== "/images/default-concert.jpg" ? (
              <img
                src={event.imageUrl}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-8xl">🎸</span>
              </div>
            )}
          </div>

          {/* Event Name */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {event.name}
          </h1>

          {/* Date, Time, Venue */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-10 h-10 bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">{formattedDate}</p>
                <p className="text-gray-500 text-sm">{formattedTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-10 h-10 bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <p className="font-semibold">{event.venue}</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-bold text-white mb-3">About this Event</h2>
            <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        </div>

        {/* Right Column: Purchase Box */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">

            {/* Price */}
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-1">Price per ticket</p>
              <p className="text-4xl font-extrabold text-white">
                {formattedPrice}
              </p>
            </div>

            {/* Availability */}
            <div className="mb-6 p-3 rounded-lg bg-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Available</span>
                <span className={`text-sm font-bold ${
                  isSoldOut ? "text-red-400" :
                  event.availableTickets < 20 ? "text-yellow-400" :
                  "text-green-400"
                }`}>
                  {isSoldOut ? "Sold Out" : `${event.availableTickets} tickets`}
                </span>
              </div>

              {/* Capacity bar */}
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isSoldOut ? "bg-red-500" :
                    event.availableTickets < 20 ? "bg-yellow-500" :
                    "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.max(2, (event.availableTickets / event.totalCapacity) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Buy Button or Status Message */}
            {isPast ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">This event has already taken place</p>
              </div>
            ) : isSoldOut ? (
              <div className="w-full bg-gray-700 text-gray-500 font-bold py-4 rounded-xl text-center cursor-not-allowed">
                Sold Out
              </div>
            ) : (
              /**
               * BuyTicketButton is a separate Client Component.
               * We pass eventId and price as props.
               * It handles: quantity selection, API call, redirect to Stripe.
               */
              <BuyTicketButton
                eventId={event._id}
                pricePerTicket={event.price}
                currency={event.currency}
                maxTickets={Math.min(10, event.availableTickets)}
              />
            )}

            {/* Security Note */}
            <p className="text-gray-600 text-xs text-center mt-4">
              🔒 Secured by Stripe. Your QR ticket is generated after payment confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}