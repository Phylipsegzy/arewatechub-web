"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Wifi, ShieldCheck, Globe2, Zap, Eye, EyeOff, GraduationCap, ArrowRight } from "lucide-react";

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium text-brand-dark max-w-[80px]">{label}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <p className="text-sm text-brand-dark">{children}</p>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-white">
        <a href="/" className="flex items-center gap-2">
          <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={32} height={32} />
          <span className="font-bold text-brand-dark">
            Arewa<span className="text-brand-primary">Tec</span>Hub
          </span>
        </a>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-brand-dark">
          <a href="/" className="hover:text-brand-primary">Home</a>
          <a href="/academy/courses" className="hover:text-brand-primary">Courses</a>
          <a href="/booking" className="hover:text-brand-primary">Workspace</a>
        </nav>
        <a href="/register" className="rounded-full bg-brand-primary text-white text-sm font-semibold px-4 py-2">
          Register
        </a>
      </header>

      {/* Hero */}
      <section className="bg-brand-dark text-white px-4 sm:px-6 py-10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              FAST &amp; RELIABLE<br />
              <span className="text-brand-primary">INTERNET</span>
            </h1>
            <p className="text-lg font-semibold mt-1">
              WORK, GROW, <span className="text-green-400">EARN SMARTER.</span>
            </p>
            <p className="text-white/70 text-sm mt-2 mb-6">Stay connected, get more done.</p>
            <div className="grid grid-cols-4 gap-3">
              <FeaturePill icon={<Zap size={20} />} label="High Speed Internet" />
              <FeaturePill icon={<ShieldCheck size={20} />} label="Secure Connection" />
              <FeaturePill icon={<Globe2 size={20} />} label="Connect Anywhere" />
              <FeaturePill icon={<Wifi size={20} />} label="Power Your Possibilities" />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-dark p-6 relative overflow-hidden">
            <span className="inline-block bg-white text-brand-primary text-xs font-bold px-2 py-1 rounded mb-2">
              SEPT 2-IN-1 PROMO
            </span>
            <p className="text-lg font-bold leading-snug">
              Book a month, get a month free!
            </p>
            <p className="text-white/80 text-sm mt-1">Stay connected for longer. Do more.</p>
            <div className="flex gap-4 mt-4 text-xs">
              <span>✓ Study</span><span>✓ Work</span><span>✓ Stream</span><span>✓ Stay Connected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body: cohort banner / login / steps */}
      <section className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_1.2fr_1fr] gap-6 items-start">
          {/* Cohort banner */}
          <div className="rounded-2xl bg-brand-dark text-white p-6 order-2 lg:order-1">
            <GraduationCap className="text-brand-primary mb-3" size={28} />
            <p className="font-bold text-lg mb-1">Digital Academy</p>
            <p className="text-sm text-white/70 mb-4">Cohort enrollment now open — gain in-demand digital skills.</p>
            <a href="/academy/cohort" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
              Register Now <ArrowRight size={14} />
            </a>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-md border p-8 order-1 lg:order-2">
            <h2 className="text-xl font-bold text-brand-dark text-center">Welcome to ArewaTecHub</h2>
            <p className="text-sm text-brand-muted text-center mb-6">Sign in to manage your bookings and courses.</p>

            {error && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium mb-1 text-brand-dark">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />

              <label className="block text-sm font-medium mb-1 text-brand-dark">Password</label>
              <div className="relative mb-2">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-right text-sm mb-5">
                <a href="/forgot-password" className="text-brand-primary font-medium">Forgot password?</a>
              </p>

              <button
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white rounded-full py-3 font-semibold hover:bg-brand-primary-dark disabled:opacity-60"
              >
                <Wifi size={16} />
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-sm text-brand-muted mt-5 text-center">
              No account? <a href="/register" className="text-brand-primary font-medium">Create one</a>
            </p>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 order-3">
            <p className="font-bold text-brand-dark mb-4">Get Started in 3 Simple Steps</p>
            <div className="space-y-4">
              <Step n={1}>Sign in with your ArewaTecHub account.</Step>
              <Step n={2}>Book a workspace or enroll in a course.</Step>
              <Step n={3}>Fund your wallet and you&apos;re set.</Step>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-white/70 text-xs text-center py-4 px-4">
        No. 4, Mobil Line, Opp. Royal Recreation Center, Adj. BUK New Site, Gwarzo Road, Kano State.
        <span className="block mt-1">www.arewatechub.com.ng • …Powering Digital Possibilities</span>
      </footer>
    </main>
  );
}
