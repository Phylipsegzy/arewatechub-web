"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || undefined;
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form, next);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat().join(" "));
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center bg-gray-50 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded-lg shadow border">
        <h1 className="text-2xl font-bold text-brand-primary mb-6">Create account</h1>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm mb-1">First name</label>
        <input required value={form.firstname} onChange={update("firstname")} className="w-full border rounded-md px-3 py-2 mb-4" />

        <label className="block text-sm mb-1">Last name</label>
        <input required value={form.lastname} onChange={update("lastname")} className="w-full border rounded-md px-3 py-2 mb-4" />

        <label className="block text-sm mb-1">Email</label>
        <input type="email" required value={form.email} onChange={update("email")} className="w-full border rounded-md px-3 py-2 mb-4" />

        <label className="block text-sm mb-1">Phone</label>
        <input value={form.phone} onChange={update("phone")} className="w-full border rounded-md px-3 py-2 mb-4" />

        <label className="block text-sm mb-1">Password</label>
        <input type="password" required minLength={8} value={form.password} onChange={update("password")} className="w-full border rounded-md px-3 py-2 mb-6" />

        <button
          disabled={submitting}
          className="w-full bg-brand-primary text-white rounded-md py-2 font-semibold hover:bg-brand-primary-dark disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-sm text-brand-muted mt-4 text-center">
          Already have an account? <a href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-brand-primary font-medium">Sign in</a>
        </p>
      </form>
      </div>
    </main>
  );
}
