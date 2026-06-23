"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const justRegistered = searchParams.get("registered") === "true";

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      /**
       * MANUAL SIGN IN APPROACH
       * 
       * Instead of using NextAuth's signIn() function which has
       * CSRF and redirect issues with ngrok/proxies, we:
       * 
       * 1. Get CSRF token manually from NextAuth
       * 2. POST credentials directly to NextAuth callback
       * 3. Handle redirect ourselves
       * 
       * This works reliably on any URL including ngrok
       */

      // Step 1: Get CSRF token from NextAuth
      const csrfResponse = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfResponse.json();

      console.log("CSRF token obtained:", !!csrfToken);

      // Step 2: Submit credentials to NextAuth callback endpoint
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          csrfToken: csrfToken,
          callbackUrl: callbackUrl,
          json: "true",
        }),
        redirect: "follow",
      });

      console.log("Auth response status:", response.status);
      console.log("Auth response URL:", response.url);

      // Step 3: Check if login succeeded
      // NextAuth returns 200 with the session URL on success
      if (response.ok || response.status === 200) {
        // Verify session was actually created
        const sessionResponse = await fetch("/api/auth/session");
        const session = await sessionResponse.json();

        console.log("Session after login:", session);

        if (session && session.user) {
          // Login successful — redirect
          console.log("✅ Session created, redirecting to:", callbackUrl);
          window.location.href = callbackUrl;
        } else {
          setError("Invalid email or password");
          setIsLoading(false);
        }
      } else {
        setError("Invalid email or password");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🎵</div>
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to access your tickets
            </p>
          </div>

          {justRegistered && (
            <div className="bg-green-900/30 border border-green-700 text-green-400 text-sm px-4 py-3 rounded-lg mb-6">
              ✅ Account created! You can now sign in.
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="admin@concerttix.com"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="text-purple-400 hover:text-purple-300 font-semibold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}