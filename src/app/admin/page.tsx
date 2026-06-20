import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import Ticket from "@/lib/models/Ticket";
import User from "@/lib/models/User";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  await connectToDatabase();

  const [totalEvents, totalTickets, totalUsers, recentTickets] =
    await Promise.all([
      Event.countDocuments(),
      Ticket.countDocuments(),
      User.countDocuments({ role: "CUSTOMER" }),
      Ticket.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({ path: "eventId", select: "name" })
        .populate({ path: "userId", select: "name email" })
        .lean(),
    ]);

  const revenue = await Ticket.aggregate([
    {
      $lookup: {
        from: "events",
        localField: "eventId",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ["$event.price", "$quantity"] } },
      },
    },
  ]);

  return {
    totalEvents,
    totalTickets,
    totalUsers,
    totalRevenue: revenue[0]?.total ?? 0,
    recentTickets: JSON.parse(JSON.stringify(recentTickets)),
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  const statCards = [
    {
      label: "Total Events",
      value: stats.totalEvents,
      icon: "🎵",
      color: "purple",
      href: "/admin/events",
    },
    {
      label: "Tickets Sold",
      value: stats.totalTickets,
      icon: "🎫",
      color: "green",
      href: "/admin/events",
    },
    {
      label: "Customers",
      value: stats.totalUsers,
      icon: "👥",
      color: "blue",
      href: "/admin",
    },
    {
      label: "Total Revenue",
      value: `$${(stats.totalRevenue / 100).toFixed(2)}`,
      icon: "💰",
      color: "yellow",
      href: "/admin",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-1">
          Admin Dashboard
        </h1>
        <p className="text-gray-400">
          Welcome back, {session?.user.name}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all hover:shadow-lg group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{stat.icon}</span>
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <p className="text-3xl font-extrabold text-white mb-1">
              {stat.value}
            </p>
            <p className="text-gray-500 text-sm">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/events/new"
              className="flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-xl transition-colors font-semibold text-sm"
            >
              <span>➕</span> Create New Event
            </Link>
            <Link
              href="/scanner"
              className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-3 rounded-xl transition-colors font-semibold text-sm"
            >
              <span>🔍</span> Open QR Scanner
            </Link>
            <Link
              href="/admin/events"
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl transition-colors font-semibold text-sm"
            >
              <span>📋</span> Manage All Events
            </Link>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Tickets</h2>
          {stats.recentTickets.length === 0 ? (
            <p className="text-gray-500 text-sm">No tickets sold yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentTickets.map(
                (ticket: {
                  _id: string;
                  status: string;
                  userId: { name: string; email: string };
                  eventId: { name: string };
                  quantity: number;
                }) => (
                  <div
                    key={ticket._id}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {ticket.userId?.name ?? "Unknown"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {ticket.eventId?.name ?? "Unknown Event"}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        ticket.status === "VALID"
                          ? "bg-green-900/50 text-green-400"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}