"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import { api } from "@/lib/api";

interface PendingFeedbackBooking {
  id: number;
  room?: { name: string } | null;
  start_date: string;
}

export function SurveyPopup({
  booking,
  onDone,
}: {
  booking: PendingFeedbackBooking;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking.id}/feedback`, { rating, comment: comment || null });
      sessionStorage.setItem(`survey_dismissed_${booking.id}`, "1");
      onDone();
    } catch {
      // if it fails, just let them dismiss — not worth blocking the dashboard over
      setSubmitting(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(`survey_dismissed_${booking.id}`, "1");
    setDismissed(true);
    onDone();
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-40 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-brand-muted hover:text-brand-dark"
        >
          <X size={18} />
        </button>

        <h3 className="font-bold text-brand-dark text-lg mb-1">How was your workspace?</h3>
        <p className="text-sm text-brand-muted mb-4">
          {booking.room?.name ?? "Your workspace"} — {booking.start_date}. What can we do to improve?
        </p>

        <div className="flex gap-1 justify-center mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1"
            >
              <Star
                size={32}
                className={(hoverRating || rating) >= n ? "text-brand-primary" : "text-gray-300"}
                fill={(hoverRating || rating) >= n ? "currentColor" : "none"}
              />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any additional comments? (optional)"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full bg-brand-primary text-white rounded-full py-2.5 font-semibold disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </div>
    </div>
  );
}
