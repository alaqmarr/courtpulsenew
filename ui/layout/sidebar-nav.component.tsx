"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Plus,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@courtpulse/auth/logout.action";
import type { NavSidebarData } from "@courtpulse/teams/nav.queries";
import { BrandLogo } from "@courtpulse/ui/primitives/brand-logo.component";

interface SidebarShellProps {
  user: {
    name: string | null;
    displayName: string | null;
    email: string;
  };
  navData: NavSidebarData;
  children: ReactNode;
}

export function SidebarShell({ user, navData, children }: SidebarShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userLabel =
    user.displayName || user.name || user.email.split("@")[0] || "Player";
  const initials = userLabel
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md border-r border-slate-200/80 text-[#0f172a]">
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/70">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center"
        >
          <BrandLogo size="sm" textClassName="font-bold text-sm tracking-tight text-[#0f172a]" />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav className="space-y-1">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
              isActive("/")
                ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Home className="w-4 h-4 text-emerald-600" />
            <span>Overview</span>
          </Link>

          <Link
            href="/create-team"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
              isActive("/create-team")
                ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New team</span>
          </Link>

          <Link
            href="/create-tournament"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
              isActive("/create-tournament")
                ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>New tournament</span>
          </Link>

          <Link
            href="/packages"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
              isActive("/packages")
                ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Plans</span>
          </Link>

          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
              isActive("/profile")
                ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Profile &amp; milestones</span>
          </Link>
        </nav>

        {navData.teams.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Teams
            </div>
            <div className="space-y-0.5">
              {navData.teams.map((team) => {
                const href = `/team/${team.slug}`;
                const active = isActive(href);
                return (
                  <Link
                    key={team.id}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
                      active
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">{team.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {navData.tournaments.length > 0 && (
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Tournaments
            </div>
            <div className="space-y-0.5">
              {navData.tournaments.map((t) => {
                const href = `/tournament/${t.slug}`;
                const active = isActive(href);
                return (
                  <Link
                    key={t.id}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all ${
                      active
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50/70 text-emerald-900 font-semibold border border-emerald-200/70"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                    <span className="truncate">{t.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200/70 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-900 shrink-0">
              {initials || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900 truncate">
                {userLabel}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full text-[#0f172a] flex">
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 shadow-xl">
            {navContent}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden h-14 px-3.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="h-10 w-10 -ml-1.5 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center">
            <BrandLogo size="sm" textClassName="font-bold text-sm text-slate-900" />
          </Link>
          <Link
            href="/profile"
            aria-label="Player profile"
            className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-900 shrink-0"
          >
            {initials || "U"}
          </Link>
        </header>

        <main className="w-full flex-1 px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
