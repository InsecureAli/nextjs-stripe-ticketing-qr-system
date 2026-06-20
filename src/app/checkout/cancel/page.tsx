import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-gray-700">
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-4">
          Checkout Cancelled
        </h1>

        <p className="text-gray-400 mb-8 leading-relaxed">
          Your payment was not completed. No charges were made to your account.
          You can try again whenever you&apos;re ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}