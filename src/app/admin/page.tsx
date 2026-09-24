"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { adminApi } from "@/lib/adminApi";
import {
  LayoutDashboard, CalendarDays, Users, Wallet, PlusCircle, LogOut, Search,
  Sparkles, Clock, Armchair, Check, Bell, BellOff, GraduationCap, BookOpen, UserCog, KeyRound,
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

interface FundingHistoryRow {
  id: number;
  amount: string;
  reference: string;
  status: string;
  source: string;
  created_at: string;
  customer: { firstname: string; lastname: string; email: string } | null;
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

interface TeenRegistration {
  id: number;
  child_firstname: string;
  child_lastname: string;
  child_age: number;
  school: string | null;
  parent_name: string;
  parent_phone: string;
  registration_payment_status: string;
  vip_payment_status: string;
  created_at: string;
  customer: { firstname: string; lastname: string; email: string; phone: string | null };
}

interface CashierRow {
  id: number;
  name: string | null;
  email: string;
  created_at: string;
  creator?: { name: string | null; email: string } | null;
}

interface AcademyAdminRow {
  id: number;
  track_selected: string;
  programme_selected: string;
  bootcamp_option: string;
  status_type: string;
  amount_due: string;
  amount_paid: string;
  payment_status: string;
  application_status: string;
  created_at: string;
  batch: { name: string };
  customer: { firstname: string; lastname: string; email: string; phone: string | null };
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

type Tab = "overview" | "bookings" | "book" | "customers" | "fundings" | "teenprogram" | "academy" | "cashiers";

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

const navItems: { tab: Tab; label: string; icon: React.ReactNode; roles: ("admin" | "cashier")[] }[] = [
  { tab: "overview", label: "Overview", icon: <LayoutDashboard size={18} />, roles: ["admin"] },
  { tab: "bookings", label: "Bookings", icon: <CalendarDays size={18} />, roles: ["admin", "cashier"] },
  { tab: "book", label: "Book for Customer", icon: <PlusCircle size={18} />, roles: ["admin", "cashier"] },
  { tab: "customers", label: "Customers", icon: <Users size={18} />, roles: ["admin"] },
  { tab: "fundings", label: "Wallet Fundings", icon: <Wallet size={18} />, roles: ["admin", "cashier"] },
  { tab: "teenprogram", label: "Future Builders Camp", icon: <GraduationCap size={18} />, roles: ["admin"] },
  { tab: "academy", label: "Digital Academy", icon: <BookOpen size={18} />, roles: ["admin"] },
  { tab: "cashiers", label: "Manage Cashiers", icon: <UserCog size={18} />, roles: ["admin"] },
];

export default function AdminDashboardPage() {
  const { admin, loading, sessionError, logout, retry } = useAdminAuth();
  const visibleNavItems = navItems.filter((item) => !admin || item.roles.includes(admin.role));
  const [tab, setTab] = useState<Tab>("overview");

  // Redirect off a tab the current role can't see — matters right after
  // login, since "overview" (the default) is admin-only.
  useEffect(() => {
    if (admin && !visibleNavItems.some((item) => item.tab === tab)) {
      setTab(visibleNavItems[0]?.tab ?? "bookings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

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
  const [fundingView, setFundingView] = useState<"pending" | "history">("pending");
  const [fundingHistory, setFundingHistory] = useState<FundingHistoryRow[]>([]);
  const [teenRegistrations, setTeenRegistrations] = useState<TeenRegistration[]>([]);
  const [academyEnrollments, setAcademyEnrollments] = useState<AcademyAdminRow[]>([]);
  const [cashiers, setCashiers] = useState<CashierRow[]>([]);
  const [cashierForm, setCashierForm] = useState({ name: "", email: "", password: "" });
  const [cashierSubmitting, setCashierSubmitting] = useState(false);
  const [cashierError, setCashierError] = useState<string | null>(null);
  const [cashierMessage, setCashierMessage] = useState<string | null>(null);
  const [removingCashierId, setRemovingCashierId] = useState<number | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);
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
      } else if (tab === "teenprogram") {
        adminApi.get<{ data: TeenRegistration[] }>("/admin/teen-program").then((r) => setTeenRegistrations(r.data)).catch((e) => setTabError(e.message ?? "Could not load registrations"));
      } else if (tab === "academy") {
        adminApi.get<{ data: AcademyAdminRow[] }>("/admin/academy").then((r) => setAcademyEnrollments(r.data)).catch((e) => setTabError(e.message ?? "Could not load enrollments"));
      } else if (tab === "cashiers") {
        adminApi.get<CashierRow[]>("/admin/cashiers").then(setCashiers).catch((e) => setTabError(e.message ?? "Could not load cashiers"));
      } else if (tab === "book") {
        adminApi.get<WorkspacePlan[]>("/admin/workspace/plans").then(setPlans).catch((e) => setTabError(e.message ?? "Could not load plans"));
      }
    }, 300); // debounce — matters most for the customers search-as-you-type
    return () => clearTimeout(timeout);
  }, [tab, admin, search]);

  useEffect(() => {
    if (!admin || tab !== "fundings" || fundingView !== "history") return;
    adminApi
      .get<{ data: FundingHistoryRow[] }>("/admin/wallet-fundings/history")
      .then((r) => setFundingHistory(r.data))
      .catch((e) => setTabError(e.message ?? "Could not load funding history"));
  }, [admin, tab, fundingView]);

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

  async function handleCreateCashier(e: React.FormEvent) {
    e.preventDefault();
    setCashierSubmitting(true);
    setCashierError(null);
    setCashierMessage(null);
    try {
      const result = await adminApi.post<{ message: string; cashier: CashierRow }>("/admin/cashiers", cashierForm);
      setCashiers((prev) => [result.cashier, ...prev]);
      setCashierMessage(result.message);
      setCashierForm({ name: "", email: "", password: "" });
    } catch (err) {
      setCashierError(err instanceof Error ? err.message : "Could not create cashier account");
    } finally {
      setCashierSubmitting(false);
    }
  }

  async function handleRemoveCashier(cashierId: number) {
    setRemovingCashierId(cashierId);
    setCashierError(null);
    try {
      await adminApi.delete(`/admin/cashiers/${cashierId}`);
      setCashiers((prev) => prev.filter((c) => c.id !== cashierId));
    } catch (err) {
      setCashierError(err instanceof Error ? err.message : "Could not remove cashier account");
    } finally {
      setRemovingCashierId(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSubmitting(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const result = await adminApi.post<{ message: string }>("/admin/password/update", passwordForm);
      setPasswordMessage(result.message);
      setPasswordForm({ current_password: "", new_password: "", new_password_confirmation: "" });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleAdminReceiptDownload(
    kind: "academy" | "bookings" | "wallet-fundings",
    id: number,
    label: string
  ) {
    setDownloadingReceiptId(id);
    const filenamePrefix = kind === "academy" ? "Academy" : kind === "bookings" ? "Booking" : "Wallet";
    try {
      await adminApi.download(`/admin/${kind}/${id}/receipt/pdf`, `ArewaTecHub_${filenamePrefix}_Receipt_${label}.pdf`);
    } catch (e) {
      setTabError(e instanceof Error ? e.message : "Could not download receipt");
    } finally {
      setDownloadingReceiptId(null);
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
          {visibleNavItems.map((item) => (
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
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white/70 hover:text-white"
          >
            <KeyRound size={16} /> Change password
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 text-sm text-white/60 hover:text-white border-t border-white/10">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-dark text-white flex justify-around py-2 z-20">
        {visibleNavItems.map((item) => (
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
          {visibleNavItems.find((n) => n.tab === tab)?.label}
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
                  <th className="py-2">Customer</th><th>Plan</th><th>Room</th><th>Seat</th><th>Date</th><th>Price</th><th>Status</th><th>Receipt</th><th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="py-2">{b.customer?.firstname} {b.customer?.lastname}<br /><span className="text-xs text-brand-muted">{b.customer?.email ?? "—"}</span></td>
                    <td>{b.plan?.name ?? "—"}</td>
                    <td>{b.room?.name ?? "—"}</td>
                    <td>{b.seat_number}</td>
                    <td>{b.start_date}</td>
                    <td>₦{Number(b.price).toLocaleString()}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      {b.status === "confirmed" ? (
                        <button
                          onClick={() => handleAdminReceiptDownload("bookings", b.id, `${b.customer?.firstname}_${b.customer?.lastname}`)}
                          disabled={downloadingReceiptId === b.id}
                          className="text-brand-primary text-xs font-medium hover:underline disabled:opacity-60"
                        >
                          {downloadingReceiptId === b.id ? "Preparing…" : "Download"}
                        </button>
                      ) : (
                        <span className="text-xs text-brand-muted">—</span>
                      )}
                    </td>
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
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setFundingView("pending")}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full ${fundingView === "pending" ? "bg-brand-primary text-white" : "bg-white border text-brand-muted"}`}
              >
                Pending
              </button>
              <button
                onClick={() => setFundingView("history")}
                className={`text-sm font-semibold px-4 py-1.5 rounded-full ${fundingView === "history" ? "bg-brand-primary text-white" : "bg-white border text-brand-muted"}`}
              >
                History
              </button>
            </div>

            {fundingView === "history" ? (
              <div className="bg-white rounded-xl border p-5 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-brand-muted border-b">
                      <th className="py-2">Customer</th><th>Amount</th><th>Source</th><th>Status</th><th>Date</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundingHistory.map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="py-2">{f.customer?.firstname} {f.customer?.lastname}<br /><span className="text-xs text-brand-muted">{f.customer?.email ?? "—"}</span></td>
                        <td>₦{Number(f.amount).toLocaleString()}</td>
                        <td className="text-xs">{f.source.replace(/_/g, " ")}</td>
                        <td>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${f.status === "successful" ? "bg-green-100 text-green-800" : f.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="text-xs text-brand-muted">{new Date(f.created_at).toLocaleString()}</td>
                        <td>
                          {f.status === "successful" ? (
                            <button
                              onClick={() => handleAdminReceiptDownload("wallet-fundings", f.id, `${f.customer?.firstname}_${f.customer?.lastname}`)}
                              disabled={downloadingReceiptId === f.id}
                              className="text-brand-primary text-xs font-medium hover:underline disabled:opacity-60"
                            >
                              {downloadingReceiptId === f.id ? "Preparing…" : "Download"}
                            </button>
                          ) : (
                            <span className="text-xs text-brand-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {fundingHistory.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-brand-muted">No funding history yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
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
                  <p className="font-semibold text-brand-dark">{f.customer?.firstname} {f.customer?.lastname}</p>
                  <p className="text-xs text-brand-muted mb-2">{f.customer?.email ?? "—"}</p>
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
              </>
            )}
          </div>
        )}

        {tab === "teenprogram" && (
          <div className="bg-white rounded-xl border p-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-brand-muted border-b">
                  <th className="py-2">Child</th><th>Parent</th><th>Registration Fee</th><th>VIP</th><th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {teenRegistrations.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{r.child_firstname} {r.child_lastname}<br /><span className="text-xs text-brand-muted">Age {r.child_age} • {r.school || "—"}</span></td>
                    <td>{r.customer?.firstname} {r.customer?.lastname}<br /><span className="text-xs text-brand-muted">{r.customer?.email ?? "—"}</span></td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.registration_payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {r.registration_payment_status}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.vip_payment_status === "paid" ? "bg-brand-secondary text-brand-primary" : "bg-gray-100 text-brand-muted"}`}>
                        {r.vip_payment_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="text-xs text-brand-muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {teenRegistrations.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-brand-muted">No registrations yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "academy" && (
          <div className="bg-white rounded-xl border p-5 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-brand-muted border-b">
                  <th className="py-2">Student</th><th>Batch / Track</th><th>Package</th><th>Amount Due</th><th>Status</th><th>Enrolled</th><th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {academyEnrollments.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2">{e.customer?.firstname} {e.customer?.lastname}<br /><span className="text-xs text-brand-muted">{e.customer?.email ?? "—"}</span></td>
                    <td>{e.batch?.name ?? "—"}<br /><span className="text-xs text-brand-muted">{e.track_selected}</span></td>
                    <td className="text-xs">{e.bootcamp_option === "bootcamp" ? "Bootcamp" : "Non-Bootcamp"}<br /><span className="text-brand-muted">{e.status_type}</span></td>
                    <td>₦{Number(e.amount_due).toLocaleString()}</td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${e.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {e.payment_status}
                      </span>
                    </td>
                    <td className="text-xs text-brand-muted">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td>
                      {e.payment_status === "paid" ? (
                        <button
                          onClick={() => handleAdminReceiptDownload("academy", e.id, `${e.customer?.firstname}_${e.customer?.lastname}`)}
                          disabled={downloadingReceiptId === e.id}
                          className="text-brand-primary text-xs font-medium hover:underline disabled:opacity-60"
                        >
                          {downloadingReceiptId === e.id ? "Preparing…" : "Download"}
                        </button>
                      ) : (
                        <span className="text-xs text-brand-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {academyEnrollments.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-brand-muted">No enrollments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "cashiers" && (
          <div className="space-y-6">
            <form onSubmit={handleCreateCashier} className="bg-white rounded-xl border p-5 max-w-md space-y-3">
              <h2 className="font-semibold text-brand-dark mb-1">Create Cashier Account</h2>
              {cashierMessage && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{cashierMessage}</p>}
              {cashierError && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{cashierError}</p>}
              <input required placeholder="Full name" value={cashierForm.name} onChange={(e) => setCashierForm((f) => ({ ...f, name: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <input required type="email" placeholder="Email" value={cashierForm.email} onChange={(e) => setCashierForm((f) => ({ ...f, email: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <input required type="password" minLength={8} placeholder="Password (min. 8 characters)" value={cashierForm.password} onChange={(e) => setCashierForm((f) => ({ ...f, password: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm" />
              <button disabled={cashierSubmitting} className="bg-brand-primary text-white rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60">
                {cashierSubmitting ? "Creating…" : "Create Cashier"}
              </button>
              <p className="text-xs text-brand-muted">
                Cashiers can log in, book for customers, view bookings, and accept manual wallet fundings —
                nothing else. Only a full admin can create or remove a cashier account.
              </p>
            </form>

            <div className="bg-white rounded-xl border p-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-left text-brand-muted border-b">
                    <th className="py-2">Name</th><th>Email</th><th>Created By</th><th>Created</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {cashiers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2">{c.name ?? "—"}</td>
                      <td>{c.email}</td>
                      <td className="text-xs text-brand-muted">{c.creator?.name ?? c.creator?.email ?? "—"}</td>
                      <td className="text-xs text-brand-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleRemoveCashier(c.id)}
                          disabled={removingCashierId === c.id}
                          className="text-red-600 text-xs font-medium hover:underline disabled:opacity-60"
                        >
                          {removingCashierId === c.id ? "Removing…" : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cashiers.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-brand-muted">No cashier accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Change password modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-brand-dark mb-4">Change Password</h3>
            {passwordMessage && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-3">{passwordMessage}</p>}
            {passwordError && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">{passwordError}</p>}
            <input
              required type="password" placeholder="Current password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm mb-3"
            />
            <input
              required type="password" minLength={8} placeholder="New password (min. 8 characters)"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm mb-3"
            />
            <input
              required type="password" placeholder="Confirm new password"
              value={passwordForm.new_password_confirmation}
              onChange={(e) => setPasswordForm((f) => ({ ...f, new_password_confirmation: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowChangePassword(false)} className="flex-1 border rounded-full py-2 text-sm font-semibold">
                Close
              </button>
              <button disabled={passwordSubmitting} className="flex-1 bg-brand-primary text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
                {passwordSubmitting ? "Saving…" : "Update"}
              </button>
            </div>
          </form>
        </div>
      )}

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
