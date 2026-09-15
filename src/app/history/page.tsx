"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardShell } from "@/components/DashboardShell";
import type { Booking, WalletTransaction } from "@/types";

interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

type Tab = "bookings" | "fundings";

export default function HistoryPage() {
  const { customer, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<Paginated<Booking> | null>(null);
  const [fundings, setFundings] = useState<Paginated<WalletTransaction> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!customer) return;
    if (tab === "bookings") {
      api.get<Paginated<Booking>>(`/bookings?per_page=15&page=${page}`).then(setBookings).catch(() => {});
    } else {
      api
        .get<{ transactions: Paginated<WalletTransaction> }>(`/wallet?per_page=15&page=${page}`)
        .then((r) => setFundings(r.transactions))
        .catch(() => {});
    }
  }, [customer, tab, page]);

  function switchTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  if (loading) return null;

  if (!customer) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <a href="/login" className="text-brand-primary font-semibold">Sign in to view your history</a>
        </div>
      </main>
    );
  }

  const current = tab === "bookings" ? bookings : fundings;

  return (
    <DashboardShell>
      <div className="max-w-3xl mx-auto w-full p-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">History</h1>
        <p className="text-brand-muted mb-6">Every booking and wallet transaction on your account.</p>

        <div className="flex gap-1 mb-4">
          {(["bookings", "fundings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md ${
                tab === t ? "bg-white text-brand-primary border-x border-t" : "text-brand-muted"
              }`}
            >
              {t === "bookings" ? "Bookings" : "Funding History"}
            </button>
          ))}
        </div>

        <div className="bg-white border rounded-b-lg rounded-tr-lg p-6">
          {tab === "bookings" && bookings && (
            <ul className="text-sm divide-y">
              {bookings.data.map((b) => (
                <li key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-brand-dark">{b.room.name} — Seat {b.seat_number}</p>
                    <p className="text-xs text-brand-muted">{b.start_date}{b.start_date !== b.end_date ? ` – ${b.end_date}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₦{Number(b.price).toLocaleString()}</p>
                    <p className="text-xs capitalize text-brand-muted">{b.status}</p>
                  </div>
                </li>
              ))}
              {bookings.data.length === 0 && <li className="py-6 text-center text-brand-muted">No bookings yet.</li>}
            </ul>
          )}

          {tab === "fundings" && fundings && (
            <ul className="text-sm divide-y">
              {fundings.data.map((t) => (
                <li key={t.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="capitalize font-medium text-brand-dark">{t.source.replace(/_/g, " ")}</p>
                    <p className="text-xs text-brand-muted">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${t.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "credit" ? "+" : "-"}₦{Number(t.amount).toLocaleString()}
                    </p>
                    <p className="text-xs capitalize text-brand-muted">{t.status}</p>
                  </div>
                </li>
              ))}
              {fundings.data.length === 0 && <li className="py-6 text-center text-brand-muted">No transactions yet.</li>}
            </ul>
          )}

          {current && current.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-brand-primary disabled:text-gray-300"
              >
                ← Previous
              </button>
              <span className="text-brand-muted">Page {current.current_page} of {current.last_page}</span>
              <button
                disabled={page >= current.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="text-brand-primary disabled:text-gray-300"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
