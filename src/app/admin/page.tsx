"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { adminApi } from "@/lib/adminApi";
import {
  LayoutDashboard, CalendarDays, Users, Wallet, PlusCircle, LogOut, Search,
  Sparkles, Clock, Armchair, Check, Bell, BellOff,
} from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, getExistingPushSubscription } from "@/lib/push";

interface AdminBooking {
  id: number;
  status: string;
  price: string;
  start_date: string;
  end_date: string;
  seat_number: number;
  customer: { firstname: string; lastname: string; email: string };
  plan: { name: string };
  room: { name: string };
}

interface AdminCustomer {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  wallet_balance: string;
  created_at: string;
}

interface PendingFunding {
  id: number;
  amount: string;
  reference: string;
  created_at: string;
  description: string | null;
  proof_of_payment_url: string | null;
  customer: { firstname: string; lastname: string; email: string };
}

interface Overview {
  total_customers: number;
  total_bookings: number;
  bookings_today: number;
  active_bookings_today: number;
  total_wallet_balance: string;
  revenue_today: string;
  pending_wallet_fundings: number;
  recent_activity: {
    id: number; type: string; amount: string; source: string; status: string;
    created_at: string; customer: { firstname: string; lastname: string } | null;
  }[];
}

interface WorkspacePlan {
  id: number;
  name: string;
  rooms: { id: number; name: string; seat_start: number; seat_end: number }[];
}

interface WorkspaceDuration {
  id: number;
  name: string;
  price: string;
}

type Tab = "overview" | "bookings" | "book" | "customers" | "fundings";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}

function SelectCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-lg border-2 p-3 transition-all ${
        selected
          ? "border-brand-primary bg-brand-secondary shadow-sm"
          : "border-gray-200 hover:border-brand-primary/40 hover:shadow-sm"
      }`}
    >
      {selected && (
        <span className="absolute top-1.5 right-1.5 bg-brand-primary text-white rounded-full p-0.5">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <p className="text-xs text-brand-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}

const navItems: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { tab: "bookings", label: "Bookings", icon: <CalendarDays size={18} /> },
  { tab: "book", label: "Book for Customer", icon: <PlusCircle size={18} /> },
  { tab: "customers", label: "Customers", icon: <Users size={18} /> },
  { tab: "fundings", label: "Wallet Fundings", icon: <Wallet size={18} /> },
];

export default function AdminDashboardPage() {
  const { admin, loading, sessionError, logout, retry } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState<Overview | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    getExistingPushSubscription().then((sub) => setPushEnabled(!!sub)).catch(() => {});
  }, [admin]);

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(async (endpoint) => {
          await adminApi.post("/admin/push/unsubscribe", { endpoint });
        });
        setPushEnabled(false);
      } else {
        const { public_key } = await adminApi.get<{ public_key: string }>("/admin/push/vapid-public-key");
        await subscribeToPush(public_key, async (subscription) => {
          await adminApi.post("/admin/push/subscribe", {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          });
        });
        setPushEnabled(true);
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Could not update notification settings");
    } finally {
      setPushBusy(false);
    }
  }
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [fundings, setFundings] = useState<PendingFunding[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Wallet adjustment modal state
  const [adjustCustomer, setAdjustCustomer] = useState<AdminCustomer | null>(null);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Book-for-customer form state
  const [bookCustomerQuery, setBookCustomerQuery] = useState("");
  const [bookCustomerResults, setBookCustomerResults] = useState<AdminCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [plans, setPlans] = useState<WorkspacePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkspacePlan | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ id: number; name: string; seat_start: number; seat_end: number } | null>(null);
  const [durations, setDurations] = useState<WorkspaceDuration[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<WorkspaceDuration | null>(null);
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [selectedSession, setSelectedSession] = useState<{ id: number; name: string } | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookSeat, setBookSeat] = useState<number | null>(null);
  const [bookAvailability, setBookAvailability] = useState<{ available_seats: number[]; session_name: string } | null>(null);
  const [checkingBookAvailability, setCheckingBookAvailability] = useState(false);
  const [chargeWallet, setChargeWallet] = useState(true);
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  useEffect(() => {
    if (!admin) return;
    setTabError(null);
    const timeout = setTimeout(() => {
      if (tab === "overview") {
        adminApi.get<Overview>("/admin/overview").then(setOverview).catch((e) => setTabError(e.message ?? "Could not load overview"));
      } else if (tab === "bookings") {
        adminApi.get<{ data: AdminBooking[] }>("/admin/bookings").then((r) => setBookings(r.data)).catch((e) => setTabError(e.message ?? "Could not load bookings"));
      } else if (tab === "customers") {
        adminApi
          .get<{ data: AdminCustomer[] }>(`/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
          .then((r) => setCustomers(r.data))
          .catch((e) => setTabError(e.message ?? "Could not load customers"));
      } else if (tab === "fundings") {
        adminApi.get<PendingFunding[]>("/admin/wallet-fundings/pending").then(setFundings).catch((e) => setTabError(e.message ?? "Could not load wallet fundings"));
      } else if (tab === "book") {
        adminApi.get<WorkspacePlan[]>("/admin/workspace/plans").then(setPlans).catch((e) => setTabError(e.message ?? "Could not load plans"));
      }
    }, 300); // debounce — matters most for the customers search-as-you-type
    return () => clearTimeout(timeout);
  }, [tab, admin, search]);

  async function changeStatus(booking: AdminBooking, status: string) {
    setBusyId(booking.id);
    setTabError(null);
    try {
      await adminApi.patch(`/admin/bookings/${booking.id}/status`, { status });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)));
    } catch (err) {
      setTabError(err instanceof Error ? err.message : "Could not update that booking's status");
    } finally {
      setBusyId(null);
    }
  }

  async function submitReschedule(booking: AdminBooking) {
    setRescheduleSubmitting(true);
    setRescheduleError(null);
    try {
      await adminApi.patch(`/admin/bookings/${booking.id}/reschedule`, { new_date: rescheduleDate });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, start_date: rescheduleDate } : b))
      );
      setRescheduleId(null);
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : "Could not reschedule");
    } finally {
      setRescheduleSubmitting(false);
    }
  }

  async function decideFunding(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setTabError(null);
    try {
      await adminApi.post(`/admin/wallet-fundings/${id}/${decision}`);
      setFundings((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setTabError(err instanceof Error ? err.message : "Could not process that funding request");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSearchCustomers() {
    if (!bookCustomerQuery.trim()) {
      setBookCustomerResults([]);
      return;
    }
    const r = await adminApi.get<{ data: AdminCustomer[] }>(`/admin/customers?search=${encodeURIComponent(bookCustomerQuery)}`);
    setBookCustomerResults(r.data);
  }

  // Auto-search as the admin types, debounced so it doesn't fire on every keystroke.
  useEffect(() => {
    if (selectedCustomer) return; // already picked one — no need to keep searching
    const timeout = setTimeout(() => {
      handleSearchCustomers();
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookCustomerQuery, selectedCustomer]);

  async function loadRooms(plan: WorkspacePlan) {
    setSelectedPlan(plan);
    setSelectedRoom(null);
    setSelectedDuration(null);
    setDurations([]);
    setSelectedSession(null);
    setBookDate("");
    setBookSeat(null);
    setBookAvailability(null);
    const s = await adminApi.get<{ id: number; name: string }[]>(`/admin/workspace/plans/${plan.id}/sessions`);
    setSessions(s);
  }

  async function loadDurations(plan: WorkspacePlan, room: { id: number; name: string; seat_start: number; seat_end: number }) {
    setSelectedRoom(room);
    setSelectedDuration(null);
    setBookSeat(null);
    setBookAvailability(null);
    const r = await adminApi.get<WorkspaceDuration[]>(`/admin/workspace/plans/${plan.id}/durations?room_id=${room.id}`);
    setDurations(r);
  }

  // Live seat availability — mirrors the customer booking flow exactly.
  useEffect(() => {
    setBookAvailability(null);
    setBookSeat(null);
    if (!selectedPlan || !selectedRoom || !selectedDuration || !selectedSession || !bookDate) return;
    setCheckingBookAvailability(true);
    adminApi
      .get<{ available_seats: number[]; session_name: string }>(
        `/admin/workspace/availability?plan_id=${selectedPlan.id}&room_id=${selectedRoom.id}&plan_duration_id=${selectedDuration.id}&workspace_session_id=${selectedSession.id}&date=${bookDate}`
      )
      .then(setBookAvailability)
      .catch((e) => setBookError(e instanceof Error ? e.message : "Could not check availability"))
      .finally(() => setCheckingBookAvailability(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, selectedRoom, selectedDuration, selectedSession, bookDate]);

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustCustomer) return;
    setAdjustSubmitting(true);
    setAdjustError(null);
    try {
      await adminApi.post(`/admin/customers/${adjustCustomer.id}/wallet/adjust`, {
        type: adjustType,
        amount: Number(adjustAmount),
        description: adjustDescription,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === adjustCustomer.id
            ? {
                ...c,
                wallet_balance: String(
                  adjustType === "credit"
                    ? Number(c.wallet_balance) + Number(adjustAmount)
                    : Number(c.wallet_balance) - Number(adjustAmount)
                ),
              }
            : c
        )
      );
      setAdjustCustomer(null);
      setAdjustAmount("");
      setAdjustDescription("");
    } catch (err) {
      setAdjustError(err instanceof Error ? err.message : "Could not adjust wallet");
    } finally {
      setAdjustSubmitting(false);
    }
  }

  async function submitBooking() {
    if (!selectedCustomer || !selectedPlan || !selectedRoom || !selectedDuration || !selectedSession || !bookDate || !bookSeat) return;
    setBookSubmitting(true);
    setBookMessage(null);
    setBookError(null);
    try {
      const result = await adminApi.post<{ message: string }>("/admin/bookings/create-for-customer", {
        customer_id: selectedCustomer.id,
        plan_id: selectedPlan.id,
        plan_duration_id: selectedDuration.id,
        room_id: selectedRoom.id,
        workspace_session_id: selectedSession.id,
        seat_number: Number(bookSeat),
        start_date: bookDate,
        charge_wallet: chargeWallet,
      });
      setBookMessage(result.message ?? "Booking created");
      setSelectedCustomer(null);
      setSelectedPlan(null);
      setSelectedRoom(null);
      setSelectedDuration(null);
      setSelectedSession(null);
      setBookDate("");
      setBookSeat(null);
    } catch (err) {
      setBookError(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setBookSubmitting(false);
    }
  }

  if (loading) return null;

  if (sessionError) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="mb-4 text-brand-muted">Couldn't verify your session — this is usually a temporary connection issue, not a logout.</p>
          <button onClick={retry} className="text-brand-primary font-semibold">Try again</button>
        </div>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="mb-4 text-brand-muted">Admin sign-in required.</p>
          <a href="/admin/login" className="text-brand-primary font-semibold">Go to admin login</a>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-brand-dark text-white flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={28} height={28} />
          <span className="font-bold">ArewaTecHub</span>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === item.tab ? "bg-brand-primary text-white" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10">
          <button
            onClick={togglePush}
            disabled={pushBusy}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white/70 hover:text-white disabled:opacity-60"
          >
            {pushEnabled ? <Bell size={16} className="text-brand-primary" /> : <BellOff size={16} />}
            {pushBusy ? "Updating…" : pushEnabled ? "Notifications on" : "Enable notifications"}
          </button>
          {pushError && <p className="px-5 pb-2 text-xs text-red-300">{pushError}</p>}
          <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 text-sm text-white/60 hover:text-white border-t border-white/10">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-dark text-white flex justify-around py-2 z-20">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => setTab(item.tab)}
            className={`flex flex-col items-center gap-1 text-[10px] px-2 py-1 rounded ${tab === item.tab ? "text-brand-primary" : "text-white/60"}`}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-8 pb-20 md:pb-8 overflow-x-auto">
        <h1 className="text-xl font-bold text-brand-dark mb-6 capitalize">
          {navItems.find((n) => n.tab === tab)?.label}
        </h1>

        {tabError && (
          <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            {tabError}
          </div>
        )}

        {tab === "overview" && overview && (
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Customers" value={overview.total_customers} />
              <StatCard label="Total Bookings" value={overview.total_bookings} />
              <StatCard label="Bookings Today" value={overview.bookings_today} />
              <StatCard label="Active Today" value={overview.active_bookings_today} />
              <StatCard label="Total Wallet Balance" value={`₦${Number(overview.total_wallet_balance).toLocaleString()}`} />
              <StatCard label="Revenue Today" value={`₦${Number(overview.revenue_today).toLocaleString()}`} />
              <StatCard label="Pending Fundings" value={overview.pending_wallet_fundings} />
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-brand-dark mb-3">Recent Activity</h2>
              <ul className="text-sm divide-y">
                {overview.recent_activity.map((a) => (
                  <li key={a.id} className="py-2 flex justify-between">
                    <span>
                      {a.customer ? `${a.customer.firstname} ${a.customer.lastname}` : "Unknown"} —{" "}
                      <span className="capitalize text-brand-muted">{a.source.replace(/_/g, " ")}</span>
                    </span>
                    <span className={a.type === "credit" ? "text-green-600" : "text-red-600"}>
                      {a.type === "credit" ? "+" : "-"}₦{Number(a.amount).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="bg-white rounded-xl border p-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-brand-muted border-b">
                  <th className="py-2">Customer</th><th>Plan</th><th>Room</th><th>Seat</th><th>Date</th><th>Price</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.customer.firstname} {b.customer.lastname}<br /><span className="text-xs text-brand-muted">{b.customer.email}</span></td>
                    <td>{b.plan.name}</td>
                    <td>{b.room.name}</td>
                    <td>{b.seat_number}</td>
                    <td>{b.start_date}</td>
                    <td>₦{Number(b.price).toLocaleString()}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="space-y-1">
                      <select
                        disabled={busyId === b.id}
                        value={b.status}
                        onChange={(e) => changeStatus(b, e.target.value)}
                        className="border rounded text-xs px-1 py-1 block"
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="completed">completed</option>
                      </select>
                      {rescheduleId === b.id ? (
                        <div className="flex gap-1">
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="border rounded text-xs px-1 py-1"
                          />
                          <button
                            disabled={rescheduleSubmitting}
                            onClick={() => submitReschedule(b)}
                            className="text-xs bg-brand-primary text-white px-2 rounded disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button onClick={() => setRescheduleId(null)} className="text-xs text-brand-muted">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRescheduleId(b.id); setRescheduleDate(b.start_date); }}
                          className="text-xs text-brand-primary hover:underline"
                        >
                          Reschedule
                        </button>
                      )}
                      {rescheduleError && rescheduleId === b.id && (
                        <p className="text-xs text-red-600 max-w-[140px]">{rescheduleError}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-brand-muted">No bookings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "book" && (
          <div className="max-w-2xl bg-white rounded-xl border p-6">
            {bookMessage && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{bookMessage}</p>}
            {bookError && <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{bookError}</p>}

            <label className="block text-sm font-medium mb-1 flex items-center gap-2"><Search size={14} /> Customer</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between border rounded-md px-3 py-2 mb-5 bg-brand-secondary">
                <span className="text-sm">
                  {selectedCustomer.firstname} {selectedCustomer.lastname} ({selectedCustomer.email})
                  <br />
                  <span className="text-xs text-brand-muted">
                    Wallet balance: <strong className="text-brand-dark">₦{Number(selectedCustomer.wallet_balance).toLocaleString()}</strong>
                  </span>
                </span>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-brand-primary">Change</button>
              </div>
            ) : (
              <div className="mb-5">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    value={bookCustomerQuery}
                    onChange={(e) => setBookCustomerQuery(e.target.value)}
                    placeholder="Search name, email, or phone — results appear as you type"
                    className="w-full border rounded-md pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                {bookCustomerResults.length > 0 && (
                  <ul className="border rounded-md mt-2 divide-y max-h-40 overflow-y-auto">
                    {bookCustomerResults.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => { setSelectedCustomer(c); setBookCustomerResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          {c.firstname} {c.lastname} — {c.email}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Sparkles size={14} className="text-brand-primary" /> Plan</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {plans.map((p) => (
                <SelectCard key={p.id} selected={selectedPlan?.id === p.id} onClick={() => loadRooms(p)}>
                  <p className="text-sm font-semibold text-brand-dark">{p.name}</p>
                </SelectCard>
              ))}
            </div>

            {selectedPlan && (
              <>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Users size={14} className="text-brand-primary" /> Room</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {selectedPlan.rooms.map((r) => (
                    <SelectCard key={r.id} selected={selectedRoom?.id === r.id} onClick={() => loadDurations(selectedPlan, r)}>
                      <p className="text-sm font-semibold text-brand-dark">{r.name}</p>
                    </SelectCard>
                  ))}
                </div>
              </>
            )}

            {selectedRoom && (
              <>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2"><CalendarDays size={14} className="text-brand-primary" /> Duration</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {durations.map((d) => (
                    <SelectCard key={d.id} selected={selectedDuration?.id === d.id} onClick={() => setSelectedDuration(d)}>
                      <p className="text-sm font-semibold text-brand-dark">{d.name}</p>
                      <p className="text-xs text-brand-primary font-semibold">₦{Number(d.price).toLocaleString()}</p>
                    </SelectCard>
                  ))}
                </div>

                <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Clock size={14} className="text-brand-primary" /> Session</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {sessions.map((s) => (
                    <SelectCard key={s.id} selected={selectedSession?.id === s.id} onClick={() => setSelectedSession(s)}>
                      <p className="text-sm font-semibold text-brand-dark">{s.name}</p>
                    </SelectCard>
                  ))}
                </div>
              </>
            )}

            {selectedSession && (
              <>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2"><CalendarDays size={14} className="text-brand-primary" /> Date</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="border rounded-md px-3 py-2 mb-5 text-sm"
                />
              </>
            )}

            {bookDate && (
              <>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2"><Armchair size={14} className="text-brand-primary" /> Seat</label>
                {checkingBookAvailability && <p className="text-sm text-brand-muted mb-4">Checking availability…</p>}
                {!checkingBookAvailability && bookAvailability && selectedRoom && (
                  <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 mb-5">
                    {Array.from({ length: selectedRoom.seat_end - selectedRoom.seat_start + 1 }, (_, i) => selectedRoom.seat_start + i).map((s) => {
                      const isAvailable = bookAvailability.available_seats.includes(s);
                      const isSelected = bookSeat === s;
                      return (
                        <button
                          key={s}
                          disabled={!isAvailable}
                          onClick={() => setBookSeat(s)}
                          className={`aspect-square rounded-md text-xs font-semibold flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-brand-primary text-white scale-105 shadow"
                              : isAvailable
                              ? "bg-gray-100 hover:bg-brand-secondary text-brand-dark"
                              : "bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {bookSeat !== null && (
              <>
                <label className="flex items-center gap-2 text-sm mb-5">
                  <input type="checkbox" checked={chargeWallet} onChange={(e) => setChargeWallet(e.target.checked)} />
                  Charge customer&apos;s wallet ({selectedDuration ? `₦${Number(selectedDuration.price).toLocaleString()}` : "select duration"}) — uncheck to comp for free
                </label>

                <button
                  onClick={submitBooking}
                  disabled={bookSubmitting || !selectedCustomer || !selectedDuration || !selectedSession || !bookDate || bookSeat === null}
                  className="w-full bg-brand-primary text-white rounded-full py-3 font-semibold disabled:opacity-60"
                >
                  {bookSubmitting ? "Creating…" : "Create Booking"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "customers" && (
          <div className="bg-white rounded-xl border p-5">
            <div className="flex gap-2 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, or phone"
                className="border rounded-md px-3 py-2 text-sm flex-1 max-w-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left text-brand-muted border-b">
                    <th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Wallet</th><th>Joined</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.firstname} {c.lastname}</td>
                      <td>{c.email}</td>
                      <td>{c.phone ?? "—"}</td>
                      <td>₦{Number(c.wallet_balance).toLocaleString()}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button onClick={() => setAdjustCustomer(c)} className="text-xs text-brand-primary hover:underline">
                          Adjust Wallet
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-brand-muted">No customers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "fundings" && (
          <div className="space-y-4">
            {fundings.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border p-5 flex flex-col sm:flex-row gap-4">
                {f.proof_of_payment_url ? (
                  <a href={f.proof_of_payment_url} target="_blank" rel="noreferrer" className="shrink-0">
                    <img
                      src={f.proof_of_payment_url}
                      alt="Proof of payment"
                      className="w-28 h-28 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        e.currentTarget.insertAdjacentHTML(
                          "afterend",
                          '<p class="text-xs text-red-600 w-28">Image link broken — check `php artisan storage:link` was run on the server.</p>'
                        );
                      }}
                    />
                  </a>
                ) : (
                  <div className="w-28 h-28 shrink-0 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-brand-muted text-center p-2">
                    No receipt on file
                  </div>
                )}
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-brand-dark">{f.customer.firstname} {f.customer.lastname}</p>
                  <p className="text-xs text-brand-muted mb-2">{f.customer.email}</p>
                  <p><span className="text-brand-muted">Amount:</span> ₦{Number(f.amount).toLocaleString()}</p>
                  <p><span className="text-brand-muted">Reference:</span> <span className="text-xs">{f.reference}</span></p>
                  <p><span className="text-brand-muted">Requested:</span> {new Date(f.created_at).toLocaleString()}</p>
                  {f.description && <p className="mt-1"><span className="text-brand-muted">Notes:</span> {f.description}</p>}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <button disabled={busyId === f.id} onClick={() => decideFunding(f.id, "approve")} className="text-xs bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60">Approve</button>
                  <button disabled={busyId === f.id} onClick={() => decideFunding(f.id, "reject")} className="text-xs bg-red-600 text-white px-4 py-2 rounded disabled:opacity-60">Reject</button>
                </div>
              </div>
            ))}
            {fundings.length === 0 && (
              <div className="bg-white rounded-xl border p-6 text-center text-brand-muted text-sm">
                Nothing pending — dedicated account transfers auto-credit via webhook.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Wallet adjustment modal */}
      {adjustCustomer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
          <form onSubmit={submitAdjustment} className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-brand-dark mb-1">Adjust Wallet</h3>
            <p className="text-sm text-brand-muted mb-4">{adjustCustomer.firstname} {adjustCustomer.lastname} — current balance ₦{Number(adjustCustomer.wallet_balance).toLocaleString()}</p>

            {adjustError && <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{adjustError}</p>}

            <div className="flex gap-4 text-sm mb-3">
              <label className="flex items-center gap-2"><input type="radio" checked={adjustType === "credit"} onChange={() => setAdjustType("credit")} /> Credit (add cash)</label>
              <label className="flex items-center gap-2"><input type="radio" checked={adjustType === "debit"} onChange={() => setAdjustType("debit")} /> Debit</label>
            </div>

            <label className="block text-sm font-medium mb-1">Amount (₦)</label>
            <input
              type="number"
              required
              min={1}
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mb-3 text-sm"
            />

            <label className="block text-sm font-medium mb-1">Reason</label>
            <input
              required
              placeholder="e.g. Cash payment at front desk"
              value={adjustDescription}
              onChange={(e) => setAdjustDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mb-5 text-sm"
            />

            <div className="flex gap-2">
              <button type="button" onClick={() => setAdjustCustomer(null)} className="flex-1 border rounded-full py-2 text-sm font-semibold">
                Cancel
              </button>
              <button disabled={adjustSubmitting} className="flex-1 bg-brand-primary text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
                {adjustSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
