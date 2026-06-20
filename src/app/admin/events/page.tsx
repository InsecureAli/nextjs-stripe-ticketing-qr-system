import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import Ticket from "@/lib/models/Ticket";
import Link from "next/link";
import DeleteEventButton from "./DeleteEventButton";

export const dynamic = "force-dynamic";

async function getEventsWithStats() {
  await connectToDatabase();

  const events = await Event.find().sort({ date: 1 }).lean();

  // Get ticket counts for each event
  const ticketCounts = await Ticket.aggregate([
    { $group: { _id: "$eventId", count: { $sum: "$quantity" } } },
  ]);

  const countMap = new Map(
    ticketCounts.map((t) => [t._id.toString(), t.count])
  );

  return JSON.parse(
    JSON.stringify(
      events.map((e) => ({
        ...e,
        ticketsSold: countMap.get(e._id.toString()) ?? 0,
      }))
    )
  );
}

export default async function AdminEventsPage() {
  const events = await getEventsWithStats();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-1">
            Manage Events
          </h1>
          <p className="text-gray-400 text-sm">
            {events.length} event{events.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm flex items-center gap-2"
        >
          <span>➕</span> Add Event
        </Link>
      </div>

      {/* Events Table */}
      {events.length === 0 ? (
        <div className="text-center py-24 bg-gray-900 rounded-2xl border border-gray-800">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-xl font-bold text-gray-400 mb-2">
            No Events Yet
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Create your first event to get started
          </p>
          <Link
            href="/admin/events/new"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Create First Event
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Event
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Date
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Price
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Tickets
                  </th>
                  <th className="text-left text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Status
                  </th>
                  <th className="text-right text-xs uppercase tracking-wider text-gray-500 px-6 py-4 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {events.map(
                  (event: {
                    _id: string;
                    name: string;
                    venue: string;
                    date: string;
                    price: number;
                    currency: string;
                    totalCapacity: number;
                    availableTickets: number;
                    ticketsSold: number;
                  }) => {
                    const isPast = new Date(event.date) < new Date();
                    const isSoldOut = event.availableTickets === 0;
                    const formattedDate = new Date(
                      event.date
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const formattedPrice = new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: event.currency.toUpperCase(),
                    }).format(event.price / 100);

                    return (
                      <tr
                        key={event._id}
                        className="hover:bg-gray-800/50 transition-colors"
                      >
                        {/* Event Name */}
                        <td className="px-6 py-4">
                          <p className="text-white font-semibold text-sm">
                            {event.name}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {event.venue}
                          </p>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <span
                            className={`text-sm ${isPast ? "text-gray-500" : "text-gray-300"}`}
                          >
                            {formattedDate}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4">
                          <span className="text-gray-300 text-sm">
                            {formattedPrice}
                          </span>
                        </td>

                        {/* Tickets */}
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-white text-sm font-semibold">
                              {event.ticketsSold}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {" "}/ {event.totalCapacity}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1.5 h-1 bg-gray-800 rounded-full w-24 overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (event.ticketsSold / event.totalCapacity) * 100)}%`,
                              }}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              isPast
                                ? "bg-gray-800 text-gray-500"
                                : isSoldOut
                                  ? "bg-red-900/50 text-red-400"
                                  : "bg-green-900/50 text-green-400"
                            }`}
                          >
                            {isPast
                              ? "Past"
                              : isSoldOut
                                ? "Sold Out"
                                : "On Sale"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/events/${event._id}`}
                              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              View
                            </Link>
                            <Link
                              href={`/admin/events/${event._id}/edit`}
                              className="text-xs bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Edit
                            </Link>
                            <DeleteEventButton eventId={event._id} eventName={event.name} />
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}