import Link from "next/link";

// Shape of an event object passed as prop
interface EventCardProps {
  event: {
    _id: string;
    name: string;
    date: string;
    venue: string;
    imageUrl: string;
    availableTickets: number;
    price: number;
    currency: string;
  };
}

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
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

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-purple-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20 group">

      {/* Event Image */}
      <div className="relative h-48 bg-gradient-to-br from-purple-900 to-gray-800 overflow-hidden">
        {event.imageUrl && event.imageUrl !== "/images/default-concert.jpg" ? (
          <img
            src={event.imageUrl}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // Default gradient placeholder when no image
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">🎸</span>
          </div>
        )}

        {/* Sold Out Badge */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-red-600 text-white font-bold px-4 py-2 rounded-full text-sm uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-full">
          {formattedPrice}
        </div>
      </div>

      {/* Event Details */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
          {event.name}
        </h3>

        {/* Date */}
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedDate} at {formattedTime}</span>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span className="line-clamp-1">{event.venue}</span>
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            isSoldOut
              ? "bg-red-900/50 text-red-400"
              : event.availableTickets < 20
              ? "bg-yellow-900/50 text-yellow-400"
              : "bg-green-900/50 text-green-400"
          }`}>
            {isSoldOut
              ? "Sold Out"
              : event.availableTickets < 20
              ? `⚡ Only ${event.availableTickets} left`
              : `${event.availableTickets} tickets available`}
          </span>

          {/* View Details Button */}
          <Link
            href={`/events/${event._id}`}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              isSoldOut
                ? "bg-gray-700 text-gray-500 cursor-not-allowed pointer-events-none"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            {isSoldOut ? "Sold Out" : "View"}
          </Link>
        </div>
      </div>
    </div>
  );
}