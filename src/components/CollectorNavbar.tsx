"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { Session } from "@/types";

interface CollectorNavbarProps {
  session: Session;
}

export function CollectorNavbar({ session }: CollectorNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    router.push("/login");
  };

  const navLinks = [
    { label: "Dashboard", href: "/collector", exact: true },
    { label: "Pickups", href: "/collector/pickups", exact: true },
    { label: "History", href: "/collector/history", exact: false },
    { label: "Impact", href: "/collector/impact", exact: false },
  ];

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-teal-950/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Society */}
        <div className="flex items-center gap-3">
          <Link href="/collector" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-900 to-teal-700 text-white shadow-sm shadow-teal-800/20 transition-transform group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
                <path d="M15 18H9" />
                <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="17" cy="18" r="2" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Waste<span className="text-teal-700">Slot</span>
              </span>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                Collector Portal
              </span>
            </div>
          </Link>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {session.society.name}
            </span>
            <span className="text-[10px] text-slate-500">
              {session.user.unitOrFlat || "FastRecycle Partner"}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold">
          {navLinks.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-teal-50 text-teal-800 border border-teal-200/80 shadow-xs"
                    : "text-slate-600 hover:text-teal-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-base">
              {session.user.avatar || "🚚"}
            </div>
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{session.user.name}</span>
              <span className="text-[10px] font-semibold text-teal-800 bg-teal-100/70 px-1.5 py-0.2 rounded self-end">
                Certified Collector
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs transition hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            title="Switch demo user or logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Subnav */}
      <div className="flex md:hidden border-t border-slate-100 bg-slate-50/80 px-2 py-1.5 overflow-x-auto scrollbar-none gap-1">
        {navLinks.map((link) => {
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-white text-teal-800 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
