"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/auth/password/forgot", { email });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow border">
          <h1 className="text-2xl font-bold text-brand-primary mb-2">Reset your password</h1>
          <p className="text-sm text-brand-muted mb-6">
            Enter your account email and we&apos;ll send you a reset link.
          </p>

          {message && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-6"
          />

          <button
            disabled={submitting}
            className="w-full bg-brand-primary text-white rounded-md py-2 font-semibold hover:bg-brand-primary-dark disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-sm text-brand-muted mt-4 text-center">
            <a href="/login" className="text-brand-primary font-medium">Back to sign in</a>
          </p>
        </form>
      </div>
    </main>
  );
}
