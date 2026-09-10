"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import Image from "next/image";

interface ReceiptData {
  id: number;
  status: string;
  price: string;
  start_date: string;
  end_date: string;
  seat_number: number;
  created_at: string;
  customer: { firstname: string; lastname: string; email: string };
  plan: { name: string };
  room: { name: string };
  internet_access?: { internet_account: { username: string; password: string } } | null;
}

export default function ReceiptPage() {
  const params = useParams();
  const { customer, loading } = useAuth();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer || !params.id) return;
    api
      .get<ReceiptData>(`/bookings/${params.id}/receipt`)
      .then(setReceipt)
      .catch(() => setError("Could not load this receipt."));
  }, [customer, params.id]);

  if (loading) return null;

  if (!customer) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center px-6">
        <a href="/login" className="text-brand-primary font-semibold">Sign in to view your receipt</a>
      </main>
    );
  }

  if (error) {
    return <main className="min-h-screen flex items-center justify-center text-brand-muted">{error}</main>;
  }

  if (!receipt) {
    return <main className="min-h-screen flex items-center justify-center text-brand-muted">Loading receipt…</main>;
  }

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

        <h1 className="text-lg font-bold text-brand-dark mb-1">Booking Receipt</h1>
        <p className="text-sm text-brand-muted mb-6">Booking #{receipt.id} • {new Date(receipt.created_at).toLocaleString()}</p>

        <dl className="text-sm space-y-2 mb-6">
          <div className="flex justify-between"><dt className="text-brand-muted">Customer</dt><dd>{receipt.customer.firstname} {receipt.customer.lastname}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Email</dt><dd>{receipt.customer.email}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Plan</dt><dd>{receipt.plan.name}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Workspace</dt><dd>{receipt.room.name}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Seat</dt><dd>{receipt.seat_number}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Date</dt><dd>{receipt.start_date}{receipt.start_date !== receipt.end_date ? ` – ${receipt.end_date}` : ""}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-muted">Status</dt><dd className="capitalize">{receipt.status}</dd></div>
        </dl>

        {receipt.internet_access && (
          <div className="bg-brand-secondary rounded-md p-3 mb-6 text-sm">
            <p className="font-semibold text-brand-dark mb-1">WiFi Login</p>
            <p>Username: <strong>{receipt.internet_access.internet_account.username}</strong></p>
            <p>Password: <strong>{receipt.internet_access.internet_account.password}</strong></p>
          </div>
        )}

        <div className="border-t pt-4 flex justify-between items-center">
          <span className="text-brand-muted text-sm">Amount Paid</span>
          <span className="text-xl font-bold text-brand-dark">₦{Number(receipt.price).toLocaleString()}</span>
        </div>
      </div>
    </main>
  );
}
