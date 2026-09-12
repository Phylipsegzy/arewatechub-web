"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Zap, Users, Laptop, Check } from "lucide-react";

interface SlotsInfo {
  total: number;
  taken: number;
  remaining: number;
  full: boolean;
}

export default function FutureBuildersCampPage() {
  const { customer } = useAuth();
  const [slots, setSlots] = useState<SlotsInfo | null>(null);

  useEffect(() => {
    api.get<SlotsInfo>("/teen-program/slots-remaining").then(setSlots).catch(() => {});
  }, []);

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-brand-dark text-white px-4 sm:px-6 py-14 text-center">
        <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-full mb-4">
          <Zap size={14} className="text-brand-primary" />
          {slots ? (slots.full ? "Fully booked" : `Only ${slots.remaining} of ${slots.total} slots left`) : "Pre-booking open"}
        </span>
        <p className="text-brand-primary font-bold tracking-wide text-sm mb-2">GEN ALPHA</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">Future Builders Camp</h1>
        <p className="text-lg text-white/80 mb-1">Ages 12–17 &nbsp;|&nbsp; Create. Build. Lead.</p>
        <p className="max-w-xl mx-auto text-white/70 mt-4">
          A hands-on program helping the next generation build real digital skills — coding, design, and confidence.
        </p>
        <a
          href={customer ? "/dashboard/future-builders-camp" : "/login?next=/dashboard/future-builders-camp"}
          className="inline-block mt-8 bg-brand-primary text-white rounded-full px-8 py-3 font-semibold hover:bg-brand-primary-dark transition-colors"
        >
          {slots?.full ? "Join the Waitlist" : "Register My Child"}
        </a>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-14">
        <h2 className="text-2xl font-bold text-brand-dark text-center mb-2">
          Registration &amp; <span className="text-brand-primary">VIP Upgrade</span>
        </h2>
        <p className="text-center text-brand-muted mb-8">
          A compulsory registration fee secures the slot. VIP is a completely optional upgrade, added any time afterward.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-bold text-brand-dark mb-1">Registration Fee</h3>
            <p className="text-3xl font-extrabold text-brand-dark mb-1">₦15,000</p>
            <p className="text-sm text-brand-muted mb-4">Compulsory for every child — this secures the slot.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check size={16} className="text-brand-primary" /> Full camp curriculum access</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-brand-primary" /> Certificate of completion</li>
              <li className="flex items-center gap-2"><Check size={16} className="text-brand-primary" /> Admission letter &amp; receipt</li>
            </ul>
          </div>

          <div className="bg-brand-dark text-white rounded-2xl p-6 relative overflow-hidden">
            <span className="absolute top-3 right-3 bg-brand-primary text-xs font-bold px-2 py-1 rounded">OPTIONAL</span>
            <h3 className="font-bold mb-1">VIP Upgrade</h3>
            <p className="text-3xl font-extrabold mb-1">+₦250,000</p>
            <p className="text-sm text-white/70 mb-4">Add any time after registering, from your dashboard.</p>
            <div className="flex items-center gap-2 bg-white/10 rounded-md p-3 text-sm">
              <Laptop size={20} className="text-brand-primary shrink-0" />
              An ArewaTecHub-branded laptop, given free with VIP — the single biggest value in this upgrade.
            </div>
          </div>
        </div>

        <p className="flex items-center justify-center gap-2 text-sm text-brand-muted mt-6">
          <Users size={16} /> Only {slots?.total ?? 20} slots available. First registered, first admitted.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-white border-t px-4 sm:px-6 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-brand-dark text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shrink-0">1</span>
              <p>Sign in (or create an account), then register your child with their details and your address.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shrink-0">2</span>
              <p>Fund your wallet if needed, then pay the ₦15,000 registration fee directly from your dashboard.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold shrink-0">3</span>
              <p>Download your admission letter and receipt, print both, and bring them to ArewaTecHub for documentation.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-brand-dark text-white/70 text-xs text-center py-4 px-4">
        No. 4, Mobil Line, Opp. Royal Recreation Center, Adj. BUK New Site, Gwarzo Road, Kano State.
      </footer>
    </main>
  );
}
