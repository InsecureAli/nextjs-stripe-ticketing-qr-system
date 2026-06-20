"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      // Registration successful — redirect to sign in
      router.push("/auth/signin?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">
              Create Account
            </h1>
            <p className="text-gray-400 text-sm">
              Join ConcertTix to buy tickets
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-gray-400 text-sm mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Smith"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

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
                placeholder="Minimum 8 characters"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repeat your password"
                className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-lg px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-purple-400 hover:text-purple-300 font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}