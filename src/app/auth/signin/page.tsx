"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Separate component to safely use useSearchParams inside Suspense
function SignInForm() {
  const router = useRouter();
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

    const result = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false, // We handle the redirect manually
    });

    if (result?.error) {
      setError("Invalid email or password");
      setIsLoading(false);
      return;
    }

    // Successful sign in — redirect to the callback URL or dashboard
    router.push(callbackUrl);
    router.refresh(); // Refresh to update server components with new session
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to access your tickets
            </p>
          </div>

          {/* Success message after registration */}
          {justRegistered && (
            <div className="bg-green-900/30 border border-green-700 text-green-400 text-sm px-4 py-3 rounded-lg mb-6">
              ✅ Account created! You can now sign in.
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Your password"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-purple-400 hover:text-purple-300 font-semibold">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams requires it in Next.js App Router
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-400">Loading...</div></div>}>
      <SignInForm />
    </Suspense>
  );
}