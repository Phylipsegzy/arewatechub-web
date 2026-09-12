"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Image from "next/image";
import type { TeenProgramRegistration } from "@/types";

interface ReceiptData extends TeenProgramRegistration {
  customer: { firstname: string; lastname: string; email: string };
}

export default function TeenReceiptPage() {
  const params = useParams();
  const { customer, loading } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer || !params.id) return;
    api
      .get<ReceiptData>(`/teen-program/${params.id}/receipt`)
      .then(setReceipt)
      .catch(() => setError("Could not load this receipt — has the registration fee been paid?"));
  }, [customer, params.id]);

  if (loading) return null;
  if (!customer) {
    return <main className="min-h-screen flex items-center justify-center"><a href="/login" className="text-brand-primary font-semibold">Sign in</a></main>;
  }
  if (error) return <main className="min-h-screen flex items-center justify-center text-brand-muted">{error}</main>;
  if (!receipt) return <main className="min-h-screen flex items-center justify-center text-brand-muted">Loading…</main>;

  const totalPaid = (receipt.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-lg mx-auto bg-white border rounded-xl shadow-sm p-8 print:shadow-none print:border-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={32} height={32} />
            <span className="font-bold text-brand-dark">ArewaTecHub</span>
          </div>
          <button onClick={() => window.print()} className="text-sm text-brand-primary font-medium print:hidden">
            Print / Save as PDF
          </button>
        </div>

        <h1 className="text-lg font-bold text-brand-dark mb-1">Future Builders Camp — Receipt</h1>
        <p className="text-sm text-brand-muted mb-6">Receipt No. RCP-FBC-{String(receipt.id).padStart(5, "0")}</p>

        <dl className="text-sm space-y-2 mb-6">
          <div className="flex justify-between"><dt className="text-brand-muted">Child</dt><dd>{receipt.child_firstname} {receipt.child_lastname}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Parent/Guardian</dt><dd>{receipt.customer.firstname} {receipt.customer.lastname}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Email</dt><dd>{receipt.customer.email}</dd></div>
        </dl>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-brand-muted border-b">
              <th className="py-1">Item</th><th className="text-right">Amount</th><th className="text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.payments ?? []).map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2">{p.payment_type === "registration" ? "Registration / Acceptance Fee" : "VIP Upgrade"}</td>
                <td className="text-right">₦{Number(p.amount).toLocaleString()}</td>
                <td className="text-right text-xs text-brand-muted">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="text-brand-muted text-sm">Total Paid</span>
          <span className="text-xl font-bold text-brand-dark">₦{totalPaid.toLocaleString()}</span>
        </div>
      </div>
    </main>
  );
}
