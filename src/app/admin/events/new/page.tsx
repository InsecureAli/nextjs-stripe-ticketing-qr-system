import EventForm from "@/components/admin/EventForm";

export default function NewEventPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1">
          Create New Event
        </h1>
        <p className="text-gray-400 text-sm">
          Fill in the details below to publish a new concert
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <EventForm mode="create" />
      </div>
    </div>
  );
}