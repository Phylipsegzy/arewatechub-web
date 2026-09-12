"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/booking", label: "Workspace" },
  { href: "/academy/courses", label: "Courses" },
  { href: "/academy/cohort", label: "Cohort Programme" },
  { href: "/future-builders-camp", label: "Future Builders Camp" },
];

export function SiteHeader() {
  const { customer, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b bg-white sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <a href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={32} height={32} priority />
          <span className="font-bold text-base sm:text-lg text-brand-dark">
            Arewa<span className="text-brand-primary">Tec</span>Hub
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-brand-dark">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-brand-primary transition-colors">
              {l.label}
            </a>
          ))}
          {customer ? (
            <>
              <a href="/dashboard" className="hover:text-brand-primary transition-colors">Dashboard</a>
              <button onClick={logout} className="text-brand-muted hover:text-brand-primary transition-colors">
                Log out
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="rounded-full bg-brand-primary text-white px-5 py-2 hover:bg-brand-primary-dark transition-colors"
            >
              Sign In
            </a>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 -mr-2 text-brand-dark"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="md:hidden border-t px-4 py-3 flex flex-col gap-1 text-sm font-medium text-brand-dark bg-white">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="py-2.5 border-b border-gray-100 hover:text-brand-primary"
            >
              {l.label}
            </a>
          ))}
          {customer ? (
            <>
              <a
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="py-2.5 border-b border-gray-100 hover:text-brand-primary"
              >
                Dashboard
              </a>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="py-2.5 text-left text-brand-muted hover:text-brand-primary"
              >
                Log out
              </button>
            </>
          ) : (
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 text-center rounded-full bg-brand-primary text-white px-5 py-2.5 hover:bg-brand-primary-dark"
            >
              Sign In
            </a>
          )}
        </nav>
      )}
    </header>
  );
}
