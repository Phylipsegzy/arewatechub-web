"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { openPaystackPopup } from "@/lib/paystack";
import { SiteHeader } from "@/components/SiteHeader";
import { SurveyPopup } from "@/components/SurveyPopup";
import type { Booking, WalletTransaction } from "@/types";

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <li className="py-3">
      <div className="flex justify-between items-center">
        <span>{booking.room.name} — {booking.start_date}{booking.workspace_session ? ` (${booking.workspace_session.name})` : ""}</span>
        <span className="flex items-center gap-3">
          <span className="capitalize">{booking.status}</span>
          {booking.status === "confirmed" && (
            <a href={`/receipt/${booking.id}`} className="text-xs text-brand-primary hover:underline">
              Receipt
            </a>
          )}
        </span>
      </div>
      {booking.internet_access && (
        <p className="text-xs text-brand-muted mt-1 bg-brand-secondary inline-block px-2 py-1 rounded">
          WiFi login — user: <strong>{booking.internet_access.internet_account.username}</strong>
          {" "}pass: <strong>{booking.internet_access.internet_account.password}</strong>
        </p>
      )}
    </li>
  );
}

export default function DashboardPage() {
  const { customer, loading, refreshCustomer } = useAuth();
  const [wallet, setWallet] = useState<{
    wallet_balance: string;
    transactions: { data: WalletTransaction[] };
  } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [dedicatedAccount, setDedicatedAccount] = useState<{
    bank_name: string; account_name: string; account_number: string;
  } | null>(null);
  const [generatingAccount, setGeneratingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<{ bank_name: string; account_name: string; account_number: string } | null>(null);
  const [pendingFeedbackBooking, setPendingFeedbackBooking] = useState<{ id: number; room?: { name: string } | null; start_date: string } | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [manualReceipt, setManualReceipt] = useState<File | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  async function handleManualFund(e: React.FormEvent) {
    e.preventDefault();
    if (!manualReceipt) return;
    setManualSubmitting(true);
    setManualError(null);
    try {
      const formData = new FormData();
      formData.append("amount", manualAmount);
      formData.append("notes", manualNotes);
      formData.append("proof_of_payment", manualReceipt);
      const result = await api.postForm<{ message: string }>("/wallet/fund/manual", formData);
      setManualMessage(result.message);
    } catch (err) {
      setManualError(err instanceof ApiError ? err.message : "Could not submit — please try again");
    } finally {
      setManualSubmitting(false);
    }
  }

  useEffect(() => {
    if (!customer) return;
    api.get<typeof wallet>("/wallet").then(setWallet).catch(() => {});
    api
      .get<{ data: Booking[] }>("/bookings?per_page=5")
      .then((r) => setBookings(r.data))
      .catch(() => {});
    api
      .get<typeof dedicatedAccount>("/wallet/dedicated-account")
      .then(setDedicatedAccount)
      .catch(() => {});
    api.get<typeof bankDetails>("/wallet/bank-details").then(setBankDetails).catch(() => {});
    api
      .get<typeof pendingFeedbackBooking>("/feedback/pending")
      .then((booking) => {
        // Don't re-show a survey the customer already dismissed this
        // session just because the page reloaded — reloading shouldn't
        // feel like being nagged. If they never respond, the daily email
        // (surveys:send) is the follow-up channel, not repeated popups.
        if (booking && sessionStorage.getItem(`survey_dismissed_${booking.id}`)) {
          return;
        }
        setPendingFeedbackBooking(booking);
      })
      .catch(() => {});
  }, [customer]);

  async function handleGenerateAccount() {
    setGeneratingAccount(true);
    setAccountError(null);
    try {
      const account = await api.post<typeof dedicatedAccount>("/wallet/dedicated-account");
      setDedicatedAccount(account);
    } catch (err) {
      setAccountError(err instanceof ApiError ? err.message : "Could not generate account");
    } finally {
      setGeneratingAccount(false);
    }
  }

  async function handleFund(e: React.FormEvent) {
    e.preventDefault();
    setFundError(null);
    setFunding(true);
    try {
      const data = await api.post<{
        reference: string; amount: number; email: string; public_key: string;
      }>("/wallet/fund/initialize", { amount: Number(fundAmount) });

      openPaystackPopup({
        publicKey: data.public_key,
        email: data.email,
        amountNaira: data.amount,
        reference: data.reference,
        onSuccess: async (reference) => {
          try {
            const result = await api.get<{ wallet_balance: string }>(`/wallet/fund/verify/${reference}`);
            setFundAmount("");
            setWallet((w) => (w ? { ...w, wallet_balance: result.wallet_balance } : w));
            await refreshCustomer(); // keep customer.wallet_balance (shown on booking page etc.) in sync too
          } catch {
            setFundError("Payment received but we couldn't confirm it automatically — refresh the page in a moment.");
          } finally {
            setFunding(false);
          }
        },
        onClose: () => setFunding(false),
      });
    } catch (err) {
      setFundError(err instanceof ApiError ? err.message : "Could not start payment");
      setFunding(false);
    }
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading…</main>;

  if (!customer) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="mb-4 text-brand-muted">You need to sign in to view your dashboard.</p>
            <a href="/login" className="text-brand-primary font-semibold">Go to sign in</a>
          </div>
        </div>
      </main>
    );
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.end_date) >= new Date(new Date().toDateString())
  );
  const pastBookings = bookings.filter((b) => !upcomingBookings.includes(b));

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader />
      <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">
          Welcome back, {customer.firstname}
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-brand-muted">Wallet Balance</p>
          <p className="text-2xl font-bold">
            ₦{Number(wallet?.wallet_balance ?? customer.wallet_balance).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-brand-muted">Bookings</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-brand-muted">Enrolled Courses</p>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-3">Fund via Dedicated Account (Instant)</h2>
          {dedicatedAccount ? (
            <div className="text-sm space-y-1">
              <p className="text-brand-muted">Transfer any amount to this account — your wallet is credited automatically.</p>
              <div className="mt-2 bg-brand-secondary rounded-md p-3">
                <p className="font-bold text-lg text-brand-dark tracking-wide">{dedicatedAccount.account_number}</p>
                <p>{dedicatedAccount.bank_name}</p>
                <p className="text-brand-muted">{dedicatedAccount.account_name}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-brand-muted mb-3">
                Generate a permanent account number for this wallet — no need to fund via card every time.
              </p>
              <button
                onClick={handleGenerateAccount}
                disabled={generatingAccount}
                className="bg-brand-dark text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {generatingAccount ? "Generating…" : "Generate Account Number"}
              </button>
              {accountError && <p className="text-sm text-red-600 mt-2">{accountError}</p>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-3">Fund via Manual Bank Transfer</h2>
          <p className="text-sm text-brand-muted mb-3">
            Transfer to our account below, then upload proof of payment. An admin reviews and credits your wallet — usually within a few hours.
          </p>
          {bankDetails && (
            <div className="bg-brand-secondary rounded-md p-3 text-sm mb-4 space-y-0.5">
              <p className="font-bold text-brand-dark">{bankDetails.account_number}</p>
              <p>{bankDetails.bank_name}</p>
              <p className="text-brand-muted">{bankDetails.account_name}</p>
            </div>
          )}

          {manualMessage ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{manualMessage}</p>
          ) : (
            <form onSubmit={handleManualFund} className="space-y-3">
              <input
                type="number"
                min={100}
                required
                placeholder="Amount (₦)"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Notes (optional) — e.g. transfer time, sender name"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={2}
              />
              <div>
                <label className="block text-xs text-brand-muted mb-1">Proof of payment (screenshot)</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setManualReceipt(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              </div>
              <button
                disabled={manualSubmitting}
                className="w-full bg-brand-dark text-white rounded-md py-2 text-sm font-semibold disabled:opacity-60"
              >
                {manualSubmitting ? "Submitting…" : "Submit for Review"}
              </button>
              {manualError && <p className="text-sm text-red-600">{manualError}</p>}
            </form>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold mb-3">Fund Wallet (Paystack)</h2>
          <form onSubmit={handleFund} className="flex gap-2">
            <input
              type="number"
              min={100}
              required
              placeholder="Amount (₦)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2"
            />
            <button
              disabled={funding}
              className="bg-brand-primary text-white rounded-md px-4 py-2 font-semibold disabled:opacity-60"
            >
              {funding ? "Opening…" : "Fund"}
            </button>
          </form>
          {fundError && <p className="text-sm text-red-600 mt-2">{fundError}</p>}
        </div>

        <div className="bg-white rounded-lg border p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Funding History</h2>
            <a href="/history" className="text-xs text-brand-primary hover:underline">View all →</a>
          </div>
          {!wallet || wallet.transactions.data.length === 0 ? (
            <p className="text-sm text-brand-muted">No funding transactions yet.</p>
          ) : (
            <ul className="text-sm divide-y">
              {wallet.transactions.data.map((t) => (
                <li key={t.id} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="capitalize">{t.source.replace(/_/g, " ")}</p>
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
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Upcoming Bookings</h2>
            <a href="/history" className="text-xs text-brand-primary hover:underline">View all →</a>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-brand-muted">
              No upcoming bookings. <a href="/booking" className="text-brand-primary">Book a space</a>
            </p>
          ) : (
            <ul className="text-sm divide-y">
              {upcomingBookings.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          )}

          {pastBookings.length > 0 && (
            <>
              <h2 className="font-semibold mb-3 mt-6 pt-4 border-t">Previous Bookings</h2>
              <ul className="text-sm divide-y">
                {pastBookings.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      </div>

      {pendingFeedbackBooking && (
        <SurveyPopup
          booking={pendingFeedbackBooking}
          onDone={() => setPendingFeedbackBooking(null)}
        />
      )}
    </main>
  );
}
