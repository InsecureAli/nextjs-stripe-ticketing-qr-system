"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  initialData?: {
    name: string;
    description: string;
    venue: string;
    date: string;
    imageUrl: string;
    totalCapacity: number;
    price: number;
    currency: string;
  };
}

export default function EventForm({ mode, eventId, initialData }: EventFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    venue: initialData?.venue ?? "",
    date: initialData?.date
      ? new Date(initialData.date).toISOString().slice(0, 16)
      : "",
    imageUrl: initialData?.imageUrl ?? "",
    totalCapacity: initialData?.totalCapacity ?? 100,
    price: initialData ? (initialData.price / 100).toFixed(2) : "",
    currency: initialData?.currency ?? "usd",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const priceInCents = Math.round(parseFloat(formData.price) * 100);

    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError("Please enter a valid price");
      setIsLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      venue: formData.venue,
      date: new Date(formData.date).toISOString(),
      imageUrl: formData.imageUrl,
      totalCapacity: parseInt(formData.totalCapacity.toString()),
      price: priceInCents,
      currency: formData.currency,
    };

    try {
      const url =
        mode === "create" ? "/api/events" : `/api/events/${eventId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      router.push("/admin/events");
      router.refresh();
    } catch {
      setError("Failed to save event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Event Name */}
        <div className="lg:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Event Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Neon Horizon Electronic Festival"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
          />
        </div>

        {/* Venue */}
        <div className="lg:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Venue *
          </label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
            required
            placeholder="e.g. Madison Square Garden, New York, NY"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
          />
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Date & Time *
          </label>
          <input
            type="datetime-local"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          />
        </div>

        {/* Capacity */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Total Capacity *
          </label>
          <input
            type="number"
            name="totalCapacity"
            value={formData.totalCapacity}
            onChange={handleChange}
            required
            min={1}
            max={100000}
            placeholder="500"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Price (in dollars) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              $
            </span>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0.50"
              step="0.01"
              placeholder="29.99"
              className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl pl-8 pr-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
            />
          </div>
          <p className="text-gray-600 text-xs mt-1">Enter the price in dollars (e.g. 29.99)</p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors"
          >
            <option value="usd">USD — US Dollar</option>
            <option value="gbp">GBP — British Pound</option>
            <option value="eur">EUR — Euro</option>
            <option value="cad">CAD — Canadian Dollar</option>
            <option value="aud">AUD — Australian Dollar</option>
          </select>
        </div>

        {/* Image URL */}
        <div className="lg:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Image URL
          </label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://images.unsplash.com/photo-xxx?w=800"
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600"
          />
          <p className="text-gray-600 text-xs mt-1">
            Use an Unsplash URL or leave blank for default
          </p>
          {/* Image Preview */}
          {formData.imageUrl && (
            <div className="mt-3 h-32 rounded-xl overflow-hidden border border-gray-700">
              <img
                src={formData.imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label className="block text-gray-400 text-sm font-medium mb-2">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            placeholder="Describe the event, lineup, what to expect..."
            className="w-full bg-gray-800 border border-gray-700 focus:border-purple-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors placeholder-gray-600 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {isLoading
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Event"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/events")}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}