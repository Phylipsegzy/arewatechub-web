"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import type { CohortBatch, CohortPricing, CohortEnrollment } from "@/types";
import { GraduationCap, FileText } from "lucide-react";

const COURSES = [
  "Web Development", "Data Analysis", "Cybersecurity",
  "Artificial Intelligence & Machine Learning", "Digital Marketing",
  "Office Automation", "Business Branding",
  "PC Software & Hardware with Phone Repair",
  "AI automation and Prompt Engineering", "AI Video creation and editing",
];

const PROGRAMMES = [
  "Digital Transformation Programme",
  "Digital Excellence Programme (Cohort)",
  "Masterclass",
  "Digital Cohort Programme",
];

function formatNaira(n: number | string) {
  return `₦${Number(n).toLocaleString()}`;
}

export default function CohortPage() {
  const { customer, loading, refreshCustomer } = useAuth();
  const [batches, setBatches] = useState<CohortBatch[]>([]);
  const [pricing, setPricing] = useState<CohortPricing | null>(null);
  const [enrollment, setEnrollment] = useState<CohortEnrollment | null>(null);
  const [form, setForm] = useState({
    cohort_intake_id: "", programme_selected: "", track_selected: "",
    status_type: "", state_code: "", matric_number: "",
    bootcamp_option: "", education_level: "", has_laptop: "true", motivation: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState<number | null>(null);

  useEffect(() => {
    api.get<{ courses: string[]; batches: CohortBatch[]; pricing: CohortPricing }>("/cohort").then((r) => {
      setBatches(r.batches);
      setPricing(r.pricing);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customer) return;
    api.get<CohortEnrollment | null>("/cohort/my-enrollment").then(setEnrollment).catch(() => {});
  }, [customer]);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const estimatedBootcamp = form.bootcamp_option === "bootcamp" ? pricing?.bootcamp_fee : form.bootcamp_option === "non_bootcamp" ? pricing?.non_bootcamp_fee : null;
  const estimatedTotal = estimatedBootcamp != null && pricing ? estimatedBootcamp + pricing.tuition_current : null;

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.post<{ message: string; enrollment: CohortEnrollment }>("/cohort/enroll", {
        ...form,
        cohort_intake_id: Number(form.cohort_intake_id),
        has_laptop: form.has_laptop === "true",
      });
      setEnrollment(result.enrollment);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not enroll");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!enrollment) return;
    setPaying(true);
    setError(null);
    setMessage(null);
    setInsufficientFunds(null);
    try {
      const result = await api.post<{ message: string; enrollment: CohortEnrollment }>(`/cohort/${enrollment.id}/pay`);
      setEnrollment(result.enrollment);
      setMessage(result.message);
      await refreshCustomer();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.shortfall !== undefined) {
        setInsufficientFunds(err.shortfall);
      } else {
        setError(err instanceof ApiError ? err.message : "Payment failed");
      }
    } finally {
      setPaying(false);
    }
  }

  if (loading) return null;

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />
      <div className="max-w-2xl mx-auto w-full p-6">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="text-brand-primary" size={24} />
          <h1 className="text-2xl font-bold text-brand-dark">Digital Academy Cohort Programme</h1>
        </div>
        <p className="text-brand-muted mb-6">12-week intensive tech training with global certifications.</p>

        {pricing?.discount_active && (
          <div className="mb-6 bg-brand-dark text-white rounded-xl p-4 text-sm">
            <strong className="text-brand-primary">50% Tuition Discount Active</strong> — pay before{" "}
            {new Date(new Date(pricing.discount_ends_at).getTime() - 86400000).toLocaleDateString(undefined, { month: "long", day: "numeric" })}{" "}
            to lock in {formatNaira(pricing.tuition_current)} tuition instead of {formatNaira(pricing.tuition_full)}.
          </div>
        )}

        {message && <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-4 py-3">{message}</div>}
        {error && <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3">{error}</div>}
        {insufficientFunds !== null && (
          <div className="mb-4 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-4 py-3">
            <p className="mb-2">Your wallet is short by <strong>{formatNaira(insufficientFunds)}</strong>.</p>
            <a href="/dashboard" className="inline-block bg-brand-primary text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-brand-primary-dark">Fund my wallet</a>
          </div>
        )}

        {!customer ? (
          <div className="bg-white rounded-xl border p-6 text-center">
            <p className="text-brand-muted mb-3">Sign in to enroll in the cohort programme.</p>
            <a href="/login?next=/academy/cohort" className="text-brand-primary font-semibold">Sign in</a>
          </div>
        ) : enrollment ? (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <p className="font-semibold text-brand-dark mb-1">{enrollment.intake?.name ?? "—"} — {enrollment.track_selected}</p>
            <p className="text-sm text-brand-muted mb-4">{enrollment.programme_selected} • {enrollment.status_type}</p>
            <dl className="text-sm space-y-1 mb-4">
              <div className="flex justify-between"><dt className="text-brand-muted">{enrollment.bootcamp_option === "bootcamp" ? "Bootcamp" : "Non-Bootcamp"} fee</dt><dd>{formatNaira(enrollment.bootcamp_fee)}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-muted">Tuition{enrollment.tuition_tier === "discounted" ? " (50% off)" : ""}</dt><dd>{formatNaira(enrollment.tuition_fee)}</dd></div>
              <div className="flex justify-between font-semibold border-t pt-1"><dt>Total</dt><dd>{formatNaira(enrollment.amount_due)}</dd></div>
            </dl>
            {enrollment.payment_status === "paid" ? (
              <>
                <p className="text-green-600 font-semibold text-sm mb-3">Paid ✓ — slot confirmed</p>
                <a href={`/dashboard/cohort/receipt/${enrollment.id}`} className="flex items-center gap-1 text-brand-primary text-sm hover:underline">
                  <FileText size={14} /> View Receipt
                </a>
              </>
            ) : (
              <button onClick={handlePay} disabled={paying} className="w-full bg-brand-primary text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-60">
                {paying ? "Processing…" : `Pay ${formatNaira(enrollment.amount_due)} from Wallet`}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleEnroll} className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-brand-dark mb-1">Enroll Now</h2>

            <select required value={form.programme_selected} onChange={update("programme_selected")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="" disabled>Select a programme</option>
              {PROGRAMMES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            <select required value={form.track_selected} onChange={update("track_selected")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="" disabled>Select a course track</option>
              {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select required value={form.cohort_intake_id} onChange={update("cohort_intake_id")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="" disabled>Choose a batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id} disabled={b.full}>
                  {b.name} ({new Date(b.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}–{new Date(b.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}) {b.full ? "— Full" : `— ${b.slots_remaining} slots left`}
                </option>
              ))}
            </select>

            <select required value={form.bootcamp_option} onChange={update("bootcamp_option")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="" disabled>Bootcamp preference</option>
              <option value="bootcamp">Bootcamp Training ({pricing ? formatNaira(pricing.bootcamp_fee) : "₦60,000"})</option>
              <option value="non_bootcamp">Non-Bootcamp Training ({pricing ? formatNaira(pricing.non_bootcamp_fee) : "₦40,000"})</option>
            </select>

            <select required value={form.status_type} onChange={update("status_type")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="" disabled>Your status</option>
              <option value="Corp Member">Corp Member</option>
              <option value="Student">Student</option>
              <option value="Working Class">Working Class</option>
            </select>

            {form.status_type === "Corp Member" && (
              <input required placeholder="State Code (e.g. KN/26A/1234)" value={form.state_code} onChange={update("state_code")} className="w-full border rounded-md px-3 py-2 text-sm" />
            )}
            {form.status_type === "Student" && (
              <input required placeholder="Matric Number" value={form.matric_number} onChange={update("matric_number")} className="w-full border rounded-md px-3 py-2 text-sm" />
            )}

            <select value={form.education_level} onChange={update("education_level")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Highest education level (optional)</option>
              <option>Secondary School</option>
              <option>OND / NCE</option>
              <option>HND / B.Sc</option>
              <option>Masters / PhD</option>
            </select>

            <select value={form.has_laptop} onChange={update("has_laptop")} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="true">Yes, I have a laptop</option>
              <option value="false">No, I&apos;ll need to rent one</option>
            </select>

            <textarea placeholder="Why do you want to join? (optional)" value={form.motivation} onChange={update("motivation")} rows={3} className="w-full border rounded-md px-3 py-2 text-sm" />

            {estimatedTotal != null && (
              <div className="bg-brand-secondary rounded-md p-3 text-sm">
                <div className="flex justify-between"><span className="text-brand-muted">{form.bootcamp_option === "bootcamp" ? "Bootcamp" : "Non-Bootcamp"} fee</span><span>{formatNaira(estimatedBootcamp!)}</span></div>
                <div className="flex justify-between"><span className="text-brand-muted">Tuition{pricing?.discount_active ? " (50% off)" : ""}</span><span>{formatNaira(pricing!.tuition_current)}</span></div>
                <div className="flex justify-between font-bold border-t border-brand-primary/20 mt-1 pt-1"><span>Estimated Total</span><span>{formatNaira(estimatedTotal)}</span></div>
              </div>
            )}

            <button disabled={submitting} className="w-full bg-brand-primary text-white rounded-full py-2.5 text-sm font-semibold disabled:opacity-60">
              {submitting ? "Enrolling…" : "Enroll Now"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
