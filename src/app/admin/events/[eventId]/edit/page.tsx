import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/db/mongoose";
import Event from "@/lib/models/Event";
import EventForm from "@/components/admin/EventForm";

async function getEvent(eventId: string) {
  try {
    await connectToDatabase();
    const event = await Event.findById(eventId).lean();
    if (!event) return null;
    return JSON.parse(JSON.stringify(event));
  } catch {
    return null;
  }
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1">Edit Event</h1>
        <p className="text-gray-400 text-sm">{event.name}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <EventForm mode="edit" eventId={eventId} initialData={event} />
      </div>
    </div>
  );
}