import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import connectToDatabase from "@/lib/db/mongoose";
import Ticket from "@/lib/models/Ticket";
import TicketCard from "@/components/TicketCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getUserTickets(userId: string) {
  await connectToDatabase();

  const tickets = await Ticket.find({ userId })
    .populate({ path: "eventId", select: "name date venue imageUrl" })
    .sort({ createdAt: -1, ticketNumber: 1 })
    .lean();

  return JSON.parse(JSON.stringify(tickets));
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  const tickets = await getUserTickets(session.user.id);

  const validTickets = tickets.filter(
    (t: { status: string }) => t.status === "VALID"
  );
  const usedTickets = tickets.filter(
    (t: { status: string }) => t.status === "USED"
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-1">
          My Tickets
        </h1>
        <p className="text-gray-400">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{tickets.length}</p>
          <p className="text-gray-500 text-sm mt-1">Total Tickets</p>
        </div>
        <div className="bg-gray-900 border border-green-900/50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{validTickets.length}</p>
          <p className="text-gray-500 text-sm mt-1">Valid</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-500">{usedTickets.length}</p>
          <p className="text-gray-500 text-sm mt-1">Used</p>
        </div>
      </div>

      {/* Tickets */}
      {tickets.length === 0 ? (
        <div className="text-center py-24 bg-gray-900 rounded-2xl border border-gray-800">
          <div className="text-5xl mb-4">🎫</div>
          <h2 className="text-xl font-bold text-gray-400 mb-2">
            No Tickets Yet
          </h2>
          <p className="text-gray-600 mb-6 text-sm">
            Browse upcoming concerts and buy your first ticket
          </p>
          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Valid Tickets */}
          {validTickets.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Upcoming Tickets ({validTickets.length})
              </h2>
              <div className="space-y-4">
                {validTickets.map(
                  (ticket: Parameters<typeof TicketCard>[0]["ticket"]) => (
                    <TicketCard key={ticket._id} ticket={ticket} />
                  )
                )}
              </div>
            </section>
          )}

          {/* Used Tickets */}
          {usedTickets.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-600 rounded-full" />
                Used Tickets ({usedTickets.length})
              </h2>
              <div className="space-y-4">
                {usedTickets.map(
                  (ticket: Parameters<typeof TicketCard>[0]["ticket"]) => (
                    <TicketCard key={ticket._id} ticket={ticket} />
                  )
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}