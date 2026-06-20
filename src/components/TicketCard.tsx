"use client";

import { useState } from "react";

interface TicketCardProps {
  ticket: {
    _id: string;
    status: "VALID" | "USED";
    secureToken: string;
    qrCodeData: string;
    quantity: number;
    createdAt: string;
    scannedAt?: string;
    eventId: {
      name: string;
      date: string;
      venue: string;
    };
  };
}

export default function TicketCard({ ticket }: TicketCardProps) {
  // Toggle QR code visibility (hide by default for security in public places)
  const [showQR, setShowQR] = useState(false);

  const formattedDate = new Date(ticket.eventId.date).toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  const isUsed = ticket.status === "USED";

  return (
    <div className={`bg-gray-900 rounded-2xl border overflow-hidden transition-all ${
      isUsed ? "border-gray-700 opacity-70" : "border-purple-800"
    }`}>

      {/* Ticket Header */}
      <div className={`px-6 py-4 ${isUsed ? "bg-gray-800" : "bg-gradient-to-r from-purple-900 to-gray-900"}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">
              {ticket.eventId.name}
            </h3>
            <p className="text-gray-400 text-sm mt-1">{formattedDate}</p>
            <p className="text-gray-500 text-sm">{ticket.eventId.venue}</p>
          </div>

          {/* Status Badge */}
          <span className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
            isUsed
              ? "bg-gray-700 text-gray-400"
              : "bg-green-900/80 text-green-400 border border-green-700"
          }`}>
            {isUsed ? "✓ Used" : "● Valid"}
          </span>
        </div>
      </div>

      {/* Ticket Body */}
      <div className="px-6 py-4">

        {/* Ticket Info Row */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">Quantity</span>
            <span className="text-white font-semibold">{ticket.quantity} {ticket.quantity === 1 ? "ticket" : "tickets"}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">Purchased</span>
            <span className="text-white font-semibold">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
          {isUsed && ticket.scannedAt && (
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider">Scanned</span>
              <span className="text-gray-400 font-semibold">
                {new Date(ticket.scannedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Dashed Divider (like a real ticket) */}
        <div className="border-t border-dashed border-gray-700 my-4" />

        {/* QR Code Section */}
        {isUsed ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-500 text-sm">This ticket has been used</p>
          </div>
        ) : (
          <div className="text-center">
            {showQR ? (
              <>
                {/* QR Code Image */}
                <div className="inline-block bg-white p-3 rounded-xl mb-3">
                  <img
                    src={ticket.qrCodeData}
                    alt="Ticket QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-gray-500 text-xs mb-3">
                  Show this QR code at the venue entrance
                </p>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  Hide QR Code
                </button>
              </>
            ) : (
              <>
                <div className="bg-gray-800 rounded-xl p-6 mb-3">
                  <div className="text-4xl mb-2">🎟️</div>
                  <p className="text-gray-400 text-sm">
                    QR code hidden for security
                  </p>
                </div>
                <button
                  onClick={() => setShowQR(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
                >
                  Show QR Code
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}