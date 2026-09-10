"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";

export default function FeedbackPage() {
  const params = useParams();
  const { customer, loading } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ message: string }>(`/bookings/${params.id}/feedback`, {
        rating,
        comment: comment || null,
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!customer) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="mb-4 text-brand-muted">Sign in to leave feedback on this booking.</p>
            <a href="/login" className="text-brand-primary font-semibold">Go to sign in</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl border shadow-sm p-8 w-full max-w-sm">
          <h1 className="font-bold text-brand-dark text-xl mb-1">How was your workspace?</h1>
          <p className="text-sm text-brand-muted mb-6">Rate your visit and tell us what we can do to improve.</p>

          {message ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{message}</p>
          ) : (
            <>
              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">{error}</p>
              )}

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
            </>
          )}
        </div>
      </div>
    </main>
  );
}
