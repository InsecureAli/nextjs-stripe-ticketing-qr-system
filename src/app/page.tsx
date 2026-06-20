import EventCard from "@/components/EventCard";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getEvents() {
  await connectToDatabase();
  const events = await Event.find({ date: { $gte: new Date() } })
    .sort({ date: 1 })
    .select("-__v")
    .lean();
  return JSON.parse(JSON.stringify(events));
}

export default async function HomePage() {
  const events = await getEvents();
  const featuredEvent = events[0];
  const remainingEvents = events.slice(1);

  return (
    <div className="min-h-screen">

      {/* ── HERO SECTION ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center max-w-3xl mx-auto">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-950/80 border border-purple-800/50 text-purple-300 text-xs font-semibold px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
              {events.length} Live Events Available Now
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              Your Next
              <span className="block text-gradient">
                Concert Experience
              </span>
            </h1>

            <p className="text-gray-400 text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
              Discover world-class live music. Secure checkout. Instant QR tickets
              delivered after payment confirmation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#events"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 text-sm shadow-lg shadow-purple-900/30"
              >
                Browse Events →
              </a>
              <a
                href="#how-it-works"
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-semibold px-8 py-4 rounded-2xl transition-colors text-sm"
              >
                How It Works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED EVENT ───────────────────────────────── */}
      {featuredEvent && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-950/50 border border-purple-800/50 px-3 py-1.5 rounded-full">
              ⚡ Featured Event
            </span>
          </div>

          <Link href={`/events/${featuredEvent._id}`}>
            <div className="relative rounded-3xl overflow-hidden group cursor-pointer card-glow transition-all duration-300">
              {/* Background Image */}
              <div className="absolute inset-0">
                {featuredEvent.imageUrl &&
                featuredEvent.imageUrl !== "/images/default-concert.jpg" ? (
                  <img
                    src={featuredEvent.imageUrl}
                    alt={featuredEvent.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900 to-gray-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
              </div>

              {/* Content */}
              <div className="relative p-8 sm:p-12 min-h-[340px] flex flex-col justify-end">
                <div className="max-w-lg">
                  <p className="text-purple-400 text-sm font-semibold mb-2">
                    {new Date(featuredEvent.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
                    {featuredEvent.name}
                  </h2>
                  <p className="text-gray-400 mb-6 line-clamp-2 text-sm leading-relaxed">
                    {featuredEvent.description}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-extrabold text-white">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: featuredEvent.currency.toUpperCase(),
                      }).format(featuredEvent.price / 100)}
                    </span>
                    <span className="bg-purple-600 group-hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                      Get Tickets →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ── ALL EVENTS GRID ──────────────────────────────── */}
      <section
        id="events"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {featuredEvent ? "More Events" : "All Events"}
          </h2>
          <span className="text-gray-500 text-sm">
            {remainingEvents.length} event{remainingEvents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {remainingEvents.length === 0 && !featuredEvent ? (
          <div className="text-center py-24 bg-gray-900/50 border border-gray-800 rounded-3xl">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">
              No Events Yet
            </h3>
            <p className="text-gray-600 text-sm">
              Check back soon for upcoming concerts
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingEvents.map(
              (event: Parameters<typeof EventCard>[0]["event"]) => (
                <EventCard key={event._id} event={event} />
              )
            )}
          </div>
        )}
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section
        id="how-it-works"
        className="border-t border-gray-900 bg-gray-950"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              How It Works
            </h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">
              From browsing to entering the venue in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: "🔍",
                title: "Browse Events",
                description:
                  "Explore upcoming concerts and find the perfect show for you",
              },
              {
                step: "02",
                icon: "🛒",
                title: "Select Tickets",
                description:
                  "Choose your quantity and proceed to secure Stripe checkout",
              },
              {
                step: "03",
                icon: "💳",
                title: "Secure Payment",
                description:
                  "Pay safely via Stripe. Your card details never touch our servers",
              },
              {
                step: "04",
                icon: "🎫",
                title: "Get Your QR Code",
                description:
                  "Your unique QR ticket is instantly generated after payment",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-purple-800/50 transition-colors"
              >
                <div className="text-xs font-bold text-purple-500 mb-4 font-mono">
                  {item.step}
                </div>
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-gray-900 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-2xl font-bold text-purple-400">
              🎵 ConcertTix
            </div>
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} ConcertTix. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>🔒 Payments by Stripe</span>
              <span>🎫 Instant QR Tickets</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}