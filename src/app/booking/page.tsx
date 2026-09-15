"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardShell } from "@/components/DashboardShell";
import type { Availability, PlanDuration, Room, WorkspacePlan, WorkspaceSessionOption } from "@/types";
import { Check, Users, Sparkles, CalendarDays, Armchair, Wallet, Clock } from "lucide-react";

function formatNaira(amount: number | string) {
  return `₦${Number(amount).toLocaleString()}`;
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
      className={`relative text-left rounded-xl border-2 p-4 transition-all ${
        selected
          ? "border-brand-primary bg-brand-secondary shadow-sm"
          : "border-gray-200 hover:border-brand-primary/40 hover:shadow-sm"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 bg-brand-primary text-white rounded-full p-0.5">
          <Check size={14} strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function StepHeader({ n, title, icon }: { n: number; title: string; icon: React.ReactNode }) {
  return (
    <h2 className="font-semibold text-brand-dark mb-3 flex items-center gap-2">
      <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs flex items-center justify-center font-bold">
        {n}
      </span>
      {icon}
      {title}
    </h2>
  );
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BookingPage() {
  const { customer, loading, refreshCustomer } = useAuth();

  const [plans, setPlans] = useState<WorkspacePlan[]>([]);
  const [plan, setPlan] = useState<WorkspacePlan | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [room, setRoom] = useState<Room | null>(null);

  const [durations, setDurations] = useState<PlanDuration[]>([]);
  const [duration, setDuration] = useState<PlanDuration | null>(null);

  const [sessions, setSessions] = useState<WorkspaceSessionOption[]>([]);
  const [session, setSession] = useState<WorkspaceSessionOption | null>(null);

  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [seat, setSeat] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [insufficientFunds, setInsufficientFunds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<WorkspacePlan[]>("/workspace/plans").then(setPlans).catch(() => {});
  }, []);

  useEffect(() => {
    setRoom(null);
    setRooms([]);
    setDurations([]);
    setDuration(null);
    setSessions([]);
    setSession(null);
    resetAvailability();
    if (!plan) return;
    api.get<Room[]>(`/workspace/plans/${plan.id}/rooms`).then(setRooms).catch(() => {});
    api.get<WorkspaceSessionOption[]>(`/workspace/plans/${plan.id}/sessions`).then(setSessions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    setDuration(null);
    setDurations([]);
    resetAvailability();
    if (!plan || !room) return;
    api
      .get<PlanDuration[]>(`/workspace/plans/${plan.id}/durations?room_id=${room.id}`)
      .then(setDurations)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, plan]);

  function resetAvailability() {
    setAvailability(null);
    setSeat(null);
  }

  useEffect(() => {
    resetAvailability();
    if (!plan || !room || !duration || !session || !date) return;
    setCheckingAvailability(true);
    setError(null);
    api
      .get<Availability>(
        `/workspace/availability?plan_id=${plan.id}&room_id=${room.id}&plan_duration_id=${duration.id}&workspace_session_id=${session.id}&date=${date}`
      )
      .then(setAvailability)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not check availability"))
      .finally(() => setCheckingAvailability(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, room, duration, session, date]);

  async function handleBook() {
    if (!plan || !room || !duration || !session || !date || seat === null) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    setInsufficientFunds(null);
    try {
      const data = await api.post<{ message: string; wallet_balance: string }>("/bookings", {
        plan_id: plan.id,
        plan_duration_id: duration.id,
        room_id: room.id,
        workspace_session_id: session.id,
        seat_number: seat,
        start_date: date,
      });

      setMessage(data.message ?? "Booking confirmed!");
      setPlan(null);
      resetAvailability();
      await refreshCustomer(); // updates customer.wallet_balance everywhere it's shown
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.shortfall !== undefined) {
        setInsufficientFunds(err.shortfall);
      } else {
        setError(err instanceof ApiError ? err.message : "Could not create booking");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!customer) {
    return (
      <main className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <p className="mb-4 text-brand-muted">Sign in to book a workspace.</p>
            <a href="/login" className="text-brand-primary font-semibold">Go to sign in</a>
          </div>
        </div>
      </main>
    );
  }

  const seats = room ? Array.from({ length: room.seat_end - room.seat_start + 1 }, (_, i) => room.seat_start + i) : [];
  const restrictedDayName = plan?.restricted_weekday !== null && plan?.restricted_weekday !== undefined
    ? WEEKDAY_NAMES[plan.restricted_weekday]
    : null;

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto w-full p-6 grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark mb-1">Book a Workspace</h1>
          <p className="text-brand-muted mb-6">Pick a plan, a workspace, a session, and your seat.</p>

          {message && (
            <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md px-4 py-3">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              {error}
            </div>
          )}

          <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
            <StepHeader n={1} title="Choose a plan" icon={<Sparkles size={16} className="text-brand-primary" />} />
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {plans.map((p) => (
                <SelectCard key={p.id} selected={plan?.id === p.id} onClick={() => setPlan(p)}>
                  <p className="font-semibold text-brand-dark">{p.name}</p>
                  {p.promo_fixed_end_date && (
                    <p className="text-xs text-brand-primary mt-1">
                      Runs until {new Date(p.promo_fixed_end_date).toLocaleDateString()}
                    </p>
                  )}
                  {p.restricted_weekday !== null && (
                    <p className="text-xs text-brand-primary mt-1">
                      {WEEKDAY_NAMES[p.restricted_weekday]}s only
                    </p>
                  )}
                </SelectCard>
              ))}
              {plans.length === 0 && <p className="text-sm text-brand-muted">Loading plans…</p>}
            </div>
          </section>

          {plan && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
              <StepHeader n={2} title="Choose a workspace" icon={<Users size={16} className="text-brand-primary" />} />
              <div className="grid sm:grid-cols-3 gap-3">
                {rooms.map((r) => (
                  <SelectCard key={r.id} selected={room?.id === r.id} onClick={() => setRoom(r)}>
                    <p className="font-semibold text-brand-dark">{r.name}</p>
                    <p className="text-xs text-brand-muted mt-1">
                      {r.seat_end - r.seat_start + 1} seats
                    </p>
                  </SelectCard>
                ))}
              </div>
            </section>
          )}

          {plan && room && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
              <StepHeader n={3} title="Choose a duration" icon={<CalendarDays size={16} className="text-brand-primary" />} />
              <div className="grid sm:grid-cols-3 gap-3">
                {durations.map((d) => (
                  <SelectCard key={d.id} selected={duration?.id === d.id} onClick={() => setDuration(d)}>
                    <p className="font-semibold text-brand-dark">{d.name}</p>
                    <p className="text-sm text-brand-primary font-semibold mt-1">{formatNaira(d.price)}</p>
                  </SelectCard>
                ))}
              </div>
            </section>
          )}

          {plan && room && duration && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
              <StepHeader n={4} title="Choose a session" icon={<Clock size={16} className="text-brand-primary" />} />
              <div className="grid sm:grid-cols-3 gap-3">
                {sessions.map((s) => (
                  <SelectCard key={s.id} selected={session?.id === s.id} onClick={() => setSession(s)}>
                    <p className="font-semibold text-brand-dark">{s.name}</p>
                  </SelectCard>
                ))}
              </div>
            </section>
          )}

          {plan && room && duration && session && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
              <StepHeader n={5} title="Choose a date" icon={<CalendarDays size={16} className="text-brand-primary" />} />
              {restrictedDayName && (
                <p className="text-xs text-brand-primary mb-2">Pick a {restrictedDayName} — this plan is only available that day.</p>
              )}
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded-md px-3 py-2"
              />
              {error && date && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
              {availability && (
                <p className="text-sm text-brand-muted mt-3">
                  {availability.session_name} •{" "}
                  {new Date(availability.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {new Date(availability.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {duration.name !== "1 Day" && duration.name !== "Free Access Wednesday" && ` • runs through ${availability.end_date}`}
                </p>
              )}
            </section>
          )}

          {date && availability && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-4">
              <StepHeader n={6} title="Pick your seat" icon={<Armchair size={16} className="text-brand-primary" />} />
              {checkingAvailability && <p className="text-sm text-brand-muted">Checking availability…</p>}
              {!checkingAvailability && (
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {seats.map((s) => {
                    const isAvailable = availability.available_seats.includes(s);
                    const isSelected = seat === s;
                    return (
                      <button
                        key={s}
                        disabled={!isAvailable}
                        onClick={() => setSeat(s)}
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
              <div className="flex gap-4 mt-4 text-xs text-brand-muted">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-primary inline-block" /> Selected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-50 border inline-block" /> Taken</span>
              </div>
            </section>
          )}

          {seat !== null && duration && (
            <section className="bg-white rounded-xl border shadow-sm p-5 mb-8">
              <StepHeader n={7} title="Pay & confirm" icon={<Wallet size={16} className="text-brand-primary" />} />
              <p className="text-sm text-brand-muted mb-4 flex items-center gap-2">
                <Wallet size={14} /> Wallet balance: <strong className="text-brand-dark">{formatNaira(customer.wallet_balance)}</strong>
              </p>

              {insufficientFunds !== null && (
                <div className="mb-4 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-4 py-3">
                  <p className="mb-2">
                    Your wallet is short by <strong>{formatNaira(insufficientFunds)}</strong> for this booking.
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-block bg-brand-primary text-white text-sm font-semibold rounded-full px-4 py-2 hover:bg-brand-primary-dark"
                  >
                    Fund my wallet
                  </a>
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={submitting}
                className="w-full sm:w-auto bg-brand-primary text-white rounded-full px-6 py-3 font-semibold hover:bg-brand-primary-dark disabled:opacity-60"
              >
                {submitting ? "Processing…" : `Book & Pay ${formatNaira(duration.price)}`}
              </button>
            </section>
          )}
        </div>

        {/* Order summary sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 bg-white rounded-xl border shadow-sm p-5">
            <h3 className="font-semibold text-brand-dark mb-4">Your booking</h3>
            <dl className="text-sm space-y-3">
              <div className="flex justify-between">
                <dt className="text-brand-muted">Plan</dt>
                <dd className="font-medium text-right">{plan?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-muted">Workspace</dt>
                <dd className="font-medium text-right">{room?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-muted">Duration</dt>
                <dd className="font-medium text-right">{duration?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-muted">Session</dt>
                <dd className="font-medium text-right">{session?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-muted">Date</dt>
                <dd className="font-medium text-right">{date || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-muted">Seat</dt>
                <dd className="font-medium text-right">{seat ?? "—"}</dd>
              </div>
            </dl>
            <div className="border-t mt-4 pt-4 flex justify-between items-center">
              <span className="text-brand-muted text-sm">Total</span>
              <span className="text-xl font-bold text-brand-dark">
                {duration ? formatNaira(duration.price) : "₦0"}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
