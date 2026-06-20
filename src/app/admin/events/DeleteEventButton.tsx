"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${eventName}"?\n\nThis cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete event. Please try again.");
      }
    } catch {
      alert("Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs bg-red-900/50 hover:bg-red-800/50 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
    >
      {isDeleting ? "..." : "Delete"}
    </button>
  );
}