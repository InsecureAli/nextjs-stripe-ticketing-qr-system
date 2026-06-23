"use client";

import { useState } from "react";

interface TicketCardProps {
  ticket: {
    _id: string;
    status: "VALID" | "USED";
    secureToken: string;
    qrCodeData: string;
    quantity: number;
    ticketNumber: number;
    totalInOrder: number;
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
  const [showQR, setShowQR] = useState(false);
  const isUsed = ticket.status === "USED";

  const formattedDate = new Date(ticket.eventId.date).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const formattedTime = new Date(ticket.eventId.date).toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div
      className={`bg-gray-900 rounded-2xl border overflow-hidden transition-all ${
        isUsed ? "border-gray-700 opacity-70" : "border-purple-800"
      }`}
    >
      {/* Ticket Header */}
      <div
        className={`px-6 py-4 ${
          isUsed
            ? "bg-gray-800"
            : "bg-gradient-to-r from-purple-900 to-gray-900"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg leading-tight">
              {ticket.eventId.name}
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">{formattedDate}</p>
            <p className="text-gray-500 text-sm">{formattedTime}</p>
            <p className="text-gray-500 text-sm">{ticket.eventId.venue}</p>
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            {/* Status Badge */}
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                isUsed
                  ? "bg-gray-700 text-gray-400"
                  : "bg-green-900/80 text-green-400 border border-green-700"
              }`}
            >
              {isUsed ? "✓ Used" : "● Valid"}
            </span>

            {/* Seat Number Badge */}
            {ticket.totalInOrder > 1 && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-purple-900/50 text-purple-400 border border-purple-800">
                Seat {ticket.ticketNumber} of {ticket.totalInOrder}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Body */}
      <div className="px-6 py-4">

        {/* Info Row */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">
              Ticket
            </span>
            <span className="text-white font-semibold">
              {ticket.totalInOrder > 1
                ? `${ticket.ticketNumber} / ${ticket.totalInOrder}`
                : "1 ticket"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs uppercase tracking-wider">
              Purchased
            </span>
            <span className="text-white font-semibold">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </span>
          </div>
          {isUsed && ticket.scannedAt && (
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider">
                Scanned
              </span>
              <span className="text-gray-400 font-semibold">
                {new Date(ticket.scannedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-700 my-4" />

        {/* QR Code Section */}
        {isUsed ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-500 text-sm">
              This ticket was used for entry
            </p>
            {ticket.scannedAt && (
              <p className="text-gray-600 text-xs mt-1">
                Scanned at {new Date(ticket.scannedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            {showQR ? (
              <>
                {/* QR Code */}
                <div className="inline-block bg-white p-3 rounded-xl mb-3 shadow-lg">
                  <img
                    src={ticket.qrCodeData}
                    alt={`QR Code — Seat ${ticket.ticketNumber}`}
                    className="w-52 h-52"
                  />
                </div>

                {/* Seat label under QR */}
                {ticket.totalInOrder > 1 && (
                  <p className="text-purple-400 text-sm font-bold mb-1">
                    Seat {ticket.ticketNumber} of {ticket.totalInOrder}
                  </p>
                )}

                <p className="text-gray-500 text-xs mb-3">
                  Show this QR code at the venue entrance.
                  Each ticket must be scanned separately.
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
                  {ticket.totalInOrder > 1 && (
                    <p className="text-purple-400 text-xs mt-1 font-semibold">
                      Seat {ticket.ticketNumber} of {ticket.totalInOrder}
                    </p>
                  )}
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