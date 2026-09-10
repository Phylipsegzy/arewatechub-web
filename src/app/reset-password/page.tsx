"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>("/auth/password/reset", {
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        This reset link is missing its token — please use the link from your email.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow border">
      <h1 className="text-2xl font-bold text-brand-primary mb-6">Set a new password</h1>

      {message && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {message} <a href="/login" className="underline font-medium">Sign in</a>
        </div>
      )}
      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {!message && (
        <>
          <label className="block text-sm mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-4"
          />

          <label className="block text-sm mb-1">Confirm new password</label>
          <input
            type="password"
            required
            minLength={8}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-6"
          />

          <button
            disabled={submitting}
            className="w-full bg-brand-primary text-white rounded-md py-2 font-semibold hover:bg-brand-primary-dark disabled:opacity-60"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
