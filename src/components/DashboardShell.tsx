"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, CalendarDays, GraduationCap, Sparkles, History as HistoryIcon, LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/booking", label: "Book Workspace", icon: CalendarDays },
  { href: "/academy/courses", label: "Digital Academy", icon: GraduationCap },
  { href: "/dashboard/future-builders-camp", label: "Future Builders Camp", icon: Sparkles },
  { href: "/history", label: "History", icon: HistoryIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

/**
 * Persistent navigation for every logged-in "app" page — a sidebar on
 * desktop, a bottom tab bar on mobile, same five destinations either way
 * so every core section stays one tap away instead of buried behind a
 * hamburger menu. Wraps page content; public marketing pages keep
 * SiteHeader instead of this.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 bg-brand-dark text-white flex-col sticky top-0 h-screen">
        <a href="/dashboard" className="flex items-center gap-2 px-5 py-5">
          <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={28} height={28} />
          <span className="font-bold">ArewaTecHub</span>
        </a>
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-brand-primary text-white" : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-5 py-4 text-sm text-white/60 hover:text-white border-t border-white/10"
        >
          <LogOut size={16} /> Log out
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 pb-16 md:pb-0">
        {/* Slim mobile top bar */}
        <header className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b sticky top-0 z-20">
          <Image src="/brand/logo-icon.png" alt="ArewaTecHub" width={24} height={24} />
          <span className="font-bold text-brand-dark text-sm">
            Arewa<span className="text-brand-primary">Tec</span>Hub
          </span>
        </header>

        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex items-center justify-around py-1.5 z-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                active ? "text-brand-primary" : "text-brand-muted"
              }`}
            >
              <Icon size={20} />
              {item.label === "Future Builders Camp" ? "Camp" : item.label === "Digital Academy" ? "Academy" : item.label === "Book Workspace" ? "Book" : item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
