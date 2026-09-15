"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Image from "next/image";
import { PdfActions } from "@/components/PdfActions";
import type { TeenProgramRegistration } from "@/types";

interface LetterData extends TeenProgramRegistration {
  customer: { firstname: string; lastname: string; email: string };
}

export default function AdmissionLetterPage() {
  const params = useParams();
  const { customer, loading } = useAuth();
  const [reg, setReg] = useState<LetterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer || !params.id) return;
    api
      .get<LetterData>(`/teen-program/${params.id}/admission-letter`)
      .then(setReg)
      .catch(() => setError("Could not load this letter — has the registration fee been paid?"));
  }, [customer, params.id]);

  if (loading) return null;
  if (!customer) {
    return <main className="min-h-screen flex items-center justify-center"><a href="/login" className="text-brand-primary font-semibold">Sign in</a></main>;
  }
  if (error) return <main className="min-h-screen flex items-center justify-center text-brand-muted">{error}</main>;
  if (!reg) return <main className="min-h-screen flex items-center justify-center text-brand-muted">Loading…</main>;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto bg-white border rounded-xl shadow-sm p-10 print:shadow-none print:border-0">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={40} height={40} />
            <span className="font-bold text-lg text-brand-dark">ArewaTecHub</span>
          </div>
          <PdfActions
            downloadPath={`/teen-program/${reg.id}/admission-letter/pdf`}
            filename={`ArewaTecHub_Admission_Letter_${reg.child_firstname}_${reg.child_lastname}.pdf`}
          />
        </div>

        <h1 className="text-2xl font-bold text-brand-dark text-center mb-1">Letter of Admission</h1>
        <p className="text-center text-brand-muted text-sm mb-8">Gen Alpha Future Builders Camp</p>

        <p className="text-sm mb-4">Dear {reg.customer.firstname} {reg.customer.lastname},</p>
        <p className="text-sm mb-4 leading-relaxed">
          We are pleased to confirm that <strong>{reg.child_firstname} {reg.child_lastname}</strong> (age {reg.child_age})
          has been formally admitted into the Gen Alpha Future Builders Camp, a program designed to help young
          builders create, build, and lead through hands-on digital skills training.
          {reg.vip_payment_status === "paid" && " This admission includes VIP status, with an ArewaTecHub-branded laptop provided as part of the program."}
        </p>
        <p className="text-sm mb-4 leading-relaxed">
          Please bring a printed copy of this letter, along with your payment receipt, to ArewaTecHub for
          documentation ahead of the camp's commencement.
        </p>

        <div className="border rounded-md p-4 my-6 text-sm space-y-1">
          <p><strong>Child:</strong> {reg.child_firstname} {reg.child_lastname}</p>
          <p><strong>Age:</strong> {reg.child_age}</p>
          <p><strong>School:</strong> {reg.school || "—"}</p>
          <p><strong>Parent/Guardian:</strong> {reg.parent_name}</p>
          <p><strong>Registration No.:</strong> FBC-{String(reg.id).padStart(5, "0")}</p>
        </div>

        <p className="text-sm mt-8">Warm regards,</p>
        <p className="text-sm font-bold text-brand-primary">ArewaTecHub Team</p>
      </div>
    </main>
  );
}
