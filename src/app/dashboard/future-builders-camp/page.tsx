"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardShell } from "@/components/DashboardShell";
import type { TeenProgramRegistration } from "@/types";
import { UserPlus, Wallet, Star, FileText, Award } from "lucide-react";

function formatNaira(amount: number | string) {
  return `₦${Number(amount).toLocaleString()}`;
}

function RegistrationCard({
  registration,
  onPay,
  payingId,
}: {
  registration: TeenProgramRegistration;
  onPay: (registration: TeenProgramRegistration, type: "registration" | "vip") => void;
  payingId: number | null;
}) {
  const busy = payingId === registration.id;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-brand-dark">{registration.child_firstname} {registration.child_lastname}</p>
          <p className="text-xs text-brand-muted">Age {registration.child_age} • {registration.school || "School not provided"}</p>
        </div>
        {registration.vip_payment_status === "paid" && (
          <span className="flex items-center gap-1 bg-brand-secondary text-brand-primary text-xs font-bold px-2 py-1 rounded-full">
            <Star size={12} /> VIP
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-sm border-t pt-3">
        <span className="text-brand-muted">Registration fee ({formatNaira(registration.registration_amount)})</span>
        {registration.registration_payment_status === "paid" ? (
          <span className="text-green-600 font-semibold">Paid ✓</span>
        ) : (
          <button
            onClick={() => onPay(registration, "registration")}
            disabled={busy}
            className="bg-brand-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-60"
          >
            {busy ? "Processing…" : "Pay Now"}
          </button>
        )}
      </div>

      {registration.registration_payment_status === "paid" && registration.vip_payment_status !== "paid" && (
        <div className="flex items-center justify-between text-sm border-t pt-3 mt-3">
          <span className="text-brand-muted">VIP upgrade ({formatNaira(registration.vip_amount)}, includes a laptop)</span>
          <button
            onClick={() => onPay(registration, "vip")}
            disabled={busy}
            className="bg-brand-dark text-white text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-60"
          >
            {busy ? "Processing…" : "Upgrade"}
          </button>
        </div>
      )}

      {registration.registration_payment_status === "paid" && (
        <div className="flex gap-4 border-t pt-3 mt-3 text-xs">
          <a href={`/dashboard/future-builders-camp/receipt/${registration.id}`} className="flex items-center gap-1 text-brand-primary hover:underline">
            <FileText size={14} /> Receipt
          </a>
          <a href={`/dashboard/future-builders-camp/admission-letter/${registration.id}`} className="flex items-center gap-1 text-brand-primary hover:underline">
            <Award size={14} /> Admission Letter
          </a>
        </div>
      )}
    </div>
  );
}

export default function FutureBuildersCampDashboard() {
  const { customer, loading, refreshCustomer } = useAuth();
  const [registrations, setRegistrations] = useState<TeenProgramRegistration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    child_firstname: "", child_lastname: "", child_age: "", child_gender: "",
    school: "", parent_address: "", nearest_landmark: "", relationship: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState<number | null>(null);

  useEffect(() => {
    if (!customer) return;
    api.get<TeenProgramRegistration[]>("/teen-program").then(setRegistrations).catch(() => {});
  }, [customer]);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ message: string; registration: TeenProgramRegistration }>("/teen-program", {
        ...form,
        child_age: Number(form.child_age),
      });
      setRegistrations((prev) => [result.registration, ...prev]);
      setMessage(result.message);
      setShowForm(false);
      setForm({ child_firstname: "", child_lastname: "", child_age: "", child_gender: "", school: "", parent_address: "", nearest_landmark: "", relationship: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay(registration: TeenProgramRegistration, type: "registration" | "vip") {
    setPayingId(registration.id);
    setError(null);
    setMessage(null);
    setInsufficientFunds(null);
    try {
      const result = await api.post<{ message: string; registration: TeenProgramRegistration }>(
        `/teen-program/${registration.id}/pay`,
        { payment_type: type }
      );
      setRegistrations((prev) => prev.map((r) => (r.id === registration.id ? result.registration : r)));
      setMessage(result.message);
      await refreshCustomer();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.shortfall !== undefined) {
        setInsufficientFunds(err.shortfall);
      } else {
        setError(err instanceof ApiError ? err.message : "Payment failed");
      }
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return null;

  if (!customer) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <a href="/login?next=/dashboard/future-builders-camp" className="text-brand-primary font-semibold">Sign in to continue</a>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto w-full p-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Future Builders Camp</h1>
        <p className="text-brand-muted mb-6">Manage your children's registrations and payments.</p>

        {message && <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-4 py-3">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>}
        {insufficientFunds !== null && (
          <div className="mb-4 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-4 py-3">
            <p className="mb-2">Your wallet is short by <strong>{formatNaira(insufficientFunds)}</strong>.</p>
            <a href="/dashboard" className="inline-block bg-brand-primary text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-brand-primary-dark">
              Fund my wallet
            </a>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {registrations.map((r) => (
            <RegistrationCard key={r.id} registration={r} onPay={handlePay} payingId={payingId} />
          ))}
          {registrations.length === 0 && !showForm && (
            <p className="text-sm text-brand-muted">No children registered yet.</p>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-brand-primary text-white rounded-full px-5 py-3 font-semibold hover:bg-brand-primary-dark"
          >
            <UserPlus size={18} /> Register a Child
          </button>
        ) : (
          <form onSubmit={handleRegister} className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-brand-dark mb-1">Register a Child</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Child's first name" value={form.child_firstname} onChange={update("child_firstname")} className="border rounded-md px-3 py-2 text-sm" />
              <input required placeholder="Child's last name" value={form.child_lastname} onChange={update("child_lastname")} className="border rounded-md px-3 py-2 text-sm" />
              <input required type="number" min={12} max={17} placeholder="Age (12–17)" value={form.child_age} onChange={update("child_age")} className="border rounded-md px-3 py-2 text-sm" />
              <select value={form.child_gender} onChange={update("child_gender")} className="border rounded-md px-3 py-2 text-sm">
                <option value="">Gender (optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <input placeholder="School (optional)" value={form.school} onChange={update("school")} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
              <input placeholder="Your relationship (e.g. Mother)" value={form.relationship} onChange={update("relationship")} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
              <input required placeholder="Home address" value={form.parent_address} onChange={update("parent_address")} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
              <input required placeholder="Nearest landmark" value={form.nearest_landmark} onChange={update("nearest_landmark")} className="border rounded-md px-3 py-2 text-sm sm:col-span-2" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border rounded-full py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button disabled={submitting} className="flex-1 bg-brand-primary text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-60">
                {submitting ? "Registering…" : "Register"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
