"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Image from "next/image";
import { PdfActions } from "@/components/PdfActions";
import type { CohortEnrollment } from "@/types";

interface ReceiptData extends CohortEnrollment {
  customer: { firstname: string; lastname: string; email: string };
  reference: string | null;
}

export default function CohortReceiptPage() {
  const params = useParams();
  const { customer, loading } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer || !params.id) return;
    api
      .get<ReceiptData>(`/cohort/${params.id}/receipt`)
      .then(setReceipt)
      .catch(() => setError("Could not load this receipt — has it been paid for?"));
  }, [customer, params.id]);

  if (loading) return null;
  if (!customer) {
    return <main className="min-h-screen flex items-center justify-center"><a href="/login" className="text-brand-primary font-semibold">Sign in</a></main>;
  }
  if (error) return <main className="min-h-screen flex items-center justify-center text-brand-muted">{error}</main>;
  if (!receipt) return <main className="min-h-screen flex items-center justify-center text-brand-muted">Loading…</main>;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-lg mx-auto bg-white border rounded-xl shadow-sm p-8 print:shadow-none print:border-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={32} height={32} />
            <span className="font-bold text-brand-dark">ArewaTecHub</span>
          </div>
          <PdfActions
            downloadPath={`/cohort/${receipt.id}/receipt/pdf`}
            filename={`ArewaTecHub_Cohort_Receipt_${receipt.reference ?? receipt.id}.pdf`}
          />
        </div>

        <h1 className="text-lg font-bold text-brand-dark mb-1">Digital Academy Cohort — Receipt</h1>
        <p className="text-sm text-brand-muted mb-6">{receipt.reference}</p>

        <dl className="text-sm space-y-2 mb-6">
          <div className="flex justify-between"><dt className="text-brand-muted">Student</dt><dd>{receipt.customer.firstname} {receipt.customer.lastname}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Batch</dt><dd>{receipt.intake.name}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Track</dt><dd>{receipt.track_selected}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">{receipt.bootcamp_option === "bootcamp" ? "Bootcamp" : "Non-Bootcamp"} Fee</dt><dd>₦{Number(receipt.bootcamp_fee).toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Tuition Fee</dt><dd>₦{Number(receipt.tuition_fee).toLocaleString()}</dd></div>
        </dl>

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="text-brand-muted text-sm">Total Paid</span>
          <span className="text-xl font-bold text-brand-dark">₦{Number(receipt.amount_paid).toLocaleString()}</span>
        </div>
      </div>
    </main>
  );
}
