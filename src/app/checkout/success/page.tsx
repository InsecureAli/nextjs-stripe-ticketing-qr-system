/**
 * Checkout Success Page — /checkout/success
 *
 * ⚠️ IMPORTANT SECURITY NOTE:
 * This page does NOT create the ticket. It is purely informational.
 * The ticket is created by the Stripe webhook (Step 2).
 *
 * This page just tells the user: "Payment received, your ticket is being processed."
 * We redirect them to /dashboard where they can see their ticket once
 * the webhook has fired and the ticket document exists.
 */

import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-green-700">
          <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-4">
          Payment Successful!
        </h1>

        <p className="text-gray-400 mb-3 leading-relaxed">
          Your payment has been confirmed by Stripe. Your ticket and QR code
          are being generated and will appear in your dashboard shortly.
        </p>

        <p className="text-gray-600 text-sm mb-8">
          This usually takes just a few seconds.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            View My Tickets
          </Link>
          <Link
            href="/"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}